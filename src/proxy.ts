import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content Security Policy with a script nonce.
 *
 * Next reads the nonce out of the CSP *request* header set here and stamps it on
 * every script it emits (framework, page bundles, its own inline bootstrap), so
 * `script-src` needs neither 'unsafe-inline' nor a host allow-list: with
 * 'strict-dynamic' only scripts carrying the nonce, and scripts they load, run.
 *
 * `style-src` keeps 'unsafe-inline': React `style={{...}}` attributes (the score
 * bars, the Remotion player) cannot carry a nonce, and an attacker who can inject
 * CSS but not script gains little here. See SECURITY.md.
 *
 * All pages read the session cookie, so they render per request and the nonce is
 * fresh every time. Development adds 'unsafe-eval' for React's debug tooling.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except Next's static assets and the favicon; those carry no HTML.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
