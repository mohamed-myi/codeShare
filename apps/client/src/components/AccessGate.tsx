import { Loader2, LockKeyhole } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { fetchAccessSession, loginWithInviteCode } from "../lib/api.js";

type AccessState = "checking" | "authorized" | "locked";

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAccessSession()
      .then((session) => {
        if (!active) return;
        setState(session.authenticated ? "authorized" : "locked");
      })
      .catch(() => {
        if (!active) return;
        setState("locked");
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const session = await loginWithInviteCode(trimmed);
      setState(session.authenticated ? "authorized" : "locked");
      if (!session.authenticated) setError("Invalid invite code.");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Invalid invite code.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
          <Loader2 size={16} className="animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (state === "authorized") {
    return <>{children}</>;
  }

  return (
    <main className="app-screen flex min-h-screen flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)]">
          <span>CS</span>
        </div>
        <section className="grid flex-1 items-start gap-16 pt-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:pt-20">
          <div className="max-w-3xl">
            <div className="mb-6 flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              <LockKeyhole size={18} />
            </div>
            <h1 className="text-5xl leading-[0.96] font-medium tracking-[0] text-[var(--color-text-primary)] sm:text-6xl">
              CodeShare
            </h1>
            <p className="mt-5 text-sm text-[var(--color-text-tertiary)]">Private demo access.</p>
          </div>

          <form className="fade-up-in mt-2 space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <input
                type="password"
                aria-label="Invite code"
                placeholder="Invite code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (error) setError(null);
                }}
                className="ui-line-control text-base"
                autoComplete="one-time-code"
              />
            </label>
            <button
              type="submit"
              className="ui-flat-button w-full justify-center"
              disabled={!code.trim() || submitting}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Entering..." : "Enter"}
            </button>
            {error && <p className="text-sm text-[var(--color-error-text)]">{error}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}
