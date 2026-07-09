// Thin, platform-agnostic client for the DecyfoGate REST API. Both the
// Next.js web app and the Expo mobile app depend on this instead of each
// hand-rolling their own fetch wrapper -- the low-level request/error
// handling lives here once, and so do the specific calls the Form Teacher
// and Subject Teacher screens need on both platforms. Relies only on the
// standard `fetch` global, which both DOM and React Native provide, so
// nothing here is web- or native-specific.
import {
  AddOneOffPickupPersonRequest,
  AttendanceEntryType,
  AttendanceStatus,
  DismissalType,
  EscalateUnauthorizedPickupRequest,
  LogDismissalRequest,
  LoginResponse,
  MarkAttendanceRequest,
  SchoolType,
  UserSummaryDto,
} from "@decyfogate/shared-types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(baseUrl: string, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Shapes returned by endpoints that don't have a dedicated DTO in
// shared-types yet (they return Prisma-shaped rows, not the idealized
// DTOs). Kept here so both apps consume one definition. ----

export interface ClassUnitMine {
  id: string;
  name: string;
  classLevel: { name: string; order: number };
  subject?: { id: string; name: string };
}

export interface GuardianLink {
  guardian: { id: string; fullName: string; phone: string };
  relationship: string;
  isPrimary: boolean;
}

export interface RosterStudent {
  id: string;
  fullName: string;
  admissionNumber: string;
  guardians: GuardianLink[];
}

export interface RosterResponse {
  unit: { id: string; classLevel: { school: { type: SchoolType } } };
  students: RosterStudent[];
}

export interface TodayAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  type: AttendanceEntryType;
  subjectId: string | null;
}

export interface NotificationLogRow {
  id: string;
  channel: "SMS" | "WHATSAPP";
  trigger: "ATTENDANCE_MARKED" | "NOT_YET_ARRIVED" | "BROADCAST" | "DISMISSAL_CONFIRMED";
  message: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  student: { fullName: string; classUnitId: string };
  guardian: { fullName: string; phone: string };
}

export interface AuthorizedGuardian {
  guardianId: string;
  fullName: string;
  relationship: string;
  phone: string;
}

export interface AuthorizedOneOffPerson {
  id: string;
  fullName: string;
  relationship: string;
  phone: string | null;
}

export interface AuthorizedPickupListResponse {
  guardians: AuthorizedGuardian[];
  oneOffPeopleToday: AuthorizedOneOffPerson[];
}

export interface DismissalRecordRow {
  studentId: string;
  type: DismissalType;
  pickedUpByName: string | null;
  pickedUpByRelationship: string | null;
}

/**
 * Bind once per (baseUrl, token) pair -- cheap to recreate whenever the
 * token changes (e.g. on login/logout), since it holds no other state.
 */
export class DecyfogateApiClient {
  constructor(private baseUrl: string, private token: string | null) {}

  private request<T>(path: string, options: Omit<ApiRequestOptions, "token"> = {}) {
    return apiRequest<T>(this.baseUrl, path, { ...options, token: this.token });
  }

  login(email: string, password: string) {
    return apiRequest<LoginResponse>(this.baseUrl, "/auth/login", { method: "POST", body: { email, password } });
  }

  me() {
    return this.request<UserSummaryDto>("/auth/me");
  }

  listMyClassUnits() {
    return this.request<ClassUnitMine[]>("/directory/class-units/mine");
  }

  getRoster(classUnitId: string) {
    return this.request<RosterResponse>(`/directory/class-units/${classUnitId}/roster`);
  }

  getTodayAttendance(classUnitId: string) {
    return this.request<TodayAttendanceRecord[]>(`/attendance/today?classUnitId=${classUnitId}`);
  }

  markAttendance(input: MarkAttendanceRequest) {
    return this.request<TodayAttendanceRecord>("/attendance", { method: "POST", body: input });
  }

  listNotificationLogs(schoolId: string) {
    return this.request<NotificationLogRow[]>(`/notifications/logs?schoolId=${schoolId}`);
  }

  getAuthorizedPickupList(studentId: string, date: string) {
    return this.request<AuthorizedPickupListResponse>(`/dismissal/authorized-list?studentId=${studentId}&date=${date}`);
  }

  addOneOffPickupPerson(input: AddOneOffPickupPersonRequest) {
    return this.request<AuthorizedOneOffPerson>("/dismissal/one-off-pickup-person", { method: "POST", body: input });
  }

  logDismissal(input: LogDismissalRequest) {
    return this.request<DismissalRecordRow>("/dismissal", { method: "POST", body: input });
  }

  getTodayDismissals(classUnitId: string) {
    return this.request<DismissalRecordRow[]>(`/dismissal/today?classUnitId=${classUnitId}`);
  }

  escalateUnauthorizedPickup(input: EscalateUnauthorizedPickupRequest) {
    return this.request<{ id: string }>("/dismissal/escalate", { method: "POST", body: input });
  }
}
