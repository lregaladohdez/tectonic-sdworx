import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/access";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const first = user.workspaceIds.at(0);
  redirect(first ? `/w/${first}` : "/login");
}
