import { apiRequest, ApiError, ApiRequestOptions } from "@decyfogate/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export { ApiError };

export function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(API_URL, path, options);
}
