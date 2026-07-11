require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io Real-time Local Dashboard Memory Registry
let connectedClients = {};
io.on('connection', (socket) => {
    socket.on('register-resident', (residentId) => {
        connectedClients[residentId.toString()] = socket.id;
    });
    socket.on('disconnect', () => {
        for (let resId in connectedClients) {
            if (connectedClients[resId] === socket.id) delete connectedClients[resId];
        }
    });
});

// =========================================================================
// UNIVERSAL DECYFOGATE TELEPHONY & OUTBOUND DISPATCH ENGINE
// =========================================================================
async function sendDecyfoAlert(recipientPhone, messagePayload) {
    console.log(`📡 [OUTBOUND LOG] Routing to ${recipientPhone}: "${messagePayload}"`);
    if (!process.env.SMS_API_KEY) {
        console.log("⚠️ SMS API Config keys absent. Notification logged in system sandbox.");
        return true;
    }
    try {
        await axios.post('https://api.termii.com/api/sms/send', {
            to: recipientPhone,
            from: "DecyfoGate",
            sms: messagePayload,
            type: "plain",
            api_key: process.env.SMS_API_KEY
        });
        console.log(`✅ Outbound broadcast successfully verified by remote gateway provider.`);
    } catch (smsErr) {
        console.log(`❌ Notification Transmission Failure: ${smsErr.message}`);
    }
}

// ==========================================
// CENTRAL MULTI-TENANT GATEWAY ROUTER
// ==========================================
app.get('/', (req, res) => { res.render('portal'); });

app.post('/auth/login', async (req, res) => {
    const { email, password, sectorType, portalType } = req.body;

    const targetSector = (sectorType || '').trim().toUpperCase();
    const targetPortal = (portalType || '').trim().toUpperCase();

    try {
        if (targetSector === 'SUPERADMIN') {
            const adminRes = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2 AND role = \'SUPERADMIN\' LIMIT 1', [email, password]);
            if (adminRes.rows.length > 0) return res.redirect(`/admin/global/support/${adminRes.rows[0].id}`);
            return res.status(401).send("Unauthorized Technical Profile.");
        }

        const query = "SELECT users.*, institutions.name as inst_name, institutions.sector_type " +
                      "FROM users " +
                      "JOIN institutions ON users.institution_id::text = institutions.id::text " +
                      "WHERE users.email = $1 AND users.password = $2 LIMIT 1";

        const result = await pool.query(query, [email, password]);
        if (result.rows.length === 0) return res.status(401).send("No matching credentials found.");

        const user = result.rows[0];

        if (user.sector_type === 'SCHOOL') {
            if (targetPortal === 'ADMIN' || user.role === 'SCHOOL_ADMIN') {
                return res.redirect(`/admin/school/dashboard/${user.institution_id}`);
            }
            // Class teachers land on their own class, scoped by teacher id — not the whole school
            return res.redirect(`/dashboard/school/class/${user.id}`);
        }

        if (user.sector_type === 'CHURCH') {
            if (targetPortal === 'ADMIN' || user.role === 'CHURCH_ADMIN') {
                return res.redirect(`/admin/church/dashboard/${user.institution_id}`);
            }
            return res.redirect(`/dashboard/church/${user.institution_id}`);
        }

        if (user.sector_type === 'ESTATE') {
            if (user.role === 'GUARD') return res.redirect(`/dashboard/estate/gate/${user.institution_id}`);
            return res.redirect(`/dashboard/estate/resident/${user.id}`);
        }

        return res.status(401).send("No matching routing panel configured for this user scope.");
    } catch (err) { res.status(500).send(err.message); }
});

// =========================================================================
// PILLAR 1: CHURCH SUNDAY SCHOOL MODULE + PARENT ALERTS
// =========================================================================
app.get('/dashboard/church/:instId', async (req, res) => {
    try {
        const inst = await pool.query('SELECT * FROM institutions WHERE id = $1', [req.params.instId]);
        const trackingQuery = "SELECT entities.*, stakeholders.name as parent_name, stakeholders.phone_number, " +
                              "COALESCE(attendance.status, 'NOT_CHECKED') as today_status " +
                              "FROM entities " +
                              "JOIN stakeholders ON entities.stakeholder_id = stakeholders.id " +
                              "LEFT JOIN (SELECT DISTINCT ON (entity_id) entity_id, status FROM church_attendance WHERE date(check_in_time) = CURRENT_DATE ORDER BY entity_id, check_in_time DESC) attendance " +
                              "ON entities.id = attendance.entity_id " +
                              "WHERE entities.institution_id::text = $1";

        const children = await pool.query(trackingQuery, [req.params.instId]);
        res.render('church_dashboard', { institution: inst.rows[0], children: children.rows });
    } catch (err) { res.status(500).send("Database Alignment Error: " + err.message); }
});

app.post('/api/church/check-in', async (req, res) => {
    const { childId, status } = req.body;
    try {
        await pool.query('INSERT INTO church_attendance (entity_id, status) VALUES ($1, $2)', [childId, status]);

        const entityRes = await pool.query(
            "SELECT entities.name as child_name, stakeholders.phone_number, stakeholders.name as parent_name " +
            "FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id WHERE entities.id = $1", [childId]
        );

        if (entityRes.rows.length > 0) {
            const row = entityRes.rows[0];
            const smsMessage = `⛪ DecyfoGate: Hello ${row.parent_name}, your ward (${row.child_name}) has been safely logged as [${status}] in the Children's Church Ministry class ledger.`;
            await sendDecyfoAlert(row.phone_number, smsMessage);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// =========================================================================
// PILLAR 2: RESIDENTIAL ESTATE PASS ISSUANCE + VISITOR ARRIVAL ALERTS
// =========================================================================
app.get('/dashboard/estate/resident/:residentId', async (req, res) => {
    try {
        const resident = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.residentId]);
        const bookings = await pool.query('SELECT * FROM visitor_bookings WHERE resident_id = $1 ORDER BY booked_at DESC', [req.params.residentId]);
        res.render('resident_dashboard', { resident: resident.rows[0], bookings: bookings.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/estate/book-visit', async (req, res) => {
    const { residentId, visitorName, visitorPhone, visitorNin, vehicleReg, guestCount, transportMode } = req.body;
    const passCode = "DG-" + Math.floor(100000 + Math.random() * 900000).toString();
    try {
        const resProfile = await pool.query('SELECT institution_id, name FROM users WHERE id = $1', [residentId]);
        await pool.query(
            'INSERT INTO visitor_bookings (institution_id, resident_id, visitor_name, visitor_phone, visitor_nin, vehicle_reg, guest_count, transport_mode, pass_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [resProfile.rows[0].institution_id, residentId, visitorName, visitorPhone, visitorNin, vehicleReg, parseInt(guestCount), transportMode, passCode]
        );

        const inviteUrl = `http://localhost:3000/visitor/confirm/${passCode}`;
        const guestSms = `🏡 DecyfoGate Access: Hello ${visitorName}, you have an active access invitation from ${resProfile.rows[0].name}. Please review details and tap link to claim your security checkpoint clearance pass ticket: ${inviteUrl}`;
        await sendDecyfoAlert(visitorPhone, guestSms);

        res.redirect(`/dashboard/estate/resident/${residentId}`);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/visitor/confirm/:passCode', async (req, res) => {
    try {
        const booking = await pool.query('SELECT * FROM visitor_bookings WHERE pass_code = $1', [req.params.passCode]);
        if (booking.rows.length === 0) return res.status(404).send("Invitation code lookup failed.");
        res.render('visitor_confirm', { booking: booking.rows[0] });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/visitor/issue-ticket', async (req, res) => {
    const { passCode } = req.body;
    try {
        await pool.query('UPDATE visitor_bookings SET status = \'CONFIRMED\' WHERE pass_code = $1', [passCode]);
        const booking = await pool.query('SELECT * FROM visitor_bookings WHERE pass_code = $1', [passCode]);

        const qrPayload = `DECYFOGATE_VERIFY:${booking.rows[0].pass_code}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

        res.render('visitor_ticket', { booking: booking.rows[0], qrCode: qrCodeDataUrl });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/dashboard/estate/gate/:instId', async (req, res) => {
    try {
        const query = "SELECT visitor_bookings.*, users.name as host_name, users.house_address " +
                      "FROM visitor_bookings " +
                      "JOIN users ON visitor_bookings.resident_id = users.id " +
                      "WHERE visitor_bookings.institution_id::text = $1 AND visitor_bookings.status IN ('CONFIRMED', 'INSIDE')";
        const manifestations = await pool.query(query, [req.params.instId]);
        res.render('gate_dashboard', { instId: req.params.instId, records: manifestations.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/gate/action', async (req, res) => {
    const { recordId, actionType } = req.body;
    const statusFlag = actionType === 'CHECK_IN' ? 'INSIDE' : 'EXITED';
    const timeColumn = actionType === 'CHECK_IN' ? 'checked_in_at' : 'checked_out_at';

    try {
        const updateRes = await pool.query(
            `UPDATE visitor_bookings SET status = $1, ${timeColumn} = CURRENT_TIMESTAMP WHERE id = $2 RETURNING resident_id, visitor_name`,
            [statusFlag, recordId]
        );

        if (updateRes.rows.length > 0) {
            const targetResidentId = updateRes.rows[0].resident_id;
            const guest = updateRes.rows[0].visitor_name;

            const hostRes = await pool.query("SELECT name, phone_number FROM users WHERE id = $1", [targetResidentId]);
            if (hostRes.rows.length > 0) {
                const host = hostRes.rows[0];
                const actionLabel = actionType === 'CHECK_IN' ? 'ARRIVED & PASSED THROUGH' : 'EXITED THE PREMISES VIA';

                const residentSms = `🚨 DecyfoGate Safety Unit: Alert! Your scheduled guest (${guest}) has officially ${actionLabel} the Gatehouse Main Security Checkpoint.`;
                await sendDecyfoAlert(host.phone_number, residentSms);

                const targetSocketId = connectedClients[targetResidentId.toString()];
                if (targetSocketId) {
                    io.to(targetSocketId).emit('visitor-status-alert', { message: residentSms });
                }
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// =========================================================================
// PILLAR 3: ACADEMY — CLASS TEACHER VIEW (SCOPED TO ONE CLASS)
// =========================================================================
app.get('/api/school/admin/overview/:instId', async (req, res) => {
    try {
        const inst = await pool.query('SELECT * FROM institutions WHERE id = $1', [req.params.instId]);
        const classes = await pool.query(`
            SELECT classes.*, users.name as teacher_name,
                   (SELECT COUNT(*) FROM entities WHERE entities.class_id = classes.id) as student_count
            FROM classes LEFT JOIN users ON classes.teacher_id = users.id
            WHERE classes.institution_id::text = $1 ORDER BY classes.name`, [req.params.instId]);

        const teachers = await pool.query("SELECT * FROM users WHERE institution_id::text = $1 AND role IN ('SCHOOL_ADMIN', 'TEACHER')", [req.params.instId]);

        const attendance = await pool.query(`
            SELECT status, COUNT(*)::int as count
            FROM school_attendance
            WHERE entity_id IN (SELECT id FROM entities WHERE institution_id::text = $1)
            GROUP BY status`, [req.params.instId]);

        const studentCount = await pool.query('SELECT COUNT(*)::int as total FROM entities WHERE institution_id::text = $1', [req.params.instId]);
        const presentCount = attendance.rows.find((row) => row.status === 'PRESENT')?.count || 0;
        const lateCount = attendance.rows.find((row) => row.status === 'LATE')?.count || 0;
        const absentCount = attendance.rows.find((row) => row.status === 'ABSENT')?.count || 0;

        res.json({
            institution: inst.rows[0],
            classes: classes.rows,
            teachers: teachers.rows,
            stats: {
                studentCount: studentCount.rows[0].total,
                presentCount,
                lateCount,
                absentCount,
                attendanceRate: studentCount.rows[0].total > 0 ? Math.round(((presentCount + lateCount) / studentCount.rows[0].total) * 100) : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/school/teacher/roster/:teacherId', async (req, res) => {
    try {
        const teacherRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.teacherId]);
        const classRes = await pool.query('SELECT * FROM classes WHERE teacher_id = $1 LIMIT 1', [req.params.teacherId]);

        if (classRes.rows.length === 0) {
            return res.json({ teacher: teacherRes.rows[0], classInfo: null, students: [] });
        }

        const cls = classRes.rows[0];
        const roster = await pool.query(`
            SELECT entities.*, stakeholders.name as parent_name, stakeholders.phone_number,
                   (SELECT status FROM school_attendance WHERE entity_id = entities.id AND date(marked_at) = CURRENT_DATE ORDER BY marked_at DESC LIMIT 1) as today_status
            FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id
            WHERE entities.class_id = $1 ORDER BY entities.name`, [cls.id]);

        res.json({ teacher: teacherRes.rows[0], classInfo: cls, students: roster.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/dashboard/school/class/:teacherId', async (req, res) => {
    try {
        const teacherRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.teacherId]);
        const classRes = await pool.query('SELECT * FROM classes WHERE teacher_id = $1 LIMIT 1', [req.params.teacherId]);

        if (classRes.rows.length === 0) {
            return res.render('teacher_dashboard', { teacher: teacherRes.rows[0], classInfo: null, students: [] });
        }

        const cls = classRes.rows[0];
        const roster = await pool.query(`
            SELECT entities.*, stakeholders.name as parent_name, stakeholders.phone_number,
                   (SELECT status FROM school_attendance WHERE entity_id = entities.id AND date(marked_at) = CURRENT_DATE ORDER BY marked_at DESC LIMIT 1) as today_status
            FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id
            WHERE entities.class_id = $1 ORDER BY entities.name`, [cls.id]);

        res.render('teacher_dashboard', { teacher: teacherRes.rows[0], classInfo: cls, students: roster.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/school/attendance', async (req, res) => {
    const { studentId, status } = req.body;
    try {
        await pool.query('INSERT INTO school_attendance (entity_id, status) VALUES ($1, $2)', [studentId, status]);

        const studentInfo = await pool.query(
            "SELECT entities.name as student_name, stakeholders.name as guardian_name, stakeholders.phone_number " +
            "FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id WHERE entities.id = $1", [studentId]
        );

        if (studentInfo.rows.length > 0) {
            const target = studentInfo.rows[0];
            const schoolAlertMessage = `🏫 DecyfoGate Attendance: Dear ${target.guardian_name}, your child (${target.student_name}) has been marked [${status.toUpperCase()}] during morning roll call.`;
            await sendDecyfoAlert(target.phone_number, schoolAlertMessage);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// =========================================================================
// PILLAR 3: ACADEMY — SCHOOL ADMIN VIEW (ALL CLASSES)
// =========================================================================
app.get('/admin/school/dashboard/:instId', async (req, res) => {
    try {
        const inst = await pool.query('SELECT * FROM institutions WHERE id = $1', [req.params.instId]);

        const classes = await pool.query(`
            SELECT classes.*, users.name as teacher_name,
                   (SELECT COUNT(*) FROM entities WHERE entities.class_id = classes.id) as student_count
            FROM classes LEFT JOIN users ON classes.teacher_id = users.id
            WHERE classes.institution_id::text = $1 ORDER BY classes.name`, [req.params.instId]);

        const teachers = await pool.query("SELECT * FROM users WHERE institution_id::text = $1 AND role = 'TEACHER'", [req.params.instId]);

        res.render('school_system_admin', { institution: inst.rows[0], classes: classes.rows, teachers: teachers.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/admin/school/class/:classId', async (req, res) => {
    try {
        const cls = await pool.query(
            "SELECT classes.*, users.name as teacher_name FROM classes LEFT JOIN users ON classes.teacher_id = users.id WHERE classes.id = $1",
            [req.params.classId]
        );
        const roster = await pool.query(`
            SELECT entities.*, stakeholders.name as parent_name, stakeholders.phone_number,
                   (SELECT status FROM school_attendance WHERE entity_id = entities.id AND date(marked_at) = CURRENT_DATE ORDER BY marked_at DESC LIMIT 1) as today_status
            FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id
            WHERE entities.class_id = $1 ORDER BY entities.name`, [req.params.classId]);

        res.render('admin_class_detail', { classInfo: cls.rows[0], students: roster.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/school/create-class', async (req, res) => {
    const { instId, className } = req.body;
    try {
        await pool.query('INSERT INTO classes (institution_id, name) VALUES ($1, $2)', [instId, className]);
        res.redirect(`/admin/school/dashboard/${instId}`);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/school/assign-teacher', async (req, res) => {
    const { instId, classId, teacherId } = req.body;
    try {
        await pool.query('UPDATE classes SET teacher_id = $1 WHERE id = $2', [teacherId || null, classId]);
        res.redirect(`/admin/school/dashboard/${instId}`);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/school/broadcast', async (req, res) => {
    const { instId, classId, message } = req.body;
    try {
        const targets = classId === 'ALL'
            ? await pool.query(
                "SELECT DISTINCT stakeholders.phone_number, stakeholders.name FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id WHERE entities.institution_id::text = $1",
                [instId])
            : await pool.query(
                "SELECT DISTINCT stakeholders.phone_number, stakeholders.name FROM entities JOIN stakeholders ON entities.stakeholder_id = stakeholders.id WHERE entities.class_id = $1",
                [classId]);

        for (const t of targets.rows) {
            await sendDecyfoAlert(t.phone_number, `🏫 DecyfoGate: Dear ${t.name}, ${message}`);
        }
        res.redirect(`/admin/school/dashboard/${instId}`);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/school/add-teacher', async (req, res) => {
    const { instId, name, email, password, phone } = req.body;
    try {
        await pool.query(
            "INSERT INTO users (institution_id, email, password, role, name, phone_number, house_address) " +
            "VALUES ($1, $2, $3, 'TEACHER', $4, $5, 'School Campus')",
            [instId, email, password, name, phone]
        );
        res.redirect(`/admin/school/dashboard/${instId}`);
    } catch (err) { res.status(500).send("Admin Error onboarding teacher: " + err.message); }
});

app.post('/api/admin/school/upload-student', async (req, res) => {
    const { instId, classId, studentName, parentName, parentPhone } = req.body;
    try {
        const stakeholderRes = await pool.query(
            "INSERT INTO stakeholders (name, phone_number) VALUES ($1, $2) RETURNING id",
            [parentName, parentPhone]
        );
        await pool.query(
            "INSERT INTO entities (institution_id, stakeholder_id, name, class_id) VALUES ($1, $2, $3, $4)",
            [instId, stakeholderRes.rows[0].id, studentName, classId]
        );
        res.redirect(`/admin/school/dashboard/${instId}`);
    } catch (err) { res.status(500).send("Admin Error onboarding student: " + err.message); }
});

// =========================================================================
// PILLAR 1 (ADMIN): CHURCH ADMINISTRATION
// =========================================================================
app.get('/admin/church/dashboard/:instId', async (req, res) => {
    try {
        const inst = await pool.query('SELECT * FROM institutions WHERE id = $1', [req.params.instId]);
        const teachers = await pool.query("SELECT * FROM users WHERE institution_id::text = $1 AND role IN ('SUNDAY_TEACHER', 'CHURCH_ADMIN')", [req.params.instId]);
        const children = await pool.query("SELECT entities.*, stakeholders.name as parent_name, stakeholders.phone_number FROM entities LEFT JOIN stakeholders ON entities.stakeholder_id = stakeholders.id WHERE entities.institution_id::text = $1", [req.params.instId]);
        res.render('church_system_admin', { institution: inst.rows[0], teachers: teachers.rows, children: children.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/church/add-teacher', async (req, res) => {
    const { instId, name, email, password, phone } = req.body;
    try {
        await pool.query(
            "INSERT INTO users (institution_id, email, password, role, name, phone_number, house_address) " +
            "VALUES ($1, $2, $3, 'SUNDAY_TEACHER', $4, $5, 'Children Ministry')",
            [instId, email, password, name, phone]
        );
        res.redirect(`/admin/church/dashboard/${instId}`);
    } catch (err) { res.status(500).send("Admin Error onboarding minister: " + err.message); }
});

app.post('/api/admin/church/register-child', async (req, res) => {
    const { instId, childName, parentName, parentPhone } = req.body;
    try {
        const stakeholderRes = await pool.query(
            "INSERT INTO stakeholders (name, phone_number) VALUES ($1, $2) RETURNING id",
            [parentName, parentPhone]
        );
        const stakeholderId = stakeholderRes.rows[0].id;

        await pool.query(
            "INSERT INTO entities (institution_id, stakeholder_id, name) VALUES ($1, $2, $3)",
            [instId, stakeholderId, childName]
        );
        res.redirect(`/admin/church/dashboard/${instId}`);
    } catch (err) { res.status(500).send("Admin Error registering child: " + err.message); }
});

// =========================================================================
// TECHNICAL AUTO-SCHEMA GENERATION & RUNTIME SEEDER
// =========================================================================
async function seedRoyalKingdomDemo() {
    const primarySchoolId = 20;
    const collegeId = 21;

    await pool.query(`
        INSERT INTO institutions (id, name, type, sector_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, sector_type = EXCLUDED.sector_type
    `, [primarySchoolId, 'Royal Kingdom Nursery and Primary School', 'SCHOOL', 'SCHOOL']);

    await pool.query(`
        INSERT INTO institutions (id, name, type, sector_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, sector_type = EXCLUDED.sector_type
    `, [collegeId, 'Royal Kingdom College', 'SCHOOL', 'SCHOOL']);

    await pool.query(`
        INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id, password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name, phone_number = EXCLUDED.phone_number, house_address = EXCLUDED.house_address
    `, [100, primarySchoolId, 'admin@royalkingdom.edu', 'royal123', 'SCHOOL_ADMIN', 'Mrs. Oladipo', '+2348030001111', 'Royal Kingdom Campus']);

    await pool.query(`
        INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id, password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name, phone_number = EXCLUDED.phone_number, house_address = EXCLUDED.house_address
    `, [101, primarySchoolId, 'formteacher@royalkingdom.edu', 'royal123', 'TEACHER', 'Mrs. Adebayo', '+2348030002222', 'Royal Kingdom Campus']);

    await pool.query(`
        INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET institution_id = EXCLUDED.institution_id, password = EXCLUDED.password, role = EXCLUDED.role, name = EXCLUDED.name, phone_number = EXCLUDED.phone_number, house_address = EXCLUDED.house_address
    `, [102, collegeId, 'subjectteacher@royalkingdom.edu', 'royal123', 'TEACHER', 'Mr. Balogun', '+2348030003333', 'Royal Kingdom College']);

    await pool.query(`
        INSERT INTO classes (id, institution_id, name, teacher_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, name = EXCLUDED.name, teacher_id = EXCLUDED.teacher_id
    `, [200, primarySchoolId, 'Primary 5A', 101]);

    await pool.query(`
        INSERT INTO classes (id, institution_id, name, teacher_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, name = EXCLUDED.name, teacher_id = EXCLUDED.teacher_id
    `, [201, collegeId, 'JSS 2A', 102]);

    const studentSeedData = [
        { classId: 200, name: 'Tobi Akinola', guardian: 'Mrs. Akinola', phone: '+2348121111111' },
        { classId: 200, name: 'Ada Okafor', guardian: 'Mr. Okafor', phone: '+2348121111112' },
        { classId: 200, name: 'Kemi Yusuf', guardian: 'Mrs. Yusuf', phone: '+2348121111113' },
        { classId: 200, name: 'Sulaimon Hassan', guardian: 'Mr. Hassan', phone: '+2348121111114' },
        { classId: 200, name: 'Nneka Eze', guardian: 'Mrs. Eze', phone: '+2348121111115' },
        { classId: 200, name: 'Emeka Nwosu', guardian: 'Mr. Nwosu', phone: '+2348121111116' },
        { classId: 200, name: 'Rukayat Bello', guardian: 'Mrs. Bello', phone: '+2348121111117' },
        { classId: 200, name: 'Bolu Ade', guardian: 'Mr. Ade', phone: '+2348121111118' },
        { classId: 201, name: 'Ifeanyi Chukwu', guardian: 'Mrs. Chukwu', phone: '+2348132222111' },
        { classId: 201, name: 'Amara Ibrahim', guardian: 'Mr. Ibrahim', phone: '+2348132222112' },
        { classId: 201, name: 'Dayo Folarin', guardian: 'Mrs. Folarin', phone: '+2348132222113' },
        { classId: 201, name: 'Zainab Musa', guardian: 'Mr. Musa', phone: '+2348132222114' },
        { classId: 201, name: 'Chinedu Okafor', guardian: 'Mrs. Okafor', phone: '+2348132222115' },
        { classId: 201, name: 'Remi Ajayi', guardian: 'Mr. Ajayi', phone: '+2348132222116' },
        { classId: 201, name: 'Binta Sule', guardian: 'Mrs. Sule', phone: '+2348132222117' },
        { classId: 201, name: 'Segun Awo', guardian: 'Mr. Awo', phone: '+2348132222118' }
    ];

    for (const [index, student] of studentSeedData.entries()) {
        const institutionId = student.classId === 200 ? primarySchoolId : collegeId;
        const stakeholderId = 5000 + index;
        await pool.query(
            `INSERT INTO stakeholders (id, name, phone_number)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone_number = EXCLUDED.phone_number`,
            [stakeholderId, student.guardian, student.phone]
        );

        const entityId = 6000 + index;
        await pool.query(
            `INSERT INTO entities (id, institution_id, stakeholder_id, name, class_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, stakeholder_id = EXCLUDED.stakeholder_id, name = EXCLUDED.name, class_id = EXCLUDED.class_id`,
            [entityId, institutionId, stakeholderId, student.name, student.classId]
        );

        const existingAttendance = await pool.query('SELECT id FROM school_attendance WHERE entity_id = $1 LIMIT 1', [entityId]);
        if (!existingAttendance.rows[0]) {
            const statuses = ['PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'PRESENT'];
            for (let day = 0; day < statuses.length; day += 1) {
                const attendanceId = 7000 + index * 100 + day;
                const markedAt = new Date(Date.now() - (day + 1) * 86400000);
                await pool.query(
                    `INSERT INTO school_attendance (id, entity_id, status, marked_at)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (id) DO NOTHING`,
                    [attendanceId, entityId, statuses[day], markedAt]
                );
            }
        }
    }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, async () => {
    console.log(`🚀 DecyfoGate Core Online & Verified on Port ${PORT}`);
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS institutions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50),
                sector_type VARCHAR(50) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                institution_id INT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                name VARCHAR(255),
                phone_number VARCHAR(50),
                house_address TEXT
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stakeholders (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone_number VARCHAR(50) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS entities (
                id SERIAL PRIMARY KEY,
                institution_id INT NOT NULL,
                stakeholder_id INT NOT NULL,
                name VARCHAR(255) NOT NULL
            );
        `);
        await pool.query(`ALTER TABLE entities ADD COLUMN IF NOT EXISTS class_id INT`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id SERIAL PRIMARY KEY,
                institution_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                teacher_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS school_attendance (
                id SERIAL PRIMARY KEY,
                entity_id INT NOT NULL,
                status VARCHAR(20) NOT NULL,
                marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS visitor_bookings (
                id SERIAL PRIMARY KEY,
                institution_id INT NOT NULL,
                resident_id INT NOT NULL,
                visitor_name VARCHAR(255) NOT NULL,
                visitor_phone VARCHAR(50) NOT NULL,
                visitor_nin VARCHAR(100),
                vehicle_reg VARCHAR(50),
                guest_count INT DEFAULT 1,
                transport_mode VARCHAR(50),
                pass_code VARCHAR(30) UNIQUE NOT NULL,
                status VARCHAR(30) DEFAULT 'PENDING',
                booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                checked_in_at TIMESTAMP,
                checked_out_at TIMESTAMP
            );
        `);

        await pool.query('CREATE TABLE IF NOT EXISTS church_attendance (id SERIAL PRIMARY KEY, entity_id INT NOT NULL, status VARCHAR(30) NOT NULL, check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

        // Base Infrastructure Tenants Seeding
        await pool.query("INSERT INTO institutions (id, name, type, sector_type) VALUES (1, 'Decyfo Luxury Estate', 'ESTATE', 'ESTATE') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO institutions (id, name, type, sector_type) VALUES (2, 'Decyfo Academy High', 'SCHOOL', 'SCHOOL') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO institutions (id, name, type, sector_type) VALUES (3, 'City of David Church', 'CHURCH', 'CHURCH') ON CONFLICT (id) DO NOTHING");

        // Operational Master Accounts Seeding
        await pool.query("INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address) VALUES (1, 1, 'adesola@decyfo.com', 'password123', 'RESIDENT', 'Adesola Akindeji', '+2347014819914', 'House 4B, Diamond Avenue') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address) VALUES (2, 1, 'guard@decyfo.com', 'guard123', 'GUARD', 'Gatehouse Unit', '+2348000000000', 'Gate') ON CONFLICT (id) DO NOTHING");

        // School Admin (whole-school scope)
        await pool.query("INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address) VALUES (3, 2, 'teacher@decyfo.com', 'school123', 'SCHOOL_ADMIN', 'Principal Adesola', '+2347014819914', 'School') ON CONFLICT (id) DO UPDATE SET role = 'SCHOOL_ADMIN', email = 'teacher@decyfo.com', password = 'school123'");

        // Church Admin (whole-church scope)
        await pool.query("INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address) VALUES (4, 3, 'pastor@decyfo.com', 'church123', 'CHURCH_ADMIN', 'Pastor Adesola', '+2347014819914', 'Children Ministry') ON CONFLICT (id) DO UPDATE SET role = 'CHURCH_ADMIN', email = 'pastor@decyfo.com', password = 'church123'");

        // Class Teacher (class-scoped only — separate account from School Admin)
        await pool.query("INSERT INTO users (id, institution_id, email, password, role, name, phone_number, house_address) VALUES (5, 2, 'teacher2@decyfo.com', 'class123', 'TEACHER', 'Mrs. Bello', '+2348011122233', 'School') ON CONFLICT (id) DO UPDATE SET role = 'TEACHER', email = 'teacher2@decyfo.com', password = 'class123'");

        // A class, assigned to that teacher
        await pool.query("INSERT INTO classes (id, institution_id, name, teacher_id) VALUES (1, 2, 'JSS 1', 5) ON CONFLICT (id) DO UPDATE SET teacher_id = 5");

        // Mock Records Seeding — Church
        await pool.query("INSERT INTO stakeholders (id, name, phone_number) VALUES (15, 'Brother Kolade', '+2348122222222') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO entities (id, institution_id, stakeholder_id, name) VALUES (10, 3, 15, 'Seyi Kolade') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO entities (id, institution_id, stakeholder_id, name) VALUES (11, 3, 15, 'Femi Kolade') ON CONFLICT (id) DO NOTHING");

        // Mock Records Seeding — School, linked to JSS 1
        await pool.query("INSERT INTO stakeholders (id, name, phone_number) VALUES (20, 'Mr. Balogun', '+2348133344455') ON CONFLICT (id) DO NOTHING");
        await pool.query("INSERT INTO entities (id, institution_id, stakeholder_id, name, class_id) VALUES (20, 2, 20, 'Tolu Balogun', 1) ON CONFLICT (id) DO UPDATE SET class_id = 1");
        await pool.query("INSERT INTO entities (id, institution_id, stakeholder_id, name, class_id) VALUES (21, 2, 20, 'Tomi Balogun', 1) ON CONFLICT (id) DO UPDATE SET class_id = 1");

        await seedRoyalKingdomDemo();
        console.log("✅ All database structures and core credentials verified.");
    } catch (e) { console.log("DB Boot Seed Exception: ", e.message); }
});