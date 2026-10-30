import { login } from "../actions";

const ERRORS: Record<string, string> = {
  AccessDenied: "Dit GitHub-account heeft geen toegang tot het beheer.",
  Configuration: "De login is niet goed geconfigureerd.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Inloggen is mislukt. Probeer het opnieuw.") : null;

  return (
    <main className="panel" style={{ maxWidth: 420, margin: "15vh auto 0" }}>
      <h1>Demo-beheer</h1>
      <p className="muted">Log in met een GitHub-account van The MarketLab.</p>
      {message && <p className="error">{message}</p>}
      <form action={login}>
        <button type="submit">Inloggen met GitHub</button>
      </form>
    </main>
  );
}
