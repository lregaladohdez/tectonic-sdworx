import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { env } from "@/lib/env";
import { findUserById, getWorkspace, isMember } from "@/relay/store";
import type { User, Workspace } from "@/relay/types";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** The logged-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const secret = env().SESSION_SECRET;
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token, secret);
  return payload ? (findUserById(payload.sub) ?? null) : null;
}

export class AccessError extends Error {
  constructor(public readonly status: 401 | 404) {
    super(status === 401 ? "Not signed in" : "Not found");
  }
}

/**
 * For route handlers. Throws AccessError(401) without a session and
 * AccessError(404) when the user is not a member (existence is not revealed).
 */
export async function requireWorkspaceMember(workspaceId: string): Promise<{ user: User; workspace: Workspace }> {
  const user = await getCurrentUser();
  if (!user) throw new AccessError(401);
  const workspace = getWorkspace(workspaceId);
  if (!workspace || !isMember(user, workspaceId)) throw new AccessError(404);
  return { user, workspace };
}

/** For pages. Redirects to /login without a session, 404s for non-members. */
export async function requireWorkspacePage(workspaceId: string): Promise<{ user: User; workspace: Workspace }> {
  try {
    return await requireWorkspaceMember(workspaceId);
  } catch (e) {
    if (e instanceof AccessError && e.status === 401) redirect("/login");
    notFound();
  }
}
