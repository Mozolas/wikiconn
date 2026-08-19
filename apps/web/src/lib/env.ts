import { stripTrailingSlash } from '@/lib/utils';

export const env = {
  apiUrl: stripTrailingSlash(process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'),
  socketUrl: stripTrailingSlash(process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3001'),
} as const;
