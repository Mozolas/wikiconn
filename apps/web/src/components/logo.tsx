import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Deliberately not the Wikimedia puzzle globe (that mark is trademarked):
 * a wire globe with a three-node hop across it, for "racing between articles".
 */
export function Logo({ className }: { className?: string }): ReactNode {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <g stroke="currentColor" fill="none" strokeWidth="1.25" opacity="0.45">
        <circle cx="16" cy="16" r="13.4" />
        <ellipse cx="16" cy="16" rx="6.4" ry="13.4" />
        <path d="M3.4 11.6h25.2M3.4 20.4h25.2" />
      </g>
      <path
        d="M9.5 21.4 16 10.4l6.5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="currentColor">
        <circle cx="9.5" cy="21.4" r="2.7" />
        <circle cx="16" cy="10.4" r="2.7" />
        <circle cx="22.5" cy="21.4" r="2.7" />
      </g>
    </svg>
  );
}
