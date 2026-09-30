import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/access";
import { LoginForm } from "@/components/relay/LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex gap-1.5">
          <span className="h-2 w-6 rounded-full bg-brand" />
          <span className="h-2 w-6 rounded-full bg-accent" />
          <span className="h-2 w-6 rounded-full bg-sun" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Relay</h1>
        <p className="max-w-md text-body">
          Trust-verified client handovers. Find it, understand it, trust it.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
