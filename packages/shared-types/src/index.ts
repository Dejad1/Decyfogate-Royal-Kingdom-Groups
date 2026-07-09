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
  // Section 11: a guardian logged into the Companion App -- not a staff
  // role, but authenticated through the same token shape (see
  // UserSummaryDto below, which a guardian's /auth/me response also fits).
  GUARDIAN = "GUARDIAN",
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

// Section 11: PUSH and EMAIL added alongside the original SMS/WHATSAPP.
// Push/SMS/email are always available; WhatsApp is gated per-school (see
// SchoolDto.whatsappEnabled) since it costs roughly 5-9x more per message.
export enum NotificationChannel {
  SMS = "SMS",
  WHATSAPP = "WHATSAPP",
  PUSH = "PUSH",
  EMAIL = "EMAIL",
}

export enum DevicePlatform {
  IOS = "IOS",
  ANDROID = "ANDROID",
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
  DISMISSAL_CONFIRMED = "DISMISSAL_CONFIRMED",
  END_OF_DAY_DIGEST = "END_OF_DAY_DIGEST",
}

export enum BroadcastScope {
  GROUP = "GROUP",
  SCHOOL = "SCHOOL",
  LEVEL = "LEVEL",
  UNIT = "UNIT",
}

// PICKUP: collected by a named person -- mandatory for Nursery/Primary,
// where naming who is required but that person never needs to be
// pre-registered. SELF_DISMISSED: left unaccompanied -- Secondary only.
export enum DismissalType {
  PICKUP = "PICKUP",
  SELF_DISMISSED = "SELF_DISMISSED",
}

// Section 8, secondary schools only. ATTENTIVE/DISRUPTIVE/SLEEPING are
// routine color for the end-of-day digest; BULLYING_FLAG additionally
// raises an immediate BehaviorAlert to the School Admin.
export enum BehaviorTag {
  ATTENTIVE = "ATTENTIVE",
  DISRUPTIVE = "DISRUPTIVE",
  SLEEPING = "SLEEPING",
  BULLYING_FLAG = "BULLYING_FLAG",
}

export enum BehaviorAlertStatus {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
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
  whatsappEnabled: boolean;
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
  // Section 8: only accepted when type == SUBJECT.
  behaviorTag?: BehaviorTag;
  behaviorComment?: string;
}

export interface BehaviorAlertDto {
  id: string;
  studentId: string;
  studentName: string;
  classUnitId: string;
  classUnitName: string;
  subjectName: string;
  comment: string | null;
  status: BehaviorAlertStatus;
  raisedByName: string;
  createdAt: string;
  acknowledgedAt: string | null;
}

export interface EndOfDayDigestRow {
  studentId: string;
  studentName: string;
  classUnitName: string;
  periodsAttended: number;
  periodsScheduled: number;
  tagCounts: Partial<Record<BehaviorTag, number>>;
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

export interface LogDismissalRequest {
  studentId: string;
  classUnitId: string;
  date: string;
  type: DismissalType;
  pickupPersonName?: string;
  pickupPersonRelationship?: string;
  pickupPersonPhone?: string;
  matchedGuardianId?: string;
}

// ---- Section 11: Parent/Guardian Companion App ----

export interface GuardianLoginRequest {
  phone: string;
  password: string;
}

export interface ChildTodayDismissalDto {
  type: DismissalType;
  pickupPersonName: string | null;
  pickupPersonRelationship: string | null;
  confirmedAt: string;
}

export interface ChildSummaryDto {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  classUnitName: string;
  schoolName: string;
  todayAttendanceStatus: AttendanceStatus | null;
  todayDismissal: ChildTodayDismissalDto | null;
}

export interface GuardianPreferencesDto {
  preferredChannels: NotificationChannel[];
  // Which channels this guardian is allowed to pick from -- PUSH/SMS/EMAIL
  // always included; WHATSAPP only if at least one linked child's school
  // has it enabled.
  availableChannels: NotificationChannel[];
}

export interface UpdateGuardianPreferencesRequest {
  channels: NotificationChannel[];
}

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: DevicePlatform;
}

// ---- Formatting helpers shared by web and mobile ----

/** "08135634193" -> "0813 563 4193" (11-digit Nigerian mobile numbers). Falls back to the raw input for any other shape. */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}
