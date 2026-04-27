import { cookies } from "next/headers";
import { getIronSession, SessionOptions } from "iron-session";

export type SessionData = {
  google?: {
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
    email?: string;
  };
  spotify?: {
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
  };
  whoop?: {
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
  };
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD ?? "",
  cookieName: "pg-os-session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  },
};

export async function getSession() {
  const password = sessionOptions.password;
  if (!password || (typeof password === "string" && password.length < 32)) {
    throw new Error("SESSION_PASSWORD must be set (32+ chars). See .env.local.example");
  }
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}
