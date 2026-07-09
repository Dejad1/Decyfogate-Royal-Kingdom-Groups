import { Role } from "@decyfogate/shared-types";

export function roleLabel(role: Role): string {
  switch (role) {
    case Role.FORM_TEACHER:
      return "Form Teacher";
    case Role.SUBJECT_TEACHER:
      return "Subject Teacher";
    case Role.SCHOOL_ADMIN:
      return "School Admin";
    case Role.GROUP_ADMIN:
      return "Group Admin";
    case Role.GUARDIAN:
      return "Parent/Guardian";
    default:
      return role;
  }
}
