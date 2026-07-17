import { eq } from "drizzle-orm";
import {
  authRouteErrorResponse,
  constantTimeEqual,
  createSession,
  hashPassword,
  normalizeEmail,
  toAccessUser,
  validatePassword,
} from "../../../access-auth";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };
    const email = normalizeEmail(payload.email);
    const password = validatePassword(payload.password);

    if (!email || !password) {
      return invalidCredentialsResponse();
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return invalidCredentialsResponse();
    }

    const passwordHash = await hashPassword(password, user.passwordSalt);
    if (!constantTimeEqual(passwordHash, user.passwordHash)) {
      return invalidCredentialsResponse();
    }

    const cookie = await createSession(user.email);
    return Response.json(
      { user: toAccessUser(user.email) },
      { headers: { "Set-Cookie": cookie } },
    );
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}

function invalidCredentialsResponse() {
  return Response.json(
    { error: "Email o clave incorrectos." },
    { status: 401 },
  );
}
