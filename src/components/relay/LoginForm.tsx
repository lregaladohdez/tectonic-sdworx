"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("incoming@relay.demo");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, passcode }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; workspaceId?: string | null };
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Login failed");
    router.push(data.workspaceId ? `/w/${data.workspaceId}` : "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          className="rounded-md border border-line bg-surface px-3 py-2 font-normal text-body outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink">
        Passcode
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="current-password"
          required
          className="rounded-md border border-line bg-surface px-3 py-2 font-normal text-body outline-none focus:border-brand"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-400 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-slate">
        Demo accounts: incoming@relay.demo (Jonas, incoming consultant) and nadia@relay.demo. The passcode
        is set by the team in the server environment.
      </p>
    </form>
  );
}
