import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (error.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError(error.message, 500);
  }
  return jsonError("Internal server error", 500);
}
