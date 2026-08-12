export const roomKey = (code: string): string => `room:${code}`;
export const playersKey = (code: string): string => `room:${code}:players`;
export const secretsKey = (code: string): string => `room:${code}:secrets`;
export const lockKey = (code: string): string => `room:${code}:lock`;

export const ROOM_HASH_FIELDS = {
  hostPlayerId: 'hostPlayerId',
  lang: 'lang',
  startSlug: 'startSlug',
  finishSlug: 'finishSlug',
  visibility: 'visibility',
  status: 'status',
  createdAt: 'createdAt',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt',
  winnerId: 'winnerId',
} as const;
