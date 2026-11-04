import { Link, createFileRoute } from "@tanstack/react-router";
import { AccessPanel } from "@/components/access-panel";
import { Shell, useReadySession } from "@/components/shell";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, pending } = useReadySession();
  return (
    <Shell>
      <div className="max-w-sm py-8">
        <h1 className="text-2xl font-medium">Sign in</h1>
        <p className="mt-2 text-sm text-muted">The workspace is scoped to the person who signs in. The worker is not an account.</p>
        <div className="mt-6">
          {pending ? (
            <p className="text-sm text-muted">Checking session</p>
          ) : user ? (
            <p className="text-sm">
              You are signed in.{" "}
              <Link to="/" className="text-accent">
                Open the board
              </Link>
            </p>
          ) : (
            <AccessPanel />
          )}
        </div>
      </div>
    </Shell>
  );
}
