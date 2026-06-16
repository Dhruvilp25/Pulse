"use client";

import { useActionState } from "react";
import { generateApiKeyAction } from "./actions";
import type { GenerateKeyState } from "./types";

export function NewApiKeyForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<GenerateKeyState, FormData>(
    generateApiKeyAction.bind(null, projectId),
    null,
  );

  return (
    <section className="flex flex-col gap-3">
      <form action={formAction} className="flex items-center gap-2">
        <input
          name="name"
          placeholder="Key name (optional)"
          maxLength={80}
          className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm dark:border-white/[.145]"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate API key"}
        </button>
      </form>

      {state?.ok === false && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <span className="font-medium">
            Copy this key now — it won’t be shown again:
          </span>
          <code className="font-mono break-all">{state.token}</code>
        </div>
      )}
    </section>
  );
}
