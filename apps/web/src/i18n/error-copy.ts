import { type ErrorCode, errorCodeSchema, type ErrorPayload } from '@wikiconn/shared';

import { API_NETWORK_ERROR, API_TIMEOUT, ApiError } from '@/lib/api';

export interface ErrorCopy {
  title: string;
  message: string;
}

/**
 * Only the codes a player can act on are worth translating; the rest are
 * developer-facing and fall back to whatever the server said. Pinning the type
 * here keeps the lookup honestly partial, so callers have to handle a miss.
 */
export type ErrorCopyMap = Partial<Record<ErrorCode, ErrorCopy>>;

export function errorCopy(map: ErrorCopyMap): ErrorCopyMap {
  return map;
}

export function describeError(
  errors: { cannotJoin: string; byCode: ErrorCopyMap },
  payload: ErrorPayload,
): ErrorCopy {
  return errors.byCode[payload.code] ?? { title: errors.cannotJoin, message: payload.message };
}

interface ErrorStrings {
  byCode: ErrorCopyMap;
  network: string;
  timeout: string;
}

/**
 * HTTP failures reach the client as English sentences from the server, or as no
 * sentence at all when the request never arrived. Both get resolved through the
 * dictionary here so a Czech player is not handed an English toast.
 */
export function describeApiError(errors: ErrorStrings, error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === API_NETWORK_ERROR) return errors.network;
  if (error.code === API_TIMEOUT) return errors.timeout;

  const known = errorCodeSchema.safeParse(error.code);
  if (known.success) return errors.byCode[known.data]?.message ?? fallback;
  return fallback;
}
