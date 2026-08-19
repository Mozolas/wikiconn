'use client';

import { type Language, type WikiSearchResult } from '@wikiconn/shared';
import { Dices, Loader2, Search, X } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDictionary } from '@/i18n/context';
import { format } from '@/i18n/plural';
import { fetchRandomArticle, searchWiki } from '@/lib/api';
import { humanSlug } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  label: string;
  hint: string;
  lang: Language;
  value: string | undefined;
  disabled?: boolean;
  /** `null` clears the selection — see RoomSettingsPatch on why not `undefined`. */
  onChange: (slug: string | null) => void;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

/**
 * Type-ahead over the chosen Wikipedia's OpenSearch index, wired up as an ARIA
 * combobox, plus a dice button for hosts who would rather be surprised.
 */
export function ArticlePicker({
  id,
  label,
  hint,
  lang,
  value,
  disabled = false,
  onChange,
}: Props): ReactNode {
  const dict = useDictionary().picker;
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  const options = tooShort ? [] : results;
  const listOpen = open && !tooShort;

  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchWiki(lang, trimmed, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) {
            setResults(rows);
            setSearching(false);
          }
          return rows;
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setResults([]);
          setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      // Aborting in flight guarantees a slow response cannot overwrite a newer query.
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, tooShort, lang]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current === null) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    globalThis.document.addEventListener('mousedown', onPointerDown);
    return () => {
      globalThis.document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  function pick(row: WikiSearchResult | undefined): void {
    if (row === undefined) return;
    onChange(row.slug);
    setQuery('');
    setResults([]);
    setOpen(false);
    setHighlight(-1);
  }

  function rollRandom(): void {
    if (rolling) return;
    setRolling(true);
    fetchRandomArticle(lang)
      .then((article) => {
        onChange(article.slug);
        setRolling(false);
        return article;
      })
      .catch(() => {
        setRolling(false);
        toast.error(dict.randomFailed);
      });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
      return;
    }
    if (options.length === 0) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        setOpen(true);
        setHighlight((current) => Math.min(current + 1, options.length - 1));
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setHighlight((current) => Math.max(current - 1, 0));
        break;
      }
      case 'Home': {
        event.preventDefault();
        setHighlight(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        setHighlight(options.length - 1);
        break;
      }
      case 'Enter': {
        event.preventDefault();
        pick(options[highlight === -1 ? 0 : highlight]);
        break;
      }
      case 'Tab': {
        setOpen(false);
        break;
      }
      default: {
        break;
      }
    }
  }

  const hasValue = value !== undefined && value.length > 0;

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      {hasValue ? (
        <div className="flex items-center gap-2 rounded-sm border border-input bg-muted px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{humanSlug(value)}</span>
          {disabled ? null : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={rollRandom}
                disabled={rolling}
                title={dict.randomAnother}
              >
                {rolling ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Dices aria-hidden="true" />
                )}
                <span className="sr-only">{dict.randomAnother}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  onChange(null);
                }}
                title={dict.clear}
              >
                <X aria-hidden="true" />
                <span className="sr-only">{format(dict.clearNamed, { label })}</span>
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={id}
                value={query}
                disabled={disabled}
                placeholder={format(dict.searchPlaceholder, { lang: lang.toUpperCase() })}
                className="pl-8"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  highlight >= 0 ? `${listId}-option-${String(highlight)}` : undefined
                }
                autoComplete="off"
                onFocus={() => {
                  setOpen(true);
                }}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                  setHighlight(-1);
                }}
                onKeyDown={onKeyDown}
              />
              {searching ? (
                <Loader2
                  aria-hidden="true"
                  className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || rolling}
              onClick={rollRandom}
              title={dict.random}
            >
              {rolling ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Dices aria-hidden="true" />
              )}
              <span className="sr-only">{dict.randomPick}</span>
            </Button>
          </div>

          {listOpen && options.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={format(dict.suggestions, { label })}
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-border bg-popover shadow-md"
            >
              {options.map((row, index) => (
                <li
                  key={`${row.slug}-${String(index)}`}
                  id={`${listId}-option-${String(index)}`}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => {
                    setHighlight(index);
                  }}
                  onMouseDown={(event) => {
                    // Select on mousedown: options are not focusable in the ARIA
                    // combobox pattern (the input keeps focus and drives the
                    // keyboard), so a click handler here would be unreachable
                    // without a pointer anyway.
                    event.preventDefault();
                    pick(row);
                  }}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm',
                    index === highlight && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span className="font-medium">{row.title}</span>
                  {row.description.length > 0 ? (
                    <span className="ml-2 text-muted-foreground">{row.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {listOpen && !searching && options.length === 0 ? (
            <p className="absolute z-20 mt-1 w-full rounded-sm border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
              {format(dict.nothingFound, { query: trimmed })}
            </p>
          ) : null}
        </>
      )}

      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
