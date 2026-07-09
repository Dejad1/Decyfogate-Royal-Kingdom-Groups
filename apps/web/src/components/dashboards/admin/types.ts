export interface ClassUnitSummary {
  id: string;
  classLevelId: string;
  name: string;
  formTeacherId: string | null;
  formTeacher: { id: string; fullName: string; email: string } | null;
  _count: { students: number };
}

export interface ClassLevelSummary {
  id: string;
  schoolId: string;
  name: string;
  order: number;
  units: ClassUnitSummary[];
}

export interface StaffAssignmentUnit {
  classLevel: { name: string };
  name: string;
}

export interface FormTeacherSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  formTeacherOfUnits: StaffAssignmentUnit[];
}

export interface SubjectTeacherAssignment {
  subject: { name: string };
  classUnit: { name: string; classLevel: { name: string } };
}

export interface SubjectTeacherSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subjectAssignments: SubjectTeacherAssignment[];
}

export interface StaffResponse {
  formTeachers: FormTeacherSummary[];
  subjectTeachers: SubjectTeacherSummary[];
}

export interface AttendanceReportRow {
  studentId: string;
  studentName: string;
  classUnitName: string;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalDays: number;
  attendancePercentage: number;
}

export interface LowAttendanceFlag {
  studentId: string;
  studentName: string;
  classUnitId: string;
  classUnitName: string;
  absenceCountTrailing7Days: number;
}

export interface BehaviorAlert {
  id: string;
  studentId: string;
  studentName: string;
  classUnitId: string;
  classUnitName: string;
  subjectName: string;
  comment: string | null;
  status: "OPEN" | "ACKNOWLEDGED";
  raisedByName: string;
  createdAt: string;
  acknowledgedAt: string | null;
}
