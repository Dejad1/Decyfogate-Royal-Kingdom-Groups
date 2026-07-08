import bcrypt from "bcryptjs";
import { Role, UserSummaryDto } from "@decyfogate/shared-types";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
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

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return toSummary(user);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
