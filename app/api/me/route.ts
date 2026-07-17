import {
  authErrorResponse,
  authRouteErrorResponse,
  getAccessUser,
} from "../../access-auth";

export async function GET(request: Request) {
  try {
    const user = await getAccessUser(request);
    if (!user) return authErrorResponse();

    return Response.json({ user });
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
