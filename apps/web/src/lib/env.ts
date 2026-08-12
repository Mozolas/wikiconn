function clean(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  apiUrl: clean(process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'),
  socketUrl: clean(process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3001'),
} as const;
