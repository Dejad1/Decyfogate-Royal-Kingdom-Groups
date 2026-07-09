import "dotenv/config";
import { PrismaClient, Role, SchoolType, Gender, AttendanceStatus, AttendanceEntryType, NotificationChannel, NotificationTrigger } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { makeRng, intBetween, Rng } from "./seed-data/rng";
import { generatePerson, generatePhone, pickGuardianRelationship, slugifyForEmail } from "./seed-data/names";
import {
  NURSERY_PRIMARY_LEVELS,
  SECONDARY_LEVELS,
  LevelDef,
  allCollegeSubjectNames,
  SUBJECT_DEPARTMENT,
  SUBJECT_TEACHER_BUNDLES,
  subjectsForUnit,
} from "./seed-data/curriculum";
import { buildAttendanceMessage } from "../src/lib/messages";

const prisma = new PrismaClient();
const rng: Rng = makeRng(20260708);

// Same password for every seeded demo account -- acceptable only because
// this is simulated sales-demo data, never a real tenant. Called out again
// in the phase-boundary summary.
const DEMO_PASSWORD = "Decyfogate@2026";

const SCHOOL_DAYS_BACK = 20; // ~4 school weeks of daily-register history
const NOTIFICATION_BACKFILL_DAYS = 3; // keep the "sent" panel realistic without exploding row counts
const SUBJECT_ATTENDANCE_BACKFILL_DAYS = 5;

const AGE_RANGE_BY_LEVEL: Record<string, [number, number]> = {
  "Nursery 1": [2, 3],
  "Nursery 2": [3, 4],
  "Nursery 3": [4, 5],
  "Reception 1": [5, 5],
  "Reception 2": [5, 6],
  "Primary 1": [6, 7],
  "Primary 2": [7, 8],
  "Primary 3": [8, 9],
  "Primary 4": [9, 10],
  "Primary 5": [10, 11],
  "Primary 6": [11, 12],
  "JSS 1": [10, 11],
  "JSS 2": [11, 12],
  "JSS 3": [12, 13],
  "SS 1": [13, 14],
  "SS 2": [14, 15],
  "SS 3": [15, 16],
};

interface SeededUnit {
  id: string;
  levelName: string;
  levelOrder: number;
  unitName: string;
  schoolId: string;
  requiredSubjects: string[]; // empty for nursery/primary
}

let emailCounter = 0;
function uniqueEmail(fullName: string, domain: string) {
  emailCounter += 1;
  return `${slugifyForEmail(fullName, emailCounter)}@${domain}`.toLowerCase();
}

async function wipe() {
  await prisma.$transaction([
    prisma.notificationLog.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.classSubjectTeacher.deleteMany(),
    prisma.studentGuardian.deleteMany(),
    prisma.student.deleteMany(),
    prisma.classUnit.deleteMany(),
    prisma.classLevel.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.term.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.user.deleteMany(),
    prisma.school.deleteMany(),
    prisma.group.deleteMany(),
    prisma.guardian.deleteMany(),
  ]);
}

async function createUser(params: {
  fullName: string;
  domain: string;
  phone: string;
  role: Role;
  passwordHash: string;
  schoolId?: string;
  groupId?: string;
}) {
  return prisma.user.create({
    data: {
      fullName: params.fullName,
      email: uniqueEmail(params.fullName, params.domain),
      phone: params.phone,
      passwordHash: params.passwordHash,
      role: params.role,
      schoolId: params.schoolId ?? null,
      groupId: params.groupId ?? null,
    },
  });
}

async function createTerms(schoolId: string) {
  // Today (seed run date) falls in Third Term of the Nigerian academic
  // calendar (Sept-Dec / Jan-Apr / Apr-July); mark that one current.
  await prisma.term.createMany({
    data: [
      { schoolId, name: "First Term 2025/2026", startDate: new Date("2025-09-08"), endDate: new Date("2025-12-12"), isCurrent: false },
      { schoolId, name: "Second Term 2025/2026", startDate: new Date("2026-01-12"), endDate: new Date("2026-04-03"), isCurrent: false },
      { schoolId, name: "Third Term 2025/2026", startDate: new Date("2026-04-20"), endDate: new Date("2026-07-24"), isCurrent: true },
    ],
  });
}

function dateOfBirthForLevel(levelName: string): Date {
  const [minAge, maxAge] = AGE_RANGE_BY_LEVEL[levelName] ?? [10, 11];
  const age = intBetween(rng, minAge, maxAge);
  const today = new Date();
  const dob = new Date(today);
  dob.setFullYear(today.getFullYear() - age);
  dob.setDate(dob.getDate() - intBetween(rng, 0, 364));
  return dob;
}

async function buildLevelsAndUnits(
  schoolId: string,
  levels: LevelDef[],
  passwordHash: string,
  domain: string,
  withSubjects: boolean
): Promise<SeededUnit[]> {
  const seededUnits: SeededUnit[] = [];

  for (const level of levels) {
    const classLevel = await prisma.classLevel.create({
      data: { schoolId, name: level.name, order: level.order },
    });

    for (const unitName of level.units) {
      const classUnit = await prisma.classUnit.create({
        data: { classLevelId: classLevel.id, name: unitName },
      });

      const teacherPerson = generatePerson(rng);
      const formTeacher = await createUser({
        fullName: teacherPerson.fullName,
        domain,
        phone: generatePhone(rng),
        role: Role.FORM_TEACHER,
        passwordHash,
        schoolId,
      });

      await prisma.classUnit.update({
        where: { id: classUnit.id },
        data: { formTeacherId: formTeacher.id },
      });

      seededUnits.push({
        id: classUnit.id,
        levelName: level.name,
        levelOrder: level.order,
        unitName,
        schoolId,
        requiredSubjects: withSubjects ? subjectsForUnit(level, unitName) : [],
      });
    }
  }

  return seededUnits;
}

async function createSubjects(schoolId: string) {
  const names = allCollegeSubjectNames();
  const bySchoolSubjects = await Promise.all(
    names.map((name) =>
      prisma.subject.create({
        data: { schoolId, name, department: SUBJECT_DEPARTMENT[name] ?? null },
      })
    )
  );
  const map = new Map<string, string>(); // name -> subjectId
  bySchoolSubjects.forEach((s) => map.set(s.name, s.id));
  return map;
}

async function createSubjectTeachersAndLinks(
  schoolId: string,
  units: SeededUnit[],
  subjectIdByName: Map<string, string>,
  passwordHash: string,
  domain: string
) {
  // classUnitId:subjectId -> teacherId, so subject-attendance backfill
  // later knows which teacher "marked" each record.
  const teacherByUnitSubject = new Map<string, string>();

  for (const bundle of SUBJECT_TEACHER_BUNDLES) {
    const person = generatePerson(rng);
    const teacher = await createUser({
      fullName: person.fullName,
      domain,
      phone: generatePhone(rng),
      role: Role.SUBJECT_TEACHER,
      passwordHash,
      schoolId,
    });

    for (const subjectName of bundle) {
      const subjectId = subjectIdByName.get(subjectName);
      if (!subjectId) continue;

      const unitsNeedingSubject = units.filter((u) => u.requiredSubjects.includes(subjectName));
      for (const unit of unitsNeedingSubject) {
        await prisma.classSubjectTeacher.create({
          data: { classUnitId: unit.id, subjectId, teacherId: teacher.id },
        });
        teacherByUnitSubject.set(`${unit.id}:${subjectId}`, teacher.id);
      }
    }
  }

  return teacherByUnitSubject;
}

interface SeededStudent {
  id: string;
  fullName: string;
  gender: Gender;
  classUnitId: string;
  schoolId: string;
  levelName: string;
}

async function enrollStudents(unit: SeededUnit, admissionPrefix: string, admissionCounter: { n: number }): Promise<SeededStudent[]> {
  const count = intBetween(rng, 8, 25);
  const students: SeededStudent[] = [];

  for (let i = 0; i < count; i++) {
    const person = generatePerson(rng);
    admissionCounter.n += 1;
    const admissionNumber = `${admissionPrefix}/26/${String(admissionCounter.n).padStart(4, "0")}`;

    const student = await prisma.student.create({
      data: {
        schoolId: unit.schoolId,
        classUnitId: unit.id,
        fullName: person.fullName,
        admissionNumber,
        dateOfBirth: dateOfBirthForLevel(unit.levelName),
        gender: person.gender === "MALE" ? Gender.MALE : Gender.FEMALE,
      },
    });

    const surname = person.fullName.split(" ").slice(1).join(" ");
    const numGuardians = rng() < 0.6 ? 1 : 2;

    for (let g = 0; g < numGuardians; g++) {
      const isPrimary = g === 0;
      const relationship = pickGuardianRelationship(rng, isPrimary);
      const guardianGenderHint: "MALE" | "FEMALE" =
        relationship === "Mother" || relationship === "Aunt" || relationship === "Grandmother"
          ? "FEMALE"
          : relationship === "Father" || relationship === "Uncle" || relationship === "Grandfather"
          ? "MALE"
          : rng() < 0.5
          ? "MALE"
          : "FEMALE";
      const guardianPerson = generatePerson(rng, guardianGenderHint);
      const guardianFullName = `${guardianPerson.fullName.split(" ")[0]} ${surname}`;

      const guardian = await prisma.guardian.create({
        data: { fullName: guardianFullName, phone: generatePhone(rng) },
      });

      await prisma.studentGuardian.create({
        data: { studentId: student.id, guardianId: guardian.id, relationship, isPrimary },
      });
    }

    students.push({
      id: student.id,
      fullName: student.fullName,
      gender: student.gender,
      classUnitId: unit.id,
      schoolId: unit.schoolId,
      levelName: unit.levelName,
    });
  }

  return students;
}

function schoolDaysBack(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - 1); // backfill strictly before "today" so today is left open for the live demo

  while (days.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days.reverse();
}

function rollStatus(rng: Rng, presentRate: number, lateRate: number): AttendanceStatus {
  const r = rng();
  if (r < presentRate) return AttendanceStatus.PRESENT;
  if (r < presentRate + lateRate) return AttendanceStatus.LATE;
  return AttendanceStatus.ABSENT;
}

async function backfillAttendanceForSchool(
  units: SeededUnit[],
  studentsByUnit: Map<string, SeededStudent[]>,
  formTeacherByUnit: Map<string, string>,
  teacherByUnitSubject: Map<string, string>,
  subjectIdByName: Map<string, string>,
  schoolNameById: Map<string, string>
) {
  const studentNameById = new Map<string, string>();
  const schoolIdByUnit = new Map<string, string>();
  for (const unit of units) {
    schoolIdByUnit.set(unit.id, unit.schoolId);
    for (const student of studentsByUnit.get(unit.id) ?? []) {
      studentNameById.set(student.id, student.fullName);
    }
  }

  const days = schoolDaysBack(SCHOOL_DAYS_BACK);
  const recentDays = new Set(days.slice(-NOTIFICATION_BACKFILL_DAYS).map((d) => d.getTime()));
  const subjectDays = days.slice(-SUBJECT_ATTENDANCE_BACKFILL_DAYS);

  // Designate 1-2 "at risk" students per unit so the low-attendance flag
  // (>=3 absences trailing 7 days) always has real hits to demonstrate,
  // instead of relying on chance.
  const atRiskStudentIds = new Set<string>();
  for (const unit of units) {
    const roster = studentsByUnit.get(unit.id) ?? [];
    const atRiskCount = Math.min(roster.length, intBetween(rng, 1, 2));
    for (let i = 0; i < atRiskCount; i++) {
      atRiskStudentIds.add(roster[intBetween(rng, 0, roster.length - 1)].id);
    }
  }

  const last7 = new Set(days.slice(-7).map((d) => d.getTime()));

  for (const day of days) {
    const dailyRecords: { id: string; studentId: string; classUnitId: string; status: AttendanceStatus; markedByUserId: string }[] = [];

    for (const unit of units) {
      const formTeacherId = formTeacherByUnit.get(unit.id);
      if (!formTeacherId) continue;
      const roster = studentsByUnit.get(unit.id) ?? [];

      for (const student of roster) {
        const isAtRisk = atRiskStudentIds.has(student.id) && last7.has(day.getTime());
        const status = isAtRisk ? rollStatus(rng, 0.35, 0.15) : rollStatus(rng, 0.9, 0.05);
        dailyRecords.push({
          id: randomUUID(),
          studentId: student.id,
          classUnitId: unit.id,
          status,
          markedByUserId: formTeacherId,
        });
      }
    }

    if (dailyRecords.length === 0) continue;

    await prisma.attendanceRecord.createMany({
      data: dailyRecords.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        classUnitId: r.classUnitId,
        date: day,
        type: AttendanceEntryType.DAILY_REGISTER,
        status: r.status,
        markedByUserId: r.markedByUserId,
        markedAt: day,
      })),
    });

    if (recentDays.has(day.getTime())) {
      await backfillNotificationsForDay(dailyRecords, day, studentNameById, schoolIdByUnit, schoolNameById);
    }
  }

  // Subject-level attendance: secondary school units only, recent days only,
  // to keep the demo dataset large-but-loadable rather than exhaustive.
  for (const day of subjectDays) {
    for (const unit of units) {
      if (unit.requiredSubjects.length === 0) continue;
      const roster = studentsByUnit.get(unit.id) ?? [];

      for (const [subjectIndex, subjectName] of unit.requiredSubjects.entries()) {
        const subjectId = subjectIdByName.get(subjectName);
        if (!subjectId) continue;
        const teacherId = teacherByUnitSubject.get(`${unit.id}:${subjectId}`);
        if (!teacherId) continue;

        const rows = roster.map((student) => ({
          id: randomUUID(),
          studentId: student.id,
          classUnitId: unit.id,
          date: day,
          type: AttendanceEntryType.SUBJECT,
          status: rollStatus(rng, 0.92, 0.04),
          subjectId,
          period: `Period ${(subjectIndex % 6) + 1}`,
          markedByUserId: teacherId,
          markedAt: day,
        }));

        if (rows.length > 0) {
          await prisma.attendanceRecord.createMany({ data: rows });
        }
      }
    }
  }
}

async function backfillNotificationsForDay(
  dailyRecords: { id: string; studentId: string; classUnitId: string; status: AttendanceStatus }[],
  day: Date,
  studentNameById: Map<string, string>,
  schoolIdByUnit: Map<string, string>,
  schoolNameById: Map<string, string>
) {
  const studentIds = dailyRecords.map((r) => r.studentId);
  const guardianLinks = await prisma.studentGuardian.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, guardianId: true },
  });
  const guardiansByStudent = new Map<string, string[]>();
  for (const link of guardianLinks) {
    const list = guardiansByStudent.get(link.studentId) ?? [];
    list.push(link.guardianId);
    guardiansByStudent.set(link.studentId, list);
  }

  const dayStart = new Date(day);
  dayStart.setUTCHours(7, intBetween(rng, 30, 40), 0, 0);

  const rows: {
    id: string;
    studentId: string;
    guardianId: string;
    channel: NotificationChannel;
    trigger: NotificationTrigger;
    message: string;
    status: "DELIVERED";
    attendanceRecordId: string;
    createdAt: Date;
    sentAt: Date;
    deliveredAt: Date;
  }[] = [];

  // Each record gets its own slightly staggered createdAt (a form teacher
  // marks a roster of 8-25 pupils one at a time, not all in the same
  // instant), and each row's sent/delivered offsets are independently
  // randomized -- otherwise a whole day's backfilled notifications would
  // share one identical timestamp, which reads as obviously simulated.
  let cursorMs = dayStart.getTime();

  for (const record of dailyRecords) {
    cursorMs += intBetween(rng, 4, 18) * 1000;
    const createdAt = new Date(cursorMs);
    const guardianIds = guardiansByStudent.get(record.studentId) ?? [];
    const schoolId = schoolIdByUnit.get(record.classUnitId) ?? "";
    const studentName = studentNameById.get(record.studentId) ?? "Pupil";
    const schoolName = schoolNameById.get(schoolId) ?? "School";
    const message = buildAttendanceMessage(record.status as "PRESENT" | "LATE" | "ABSENT", studentName, schoolName, createdAt, rng);

    for (const guardianId of guardianIds) {
      for (const channel of [NotificationChannel.SMS, NotificationChannel.WHATSAPP]) {
        const sentAt = new Date(createdAt.getTime() + intBetween(rng, 20, 90) * 1000);
        const deliveredAt = new Date(sentAt.getTime() + intBetween(rng, 40, 180) * 1000);
        rows.push({
          id: randomUUID(),
          studentId: record.studentId,
          guardianId,
          channel,
          trigger: NotificationTrigger.ATTENDANCE_MARKED,
          message,
          status: "DELIVERED",
          attendanceRecordId: record.id,
          createdAt,
          sentAt,
          deliveredAt,
        });
      }
    }
  }

  if (rows.length > 0) {
    await prisma.notificationLog.createMany({ data: rows });
  }
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating group + subscription...");
  const group = await prisma.group.create({ data: { name: "Royal Kingdom Group of Schools" } });
  await prisma.subscription.create({
    data: {
      groupId: group.id,
      tier: "ENTERPRISE",
      status: "ACTIVE",
      seats: 2000,
      currentPeriodStart: new Date("2026-04-01"),
      currentPeriodEnd: new Date("2027-03-31"),
    },
  });

  const groupAdminPerson = generatePerson(rng);
  await createUser({
    fullName: groupAdminPerson.fullName,
    domain: "royalkingdomgroup.edu.ng",
    phone: generatePhone(rng),
    role: Role.GROUP_ADMIN,
    passwordHash,
    groupId: group.id,
  });

  console.log("Building Royal Kingdom Nursery and Primary School...");
  const primarySchool = await prisma.school.create({
    data: {
      groupId: group.id,
      name: "Royal Kingdom Nursery and Primary School",
      type: SchoolType.NURSERY_PRIMARY,
      attendanceCutoffTime: "08:00",
    },
  });
  await createTerms(primarySchool.id);
  const primaryAdminPerson = generatePerson(rng);
  await createUser({
    fullName: primaryAdminPerson.fullName,
    domain: "royalkingdomprimary.edu.ng",
    phone: generatePhone(rng),
    role: Role.SCHOOL_ADMIN,
    passwordHash,
    schoolId: primarySchool.id,
  });
  const primaryUnits = await buildLevelsAndUnits(primarySchool.id, NURSERY_PRIMARY_LEVELS, passwordHash, "royalkingdomprimary.edu.ng", false);

  console.log("Building Royal Kingdom College...");
  const collegeSchool = await prisma.school.create({
    data: {
      groupId: group.id,
      name: "Royal Kingdom College",
      type: SchoolType.SECONDARY,
      attendanceCutoffTime: "08:15",
    },
  });
  await createTerms(collegeSchool.id);
  const collegeAdminPerson = generatePerson(rng);
  await createUser({
    fullName: collegeAdminPerson.fullName,
    domain: "royalkingdomcollege.edu.ng",
    phone: generatePhone(rng),
    role: Role.SCHOOL_ADMIN,
    passwordHash,
    schoolId: collegeSchool.id,
  });
  const subjectIdByName = await createSubjects(collegeSchool.id);
  const collegeUnits = await buildLevelsAndUnits(collegeSchool.id, SECONDARY_LEVELS, passwordHash, "royalkingdomcollege.edu.ng", true);
  const teacherByUnitSubject = await createSubjectTeachersAndLinks(
    collegeSchool.id,
    collegeUnits,
    subjectIdByName,
    passwordHash,
    "royalkingdomcollege.edu.ng"
  );

  console.log("Creating DecyfoTech internal-role demo accounts...");
  for (const [fullNameSeedRole, role] of [
    ["Onboarding Specialist", Role.ONBOARDING_SPECIALIST],
    ["Support Agent", Role.SUPPORT_AGENT],
    ["Billing Manager", Role.BILLING_MANAGER],
    ["Compliance Officer", Role.COMPLIANCE_OFFICER],
  ] as const) {
    const person = generatePerson(rng);
    await createUser({
      fullName: `${person.fullName} (${fullNameSeedRole})`,
      domain: "decyfotech.com",
      phone: generatePhone(rng),
      role,
      passwordHash,
    });
  }

  console.log("Enrolling students (this generates ~800 students with guardians)...");
  const allUnits = [...primaryUnits, ...collegeUnits];
  const studentsByUnit = new Map<string, SeededStudent[]>();
  const primaryCounter = { n: 0 };
  const collegeCounter = { n: 0 };

  for (const unit of primaryUnits) {
    studentsByUnit.set(unit.id, await enrollStudents(unit, "RKN", primaryCounter));
  }
  for (const unit of collegeUnits) {
    studentsByUnit.set(unit.id, await enrollStudents(unit, "RKC", collegeCounter));
  }

  const formTeacherByUnit = new Map<string, string>();
  const dbUnits = await prisma.classUnit.findMany({ select: { id: true, formTeacherId: true } });
  for (const u of dbUnits) {
    if (u.formTeacherId) formTeacherByUnit.set(u.id, u.formTeacherId);
  }

  const schoolNameById = new Map([
    [primarySchool.id, primarySchool.name],
    [collegeSchool.id, collegeSchool.name],
  ]);

  console.log(`Backfilling ${SCHOOL_DAYS_BACK} school days of attendance history...`);
  await backfillAttendanceForSchool(
    allUnits,
    studentsByUnit,
    formTeacherByUnit,
    teacherByUnitSubject,
    subjectIdByName,
    schoolNameById
  );

  const totalStudents = Array.from(studentsByUnit.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log("\nSeed complete.");
  console.log(`  Group: Royal Kingdom Group of Schools`);
  console.log(`  Schools: 2 (${primaryUnits.length} primary units, ${collegeUnits.length} college units)`);
  console.log(`  Students: ${totalStudents}`);
  console.log(`  Demo password for every seeded account: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
