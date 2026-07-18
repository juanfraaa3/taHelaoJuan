import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { outfitRecords } from "../../../db/schema";

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado";

  if (message.includes("no such table")) {
    return "La tabla de registros aun no esta disponible.";
  }

  if (message.includes("Failed query")) {
    return "No pude leer respuestas comunitarias.";
  }

  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        createdAt: outfitRecords.createdAt,
        temperature: outfitRecords.temperature,
        apparent: outfitRecords.apparent,
        humidity: outfitRecords.humidity,
        wind: outfitRecords.wind,
        gusts: outfitRecords.gusts,
        precipitation: outfitRecords.precipitation,
        cloudCover: outfitRecords.cloudCover,
        weatherSource: outfitRecords.weatherSource,
        upperBody: outfitRecords.upperBody,
        lowerBody: outfitRecords.lowerBody,
        outerLayer: outfitRecords.outerLayer,
        shoes: outfitRecords.shoes,
        accessories: outfitRecords.accessories,
        activity: outfitRecords.activity,
        indoorTime: outfitRecords.indoorTime,
        feeling: outfitRecords.feeling,
      })
      .from(outfitRecords)
      .orderBy(desc(outfitRecords.createdAt))
      .limit(500);

    return Response.json(
      {
        samples: rows.map((row) => ({
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
        })),
        total: rows.length,
        comfortableCount: rows.filter((row) => row.feeling === 0).length,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error), samples: [] },
      { status: 500 },
    );
  }
}
