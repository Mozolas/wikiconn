'use client';

import { type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { type ReactNode } from 'react';

import { useDictionary } from '@/i18n/context';
import { type ThemePreference, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface Option {
  value: ThemePreference;
  Icon: LucideIcon;
}

const OPTIONS: readonly Option[] = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
];

/**
 * Three-way appearance control mirroring Wikipedia's own light/dark/automatic
 * switch. Built on native radios so arrow-key navigation comes for free.
 */
export function ThemeToggle({ className }: { className?: string }): ReactNode {
  const { chrome } = useDictionary();
  const { preference, mounted, setPreference } = useTheme();

  return (
    <fieldset
      className={cn(
        'flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5',
        className,
      )}
    >
      <legend className="sr-only">{chrome.appearance}</legend>
      {OPTIONS.map(({ value, Icon }) => {
        const label = chrome.theme[value];
        return (
          <label key={value} title={label} className="cursor-pointer">
            <input
              type="radio"
              name="theme-preference"
              value={value}
              checked={mounted && preference === value}
              onChange={() => {
                setPreference(value);
              }}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors',
                'hover:bg-secondary hover:text-foreground',
                'peer-checked:bg-secondary peer-checked:text-foreground',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring',
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="sr-only">{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
