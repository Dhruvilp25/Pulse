// Shared in a plain module so the "use server" actions file only exports
// async functions (a Next.js requirement).
export type GenerateKeyState =
  | { ok: true; token: string }
  | { ok: false; error: string }
  | null;
