import jwt from "jsonwebtoken";
import { Role } from "@decyfogate/shared-types";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  schoolId: string | null;
  groupId: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}

export function signToken(payload: AuthTokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "12h") as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(payload, JWT_SECRET as string, options);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as AuthTokenPayload;
}
