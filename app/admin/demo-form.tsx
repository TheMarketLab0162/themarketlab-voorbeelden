"use client";

import { useActionState } from "react";
import { saveDemo, type FormState } from "./actions";

interface DemoFormValues {
  slug: string;
  clientName: string;
  url: string;
  mode: "basePath" | "root-static";
  enabled: boolean;
  hasBypassSecret: boolean;
}

export function DemoForm({ demo }: { demo?: DemoFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDemo, {});
  const editing = Boolean(demo);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="intent" value={editing ? "update" : "create"} />
      {state.error && <p className="error">{state.error}</p>}

      <label>
        Klantnaam
        <input type="text" name="clientName" required maxLength={100} defaultValue={demo?.clientName} />
      </label>

      <label>
        URL-slug
        <input
          type="text"
          name="slug"
          required
          maxLength={40}
          pattern="[a-z0-9](?:[a-z0-9\-]{0,38}[a-z0-9])?"
          defaultValue={demo?.slug}
          readOnly={editing}
        />
        <span className="hint">
          {editing
            ? "De slug kan niet worden gewijzigd. Maak een nieuwe demo aan voor een ander adres."
            : "Wordt voorbeeld.themarketlab.nl/{slug}. Alleen kleine letters, cijfers en '-'."}
        </span>
      </label>

      <label>
        Vercel-URL
        <input
          type="url"
          name="url"
          required
          placeholder="https://klant-x.vercel.app"
          defaultValue={demo?.url}
        />
        <span className="hint">
          Bij voorkeur het vaste productiedomein van het klantproject. Moet bij het Vercel-team van The MarketLab horen.
        </span>
      </label>

      <label>
        Modus
        <select name="mode" defaultValue={demo?.mode ?? "basePath"}>
          <option value="basePath">basePath — site gebouwd met base path /{"{slug}"} (aanbevolen)</option>
          <option value="root-static">root-static — eenvoudige statische site met alleen relatieve paden</option>
        </select>
      </label>

      <label>
        Protection Bypass for Automation (optioneel)
        <input type="password" name="bypassSecret" autoComplete="off" spellCheck={false} />
        <span className="hint">
          {demo?.hasBypassSecret
            ? "Er is een geheim opgeslagen. Laat leeg om het te behouden."
            : "Nodig als Deployment Protection aan staat in het klantproject (Settings → Deployment Protection)."}
        </span>
      </label>

      {demo?.hasBypassSecret && (
        <label className="inline">
          <input type="checkbox" name="clearBypassSecret" /> Opgeslagen bypass-geheim verwijderen
        </label>
      )}

      <label className="inline">
        <input type="checkbox" name="enabled" defaultChecked={demo?.enabled ?? true} /> Actief (publiek bereikbaar)
      </label>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? "Bezig met controleren…" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
