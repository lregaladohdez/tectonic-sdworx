import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceMember } from "@/lib/auth/access";
import { assertSameOrigin, errorResponse, limited, readJson } from "@/lib/http/guards";
import { getClaim, listPeople, setReview } from "@/relay/store";

const body = z.object({
  status: z.enum(["open", "accepted", "resolved", "asked"]),
  note: z.string().trim().max(500).optional(),
  personId: z.string().trim().max(50).optional(),
});

/** POST { status, note?, personId? } — records the human decision on a claim. */
export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string; claimId: string }> }) {
  try {
    assertSameOrigin(request);
    const { workspaceId, claimId } = await params;
    const { user } = await requireWorkspaceMember(workspaceId);
    const block = limited(`review:${user.id}`, 60, 60_000);
    if (block) return block;

    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    // Scoped lookups: a claim or person from another workspace is simply not found.
    if (!getClaim(workspaceId, claimId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (parsed.data.personId && !listPeople(workspaceId).some((p) => p.id === parsed.data.personId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (parsed.data.status === "asked" && !parsed.data.personId) {
      return NextResponse.json({ error: "personId is required to ask an expert" }, { status: 400 });
    }

    const review = setReview({ workspaceId, claimId, ...parsed.data, updatedBy: user.id });
    return NextResponse.json({ review });
  } catch (error) {
    return errorResponse(error);
  }
}
