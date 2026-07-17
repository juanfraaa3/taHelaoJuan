import {
  authRouteErrorResponse,
  clearCurrentSession,
  clearSessionCookie,
} from "../../../access-auth";

export async function POST(request: Request) {
  try {
    await clearCurrentSession(request);

    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": clearSessionCookie() } },
    );
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
