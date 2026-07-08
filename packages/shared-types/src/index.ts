// Shared domain types for the DecyfoGate School Platform.
// Consumed by the API (request/response typing) and, later, by the
// Next.js web app and the Expo mobile app so business shapes are
// defined exactly once across the monorepo.

export enum SchoolType {
  NURSERY_PRIMARY = "NURSERY_PRIMARY",
  SECONDARY = "SECONDARY",
}

export enum Role {
  GROUP_ADMIN = "GROUP_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  FORM_TEACHER = "FORM_TEACHER",
  SUBJECT_TEACHER = "SUBJECT_TEACHER",
  ONBOARDING_SPECIALIST = "ONBOARDING_SPECIALIST",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  BILLING_MANAGER = "BILLING_MANAGER",
  COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
}

// DAILY_REGISTER = the Form Teacher's one mark-per-day that decides
// "did the child come to school" and is the only one that notifies guardians.
// SUBJECT = a Subject Teacher's per-period mark that answers "did the child
// show up to this specific class"; feeds reports/flags but never notifies.
export enum AttendanceEntryType {
  DAILY_REGISTER = "DAILY_REGISTER",
  SUBJECT = "SUBJECT",
}

export enum NotificationChannel {
  SMS = "SMS",
  WHATSAPP = "WHATSAPP",
}

export enum NotificationStatus {
  QUEUED = "QUEUED",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
}

export enum NotificationTrigger {
  ATTENDANCE_MARKED = "ATTENDANCE_MARKED",
  NOT_YET_ARRIVED = "NOT_YET_ARRIVED",
  BROADCAST = "BROADCAST",
}

export enum BroadcastScope {
  GROUP = "GROUP",
  SCHOOL = "SCHOOL",
  LEVEL = "LEVEL",
  UNIT = "UNIT",
}

export interface GroupDto {
  id: string;
  name: string;
}

export interface SchoolDto {
  id: string;
  groupId: string;
  name: string;
  type: SchoolType;
  attendanceCutoffTime: string; // "HH:mm", used for the not-yet-arrived flag
}

export interface ClassLevelDto {
  id: string;
  schoolId: string;
  name: string;
  order: number;
}

export interface ClassUnitDto {
  id: string;
  classLevelId: string;
  name: string; // "A" | "B" | "C"
  displayName: string; // e.g. "Primary 4B"
  formTeacherId: string | null;
}

export interface SubjectDto {
  id: string;
  schoolId: string;
  name: string;
  department: string | null; // Science | Arts | Commercial | null (core)
}

export interface ClassSubjectTeacherDto {
  id: string;
  classUnitId: string;
  subjectId: string;
  teacherId: string;
}

export interface UserSummaryDto {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  schoolId: string | null;
  groupId: string | null;
}

export interface GuardianDto {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
}

export interface StudentGuardianDto {
  guardian: GuardianDto;
  relationship: string;
  isPrimary: boolean;
}

export interface StudentDto {
  id: string;
  fullName: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  classUnitId: string;
  guardians: StudentGuardianDto[];
}

export interface AttendanceRecordDto {
  id: string;
  studentId: string;
  classUnitId: string;
  date: string; // ISO date, no time
  type: AttendanceEntryType;
  status: AttendanceStatus;
  subjectId: string | null;
  period: string | null;
  markedByUserId: string;
  markedAt: string;
}

export interface NotificationLogDto {
  id: string;
  studentId: string;
  guardianId: string;
  channel: NotificationChannel;
  trigger: NotificationTrigger;
  message: string;
  status: NotificationStatus;
  attendanceRecordId: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface LowAttendanceFlagDto {
  studentId: string;
  studentName: string;
  classUnitId: string;
  classUnitName: string;
  absenceCountTrailing7Days: number;
}

// ---- Request / response contracts ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserSummaryDto;
}

export interface MarkAttendanceRequest {
  studentId: string;
  classUnitId: string;
  date: string;
  status: AttendanceStatus;
  type: AttendanceEntryType;
  subjectId?: string;
  period?: string;
}

export interface AttendanceReportQuery {
  schoolId?: string;
  classUnitId?: string;
  studentId?: string;
  from: string;
  to: string;
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

export interface BroadcastRequest {
  scope: BroadcastScope;
  groupId?: string;
  schoolId?: string;
  classLevelId?: string;
  classUnitId?: string;
  message: string;
}
