import { FaGithub } from "react-icons/fa";

const AuthUser = () => {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
            G
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to GPT
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in to keep your conversations, history, and workspace in sync.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/github`}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <FaGithub className="size-6" />
            <span>Continue with GitHub</span>
          </a>

          <p className="mt-4 px-2 text-center text-xs leading-5 text-muted-foreground">
            You will be redirected to GitHub to finish authentication.
          </p>
        </div>
      </div>
    </main>
  );
};

export default AuthUser;
