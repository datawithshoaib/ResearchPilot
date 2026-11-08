"use client";

import { motion } from "motion/react";
import { AlertCircle, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Separator } from "@/components/ui/separator";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { getSupabase } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";
type Pending = "email" | "google" | null;

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next);
  return url.toString();
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setPending("google");
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    // On success the browser is already on its way to Google.
    if (oauthError) {
      setError(oauthError.message);
      setPending(null);
    }
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("email");
    const supabase = getSupabase();

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // Full navigation so the proxy sees the new session cookie.
        window.location.assign(next);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl(next) },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        // Email confirmation is turned off for this project, so the user is already signed in.
        window.location.assign(next);
        return;
      }
      setConfirmationSentTo(email);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
    setPending(null);
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">ResearchPilot</span>
        </span>
        <ThemeToggle />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-1 flex-col justify-center py-10"
      >
        <h1 className="text-center text-4xl font-semibold tracking-[-0.03em]">
          {mode === "sign-in" ? "Welcome " : "Start your "}
          <span className="text-gradient font-serif font-normal tracking-normal italic">
            {mode === "sign-in" ? "back" : "research"}
          </span>
        </h1>
        <p className="text-muted-foreground mt-3 text-center text-sm">
          Sign in to run research and keep every brief in your history.
        </p>

        <SpotlightCard className="mt-8 p-6">
          {confirmationSentTo ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="size-8 text-[var(--brand-1)]" />
              <p className="font-medium">Check your inbox</p>
              <p className="text-muted-foreground text-sm">
                We sent a confirmation link to <span className="text-foreground">{confirmationSentTo}</span>.
                Open it to finish creating your account.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setConfirmationSentTo(null);
                  setMode("sign-in");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                disabled={pending !== null}
                onClick={() => void signInWithGoogle()}
              >
                {pending === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>

              <div className="text-muted-foreground my-5 flex items-center gap-3 text-xs">
                <Separator className="flex-1" />
                or with email
                <Separator className="flex-1" />
              </div>

              <Segmented
                ariaLabel="Sign in or create an account"
                value={mode}
                onChange={(value) => {
                  setMode(value);
                  setError(null);
                }}
                options={[
                  { value: "sign-in", label: "Sign in" },
                  { value: "sign-up", label: "Create account" },
                ]}
                disabled={pending !== null}
              />

              <form className="mt-5 space-y-4" onSubmit={(event) => void submitEmail(event)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    required
                    minLength={mode === "sign-up" ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "sign-up" ? "At least 8 characters" : undefined}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </p>
                )}

                <Button type="submit" className="h-10 w-full" disabled={pending !== null}>
                  {pending === "email" && <Loader2 className="animate-spin" />}
                  {mode === "sign-in" ? "Sign in" : "Create account"}
                  {pending !== "email" && <ArrowRight />}
                </Button>
              </form>
            </>
          )}
        </SpotlightCard>
      </motion.main>
    </div>
  );
}
