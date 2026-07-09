import { Role } from "@decyfogate/shared-types";

export function roleLabel(role: Role): string {
  switch (role) {
    case Role.GROUP_ADMIN:
      return "Group Admin";
    case Role.SCHOOL_ADMIN:
      return "School Admin";
    case Role.FORM_TEACHER:
      return "Form Teacher";
    case Role.SUBJECT_TEACHER:
      return "Subject Teacher";
    case Role.ONBOARDING_SPECIALIST:
      return "Onboarding Specialist";
    case Role.SUPPORT_AGENT:
      return "Support Agent";
    case Role.BILLING_MANAGER:
      return "Billing Manager";
    case Role.COMPLIANCE_OFFICER:
      return "Compliance Officer";
    default:
      return role;
  }
}
