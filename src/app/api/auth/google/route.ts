import { NextResponse } from "next/server";
import { oauthClient, GOOGLE_SCOPES } from "@/lib/google";

export async function GET() {
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token
    scope: GOOGLE_SCOPES,
  });
  return NextResponse.redirect(url);
}
