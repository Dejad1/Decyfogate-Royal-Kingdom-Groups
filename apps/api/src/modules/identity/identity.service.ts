import bcrypt from "bcryptjs";
import { Role, UserSummaryDto } from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { AuthTokenPayload } from "../../lib/jwt";
import { HttpError } from "../../middleware/errorHandler";

// Prisma generates its own (structurally identical) Role enum from the
// schema, distinct from the hand-written @decyfogate/shared-types one that
// the API contract and other workspace packages rely on. Values line up
// 1:1, so a single narrow cast at the identity boundary keeps the rest of
// the codebase using the shared enum everywhere.
function toRole(role: string): Role {
  return role as unknown as Role;
}

function toSummary(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  schoolId: string | null;
  groupId: string | null;
}): UserSummaryDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: toRole(user.role),
    schoolId: user.schoolId,
    groupId: user.groupId,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid email or password");
  }
  const token = signToken({
    sub: user.id,
    role: toRole(user.role),
    schoolId: user.schoolId,
    groupId: user.groupId,
  });
  return { token, user: toSummary(user) };
}

// Section 11: a guardian is not a User -- there's no staff role, no
// school/group scoping (a guardian's children can be at either school).
// Reuses the exact same signToken/AuthTokenPayload shape as staff login
// rather than a parallel auth system: `sub` just points at a Guardian.id
// instead of a User.id, schoolId/groupId are always null, and every route
// that only needs `requireRole(Role.GUARDIAN)` or `req.auth!.sub` works
// completely unchanged.
export async function guardianLogin(phone: string, password: string) {
  const guardian = await prisma.guardian.findFirst({ where: { phone } });
  if (!guardian || !guardian.passwordHash) {
    throw new HttpError(401, "Invalid phone number or password");
  }
  const valid = await bcrypt.compare(password, guardian.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid phone number or password");
  }
  const token = signToken({
    sub: guardian.id,
    role: Role.GUARDIAN,
    schoolId: null,
    groupId: null,
  });
  const summary: UserSummaryDto = {
    id: guardian.id,
    fullName: guardian.fullName,
    email: guardian.email ?? "",
    phone: guardian.phone,
    role: Role.GUARDIAN,
    schoolId: null,
    groupId: null,
  };
  return { token, user: summary };
}

export async function getMe(auth: AuthTokenPayload): Promise<UserSummaryDto> {
  if (auth.role === Role.GUARDIAN) {
    const guardian = await prisma.guardian.findUnique({ where: { id: auth.sub } });
    if (!guardian) throw new HttpError(404, "Guardian not found");
    return {
      id: guardian.id,
      fullName: guardian.fullName,
      email: guardian.email ?? "",
      phone: guardian.phone,
      role: Role.GUARDIAN,
      schoolId: null,
      groupId: null,
    };
  }
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return toSummary(user);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
