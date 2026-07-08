import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
};

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is required (see .env.example)");
}
