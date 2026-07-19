import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const outfitRecords = sqliteTable(
  "outfit_records",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull().default(""),
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
    doubles: text("doubles").notNull().default(""),
    heating: text("heating").notNull().default("Sin calefaccion"),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("outfit_records_user_email_created_at_idx").on(
      table.userEmail,
      table.createdAt,
    ),
  ],
);

export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("sessions_user_email_idx").on(table.userEmail),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);
