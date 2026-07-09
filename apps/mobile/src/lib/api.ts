import { DecyfogateApiClient } from "@decyfogate/api-client";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export function createClient(token: string | null) {
  return new DecyfogateApiClient(API_URL, token);
}
