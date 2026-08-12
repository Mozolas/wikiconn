import { isValidRoomCode } from '@wikiconn/shared';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import { RoomView } from './room-view';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: PageProps): Promise<ReactNode> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!isValidRoomCode(code)) notFound();
  return <RoomView code={code} />;
}
