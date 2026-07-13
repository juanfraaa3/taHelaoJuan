import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const outfitRecords = sqliteTable("outfit_records", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  temperature: real("temperature").notNull(),
  apparent: real("apparent").notNull(),
  humidity: real("humidity").notNull(),
  wind: real("wind").notNull(),
  gusts: real("gusts").notNull(),
  precipitation: real("precipitation").notNull(),
  cloudCover: real("cloud_cover").notNull(),
  weatherSource: text("weather_source").notNull(),
  upperBody: text("upper_body").notNull(),
  lowerBody: text("lower_body").notNull(),
  outerLayer: text("outer_layer").notNull(),
  shoes: text("shoes").notNull(),
  accessories: text("accessories").notNull().default(""),
  activity: text("activity").notNull(),
  indoorTime: text("indoor_time").notNull(),
  feeling: integer("feeling").notNull(),
  notes: text("notes").notNull().default(""),
});
