import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { Alert, Button, Field, controlClass } from "./nexus-ui";

export function AccessPanel() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: name.trim(),
              callbackURL: "/",
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: "/",
            });
      if (result.error) {
        setError(result.error.message ?? "Sign-in failed");
        return;
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {GROK_PROVIDERS.map((provider) => (
        <Button
          key={provider.providerId}
          variant="quiet"
          className="w-full"
          type="button"
          onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
        >
          Continue with {provider.label}
        </Button>
      ))}
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3 border-t border-line pt-4">
        {mode === "up" ? (
          <Field label="Name">
            <input className={`${controlClass} h-11`} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </Field>
        ) : null}
        <Field label="Email">
          <input
            className={`${controlClass} h-11`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password">
          <input
            className={`${controlClass} h-11`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            required
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Working…" : mode === "up" ? "Create account" : "Sign in with email"}
        </Button>
        <button
          type="button"
          className="h-11 text-sm text-muted"
          onClick={() => {
            setMode(mode === "up" ? "in" : "up");
            setError(null);
          }}
        >
          {mode === "up" ? "Already have an account" : "Create an email account"}
        </button>
      </form>
    </div>
  );
}
