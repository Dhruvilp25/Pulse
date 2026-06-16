import { randomBytes } from "node:crypto";
import { hash, compare } from "bcryptjs";

// Public, human-recognizable prefix on every key.
const KEY_PREFIX = "pulse_sk_";
// The leading slice we store + show as the lookup "prefix" (KEY_PREFIX + 7
// random chars). The full token is only ever shown once, at creation time.
const PREFIX_LENGTH = KEY_PREFIX.length + 7;

/** Generate a fresh API key. `token` is the secret (shown once); `prefix` is the
 *  non-secret lookup handle we persist and display. */
export function generateApiKey(): { token: string; prefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const token = KEY_PREFIX + secret;
  return { token, prefix: apiKeyPrefix(token) };
}

/** The key's public prefix — the handle we look it up by. Single source of
 *  truth for the prefix length, shared by generation and authentication. */
export function apiKeyPrefix(token: string): string {
  return token.slice(0, PREFIX_LENGTH);
}

/** Cheap shape check to reject obviously-wrong tokens before touching the DB. */
export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(KEY_PREFIX) && token.length > PREFIX_LENGTH;
}

export function hashApiKey(token: string): Promise<string> {
  return hash(token, 10);
}

export function verifyApiKey(token: string, hashedKey: string): Promise<boolean> {
  return compare(token, hashedKey);
}
