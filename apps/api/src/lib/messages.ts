// Pure, dependency-free message templates -- deliberately typed against
// plain string literals rather than an AttendanceStatus enum so this file
// can be shared between the live notification service (which types
// against @decyfogate/shared-types) and the seed script (which types
// against @prisma/client's generated enums) without coupling those two
// otherwise-separate type systems together.
export type PickFn = () => number;

function pick<T>(pickFn: PickFn, options: readonly T[]): T {
  return options[Math.floor(pickFn() * options.length)];
}

export function buildAttendanceMessage(
  status: "PRESENT" | "LATE" | "ABSENT",
  studentName: string,
  schoolName: string,
  time: Date,
  pickFn: PickFn = Math.random
): string {
  const stamp = time.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  switch (status) {
    case "PRESENT":
      return pick(pickFn, [
        `${schoolName}: ${studentName} was marked PRESENT at ${stamp} today.`,
        `${schoolName}: Good news -- ${studentName} arrived and was marked PRESENT at ${stamp} today.`,
        `${schoolName}: ${studentName} is in school, marked PRESENT at ${stamp}.`,
      ]);
    case "LATE":
      return pick(pickFn, [
        `${schoolName}: ${studentName} arrived LATE at ${stamp} today.`,
        `${schoolName}: ${studentName} was marked LATE, arriving at ${stamp} today.`,
        `${schoolName}: Please note -- ${studentName} arrived after the morning cutoff and was marked LATE at ${stamp}.`,
      ]);
    case "ABSENT":
      return pick(pickFn, [
        `${schoolName}: ${studentName} was marked ABSENT today. Please contact the school office if this is unexpected.`,
        `${schoolName}: ${studentName} has not been marked present and is recorded ABSENT today. Contact the school office if this is unexpected.`,
      ]);
  }
}

export function buildNotYetArrivedMessage(studentName: string, schoolName: string, pickFn: PickFn = Math.random): string {
  return pick(pickFn, [
    `${schoolName}: ${studentName} has not yet been marked present today. If this is unexpected, please contact the school office.`,
    `${schoolName}: We have not yet recorded ${studentName} as present today. Please reach the school office if this is unexpected.`,
  ]);
}

// Deliberately distinct wording from buildAttendanceMessage's morning
// ping (brief section 9), so a guardian scanning their messages can tell
// an arrival confirmation from a departure confirmation at a glance.
export function buildDismissalMessage(
  type: "PICKUP" | "SELF_DISMISSED",
  studentName: string,
  schoolName: string,
  time: Date,
  pickedUpByName: string | null,
  pickedUpByRelationship: string | null,
  pickFn: PickFn = Math.random
): string {
  const stamp = time.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  if (type === "SELF_DISMISSED") {
    return pick(pickFn, [
      `${schoolName}: ${studentName} has left the school premises at ${stamp} today.`,
      `${schoolName}: ${studentName} was dismissed and departed unaccompanied at ${stamp} today.`,
    ]);
  }
  const who = pickedUpByRelationship ? `${pickedUpByName} (${pickedUpByRelationship})` : pickedUpByName ?? "an authorized pickup person";
  return pick(pickFn, [
    `${schoolName}: ${studentName} has been picked up by ${who} at ${stamp} today.`,
    `${schoolName}: ${studentName} was collected by ${who} at ${stamp} today.`,
  ]);
}
