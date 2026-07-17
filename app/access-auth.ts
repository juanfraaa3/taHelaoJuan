import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";

export type AccessUser = {
  email: string;
  displayName: string;
};

const SESSION_COOKIE = "tahelaojuan_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 100000;

export function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.includes("@") && email.length <= 254 ? email : null;
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 128) return null;
  return value;
}

export async function getAccessUser(request: Request): Promise<AccessUser | null> {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, session.userEmail))
    .limit(1);

  return user ? toAccessUser(user.email) : null;
}

export async function createSession(email: string) {
  const db = getDb();
  const id = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id,
    userEmail: email,
    expiresAt: expiresAt.toISOString(),
  });

  return sessionCookie(id, expiresAt);
}

export async function clearCurrentSession(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return;

  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function authErrorResponse() {
  return Response.json(
    { error: "Inicia sesion para usar tus registros." },
    { status: 401 },
  );
}

export function authRouteErrorResponse(error: unknown) {
  return Response.json(
    { error: authRouteErrorMessage(error) },
    { status: 500 },
  );
}

export function toAccessUser(email: string): AccessUser {
  return {
    email,
    displayName: email.split("@")[0] || email,
  };
}

function authRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado.";

  if (message.includes("no such table") && message.includes("users")) {
    return "Falta aplicar la migracion de usuarios en la base de datos.";
  }

  if (message.includes("no such table") && message.includes("sessions")) {
    return "Falta aplicar la migracion de sesiones en la base de datos.";
  }

  return message;
}

export function randomSalt() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export function randomToken() {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );

  return encodeBase64Url(new Uint8Array(bits));
}

export function constantTimeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function getSessionId(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!match) return null;

  try {
    return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

function sessionCookie(id: string, expiresAt: Date) {
  return `${SESSION_COOKIE}=${encodeURIComponent(
    id,
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
