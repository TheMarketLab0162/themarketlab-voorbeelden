"use client";

import { useActionState } from "react";
import { relogin, removeDemo, type FormState } from "./actions";

export function DeleteForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(removeDemo, {});

  return (
    <>
      <form action={action} className="stack">
        <input type="hidden" name="slug" value={slug} />
        {state.error && <p className="error">{state.error}</p>}
        <label>
          Typ <code>{slug}</code> om te bevestigen
          <input type="text" name="confirm" autoComplete="off" required />
        </label>
        <div>
          <button type="submit" className="danger" disabled={pending}>
            Definitief verwijderen
          </button>
        </div>
      </form>
      {state.error?.startsWith("Log") && (
        <form action={relogin} style={{ marginTop: 12 }}>
          <button type="submit" className="secondary">
            Opnieuw inloggen
          </button>
        </form>
      )}
    </>
  );
}
