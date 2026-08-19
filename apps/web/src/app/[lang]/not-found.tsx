'use client';

import { type ReactNode } from 'react';

import { FatalNotice } from '@/components/fatal-notice';
import { SiteShell } from '@/components/site-shell';
import { useDictionary } from '@/i18n/context';

export default function NotFound(): ReactNode {
  const { notFound } = useDictionary();

  return (
    <SiteShell>
      <FatalNotice title={notFound.title} message={notFound.message} />
    </SiteShell>
  );
}
