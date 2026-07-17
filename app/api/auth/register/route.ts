import { eq } from "drizzle-orm";
import {
  authRouteErrorResponse,
  createSession,
  hashPassword,
  normalizeEmail,
  randomSalt,
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
      return Response.json(
        { error: "Usa un email valido y una clave de al menos 8 caracteres." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [existingUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return Response.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 },
      );
    }

    const passwordSalt = randomSalt();
    const passwordHash = await hashPassword(password, passwordSalt);

    await db.insert(users).values({
      email,
      passwordHash,
      passwordSalt,
    });

    const cookie = await createSession(email);
    return Response.json(
      { user: toAccessUser(email) },
      { status: 201, headers: { "Set-Cookie": cookie } },
    );
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
