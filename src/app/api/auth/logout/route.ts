import { COOKIE_NAME } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function POST() {
  const response = jsonOk({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
