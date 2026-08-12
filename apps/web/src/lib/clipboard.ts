/**
 * Copies text to the clipboard, reporting whether it worked. The API is missing
 * in insecure contexts (plain-HTTP LAN play) and can be blocked by permissions,
 * so callers must handle a false result rather than assume success.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await globalThis.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
