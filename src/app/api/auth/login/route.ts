import { NextRequest } from "next/server";
import { loginUser, createSession, COOKIE_NAME } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonError("Email and password are required");
    }

    const user = await loginUser(email, password);
    if (!user) {
      return jsonError("Invalid credentials", 401);
    }

    const token = await createSession(user);

    await logAudit("USER_LOGIN", { userId: user.id, details: user.email });

    const response = jsonOk({ user });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? `Login failed: ${error.message}`
        : "Login failed";
    return jsonError(message, 500);
  }
}
