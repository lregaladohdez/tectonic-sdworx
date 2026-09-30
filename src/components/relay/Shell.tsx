import Link from "next/link";
import type { User, Workspace } from "@/relay/types";
import { SignOutButton } from "./SignOutButton";

export function Shell({ user, workspace, children }: { user: User; workspace: Workspace; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href={`/w/${workspace.id}`} className="flex items-center gap-3">
            <span className="flex gap-1">
              <span className="h-1.5 w-4 rounded-full bg-brand" />
              <span className="h-1.5 w-4 rounded-full bg-accent" />
              <span className="h-1.5 w-4 rounded-full bg-sun" />
            </span>
            <span className="font-semibold text-ink">Relay</span>
            <span className="text-sm text-slate">{workspace.name}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-body">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
