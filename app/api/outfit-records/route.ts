import { and, desc, eq } from "drizzle-orm";
import { authErrorResponse, getAccessUser } from "../../access-auth";
import { getDb } from "../../../db";
import { outfitRecords } from "../../../db/schema";

type WeatherData = {
  temperature: number;
  apparent: number;
  humidity: number;
  wind: number;
  gusts: number;
  precipitation: number;
  cloudCover: number;
  source: "automatic" | "manual";
  updatedAt: string;
};

type OutfitRecordPayload = {
  id?: string;
  createdAt?: string;
  weather?: Partial<WeatherData>;
  upperBody?: string;
  lowerBody?: string;
  outerLayer?: string;
  shoes?: string;
  accessories?: string;
  activity?: string;
  indoorTime?: string;
  feeling?: number;
  doubles?: string;
  heating?: string;
  medicalCondition?: string;
  notes?: string;
};

const outerLayerOptions = [
  "Chaqueta delgada",
  "Cortaviento",
  "Chaqueta abrigada",
  "Impermeable",
  "Abrigo grueso",
];

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitSelections(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveOuterLayer(upperBody: string, outerLayer: string) {
  if (outerLayer) return outerLayer;

  const selectedLayers = splitSelections(upperBody).filter((item) =>
    outerLayerOptions.includes(item),
  );

  return selectedLayers.length > 0
    ? selectedLayers.join(", ")
    : "Sin chaqueta";
}

function toClientRecord(row: typeof outfitRecords.$inferSelect) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    weather: {
      temperature: row.temperature,
      apparent: row.apparent,
      humidity: row.humidity,
      wind: row.wind,
      gusts: row.gusts,
      precipitation: row.precipitation,
      cloudCover: row.cloudCover,
      source: row.weatherSource === "automatic" ? "automatic" : "manual",
      updatedAt: row.createdAt,
    },
    upperBody: row.upperBody,
    lowerBody: row.lowerBody,
    outerLayer: row.outerLayer,
    shoes: row.shoes,
    accessories: row.accessories,
    activity: row.activity,
    indoorTime: row.indoorTime,
    feeling: row.feeling,
    doubles: row.doubles,
    heating: row.heating,
    medicalCondition: row.medicalCondition,
    notes: row.notes,
  };
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado";

  if (message.includes("no such table")) {
    return "La tabla de registros aun no esta disponible. Publica la version con la migracion de base de datos.";
  }

  if (message.includes("no such column") && message.includes("user_email")) {
    return "Falta aplicar la migracion de usuarios en la base de datos.";
  }

  if (message.includes("no such column") && message.includes("medical_condition")) {
    return "Falta aplicar la migracion de condicion medica en la base de datos.";
  }

  return message;
}

export async function GET(request: Request) {
  try {
    const user = await getAccessUser(request);
    if (!user) return authErrorResponse();

    const db = getDb();
    const rows = await db
      .select()
      .from(outfitRecords)
      .where(eq(outfitRecords.userEmail, user.email))
      .orderBy(desc(outfitRecords.createdAt))
      .limit(200);

    return Response.json({ records: rows.map(toClientRecord), user });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAccessUser(request);
    if (!user) return authErrorResponse();

    const payload = (await request.json()) as OutfitRecordPayload;
    const weather = payload.weather ?? {};
    const upperBody = toText(payload.upperBody);
    const lowerBody = toText(payload.lowerBody);
    const outerLayer = deriveOuterLayer(upperBody, toText(payload.outerLayer));
    const shoes = toText(payload.shoes);
    const activity = toText(payload.activity);
    const indoorTime = toText(payload.indoorTime);
    const heating = toText(payload.heating);
    const medicalCondition = toText(payload.medicalCondition) || "Sin condicion";
    const feeling = Math.max(-2, Math.min(2, toNumber(payload.feeling, 0)));

    if (
      !upperBody ||
      !lowerBody ||
      !shoes ||
      !activity ||
      !indoorTime ||
      !heating ||
      !medicalCondition
    ) {
      return Response.json(
        { error: "Completa ropa superior, inferior, calzado, actividad, ubicacion, calefaccion y condicion medica." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [record] = await db
      .insert(outfitRecords)
      .values({
        id: payload.id ?? crypto.randomUUID(),
        userEmail: user.email,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        temperature: toNumber(weather.temperature, 18),
        apparent: toNumber(weather.apparent, 18),
        humidity: toNumber(weather.humidity, 60),
        wind: toNumber(weather.wind),
        gusts: toNumber(weather.gusts),
        precipitation: toNumber(weather.precipitation),
        cloudCover: toNumber(weather.cloudCover),
        weatherSource: weather.source === "automatic" ? "automatic" : "manual",
        upperBody,
        lowerBody,
        outerLayer,
        shoes,
        accessories: toText(payload.accessories),
        activity: activity || "Sin actividad",
        indoorTime: indoorTime || "Sin detalle",
        feeling,
        doubles: toText(payload.doubles),
        heating,
        medicalCondition,
        notes: toText(payload.notes),
      })
      .returning();

    return Response.json(
      { record: toClientRecord(record), user },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAccessUser(request);
    if (!user) return authErrorResponse();

    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Falta el id del registro." }, { status: 400 });
    }

    const db = getDb();
    await db
      .delete(outfitRecords)
      .where(
        and(eq(outfitRecords.id, id), eq(outfitRecords.userEmail, user.email)),
      );

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}
