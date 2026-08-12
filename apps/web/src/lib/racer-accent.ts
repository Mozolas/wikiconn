/** Number of accent colours defined in globals.css (`.racer-0` … `.racer-4`). */
const ACCENT_COUNT = 5;

/**
 * Maps a seat index to its accent class, so a player keeps the same colour in
 * the lobby, the racer panel and the results.
 */
export function racerAccentClass(index: number): string {
  const seat = ((index % ACCENT_COUNT) + ACCENT_COUNT) % ACCENT_COUNT;
  return `racer-${String(seat)}`;
}
