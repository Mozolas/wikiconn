import { isValidRoomCode } from '@wikiconn/shared';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import { PlayView } from './play-view';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function PlayPage({ params }: PageProps): Promise<ReactNode> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!isValidRoomCode(code)) notFound();
  return <PlayView code={code} />;
}
