// Use the SCOPED @googleapis/calendar package, NOT the `googleapis` mega-package.
// The mega-package dynamically loads every Google API (incl. ./docs) and fails to
// resolve when externalized under Next 16's Turbopack build on Vercel
// ("Cannot find module './docs'"). The scoped package ships only calendar + auth.
import { auth, calendar } from "@googleapis/calendar";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Google OAuth env vars. See .env.local.example");
  }
  return new auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function calendarClient(refreshToken: string) {
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return calendar({ version: "v3", auth: client });
}
