import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for Google OAuth and email-confirmation links: exchanges the
 * one-time `code` for a session cookie, then continues to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code && !providerError) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", providerError ?? "We couldn't complete sign-in. Please try again.");
  return NextResponse.redirect(loginUrl);
}
