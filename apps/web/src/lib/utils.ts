import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Origins are stored without a trailing slash, so joining a path is just concatenation. */
export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
