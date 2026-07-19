"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type OutfitSample = {
  createdAt: string;
  weather: WeatherData;
  upperBody: string;
  lowerBody: string;
  outerLayer: string;
  shoes: string;
  accessories: string;
  activity: string;
  indoorTime: string;
  feeling: number;
  specificCold: string;
  doubles: string;
  heating: string;
  medicalCondition: string;
};

type ConditionContext = {
  weather: WeatherData;
  activity: string;
  indoorTime: string;
  sensitivity: string;
  timeOfDay: string;
  medicalCondition: string;
};

type Neighbor = {
  sample: OutfitSample;
  distance: number;
  weight: number;
  adjustedWarmth: number;
};

type OutfitPlan = {
  upper: string;
  lower: string;
  outer: string;
  shoes: string;
  accessories: string;
  note: string;
};

type Recommendation = {
  title: string;
  verdict: string;
  confidence: number;
  targetWarmth: number;
  plan: OutfitPlan;
  reasons: string[];
  risks: string[];
  neighbors: Neighbor[];
  closeCount: number;
  comfortRate: number;
  sourceLabel: string;
  trend: "cold" | "hot" | "balanced" | "base";
  communityCombos: CommunityCombo[];
};

type CommunityCombo = {
  key: string;
  support: number;
  comfortRate: number;
  score: number;
  warmth: number;
  upperBody: string;
  lowerBody: string;
  outerLayer: string;
  shoes: string;
  accessories: string;
  specificCold: string;
  doubles: string;
  heating: string;
  medicalCondition: string;
};

const STORAGE_KEY = "tahelaojuan-registros-v1";

const defaultWeather: WeatherData = {
  temperature: 18,
  apparent: 17,
  humidity: 65,
  wind: 8,
  gusts: 12,
  precipitation: 0,
  cloudCover: 45,
  source: "manual",
  updatedAt: new Date().toISOString(),
};

const activityOptions = [
  "Caminata suave",
  "Metro",
  "Micro",
  "Auto/taxi",
  "Ejercicio",
  "Estar quieto afuera sentado",
  "Estar quieto afuera parado",
];

const indoorTimeOptions = [
  "Al exterior",
  "Mitad exterior mitad interior",
  "Interior",
];

const sensitivityOptions = ["Balanceado", "Friolento", "Caluroso"];
const timeOfDayOptions = ["Manana", "Mediodia", "Tarde", "Noche"];
const medicalConditionOptions = [
  "Sin condicion",
  "Resfriado",
  "Congestion",
  "Dolor de garganta",
  "Fiebre",
  "Alergia",
  "Malestar general",
];

const activityAdjustment: Record<string, number> = {
  "Caminata suave": -0.4,
  Metro: 0.15,
  Micro: 0.1,
  "Auto/taxi": -0.5,
  "Transporte publico": 0.1,
  "Auto / taxi": -0.5,
  Ejercicio: -2,
  "Estar quieto afuera sentado": 1.45,
  "Estar quieto afuera parado": 1.15,
  "Estar quieto afuera": 1.3,
};

const indoorAdjustment: Record<string, number> = {
  "Al exterior": 1,
  "Mitad exterior mitad interior": 0,
  Interior: -0.9,
  "Principalmente exterior": 1,
  "Mitad interior / mitad exterior": 0,
  "Principalmente interior": -0.9,
};

const sensitivityAdjustment: Record<string, number> = {
  Balanceado: 0,
  Friolento: 1.2,
  Caluroso: -1.2,
};

const timeAdjustment: Record<string, number> = {
  Manana: 0.7,
  Mediodia: -0.5,
  Tarde: 0,
  Noche: 0.8,
};

const medicalConditionAdjustment: Record<string, number> = {
  "Sin condicion": 0,
  Resfriado: 0.55,
  Congestion: 0.35,
  "Dolor de garganta": 0.45,
  Fiebre: 0.25,
  Alergia: 0,
  "Malestar general": 0.4,
};

const upperWarmth = [
  ["primera capa", 3.6],
  ["poleron", 3.2],
  ["sweater", 2.8],
  ["manga larga", 2],
  ["camisa", 1.8],
  ["manga corta", 1],
  ["polera", 1],
] as const;

const lowerWarmth = [
  ["termico", 3.4],
  ["buzo", 2.3],
  ["jeans", 2.1],
  ["tela", 1.8],
  ["short", 0.7],
] as const;

const outerWarmth = [
  ["abrigo grueso", 4],
  ["abrigada", 3.4],
  ["impermeable", 2],
  ["cortaviento", 1.8],
  ["delgada", 1.4],
  ["sin chaqueta", 0],
] as const;

const shoesWarmth = [
  ["impermeables", 2],
  ["bototos", 2],
  ["cerrados", 1.5],
  ["abiertos", 0.65],
  ["zapatillas", 1.1],
  ["sandalias", 0.4],
  ["descalzo", 0],
] as const;

const coverageCases = [
  { label: "Bajo 0°", apparent: -2, wind: 18, rain: 0, activity: "Estar quieto afuera" },
  { label: "0° a 6°", apparent: 4, wind: 12, rain: 0, activity: "Caminata suave" },
  { label: "7° a 12°", apparent: 10, wind: 10, rain: 0, activity: "Caminata suave" },
  { label: "13° a 17°", apparent: 15, wind: 8, rain: 0, activity: "Caminata suave" },
  { label: "18° a 22°", apparent: 20, wind: 8, rain: 0, activity: "Caminata suave" },
  { label: "23° a 27°", apparent: 25, wind: 8, rain: 0, activity: "Caminata suave" },
  { label: "28° o mas", apparent: 31, wind: 6, rain: 0, activity: "Caminata suave" },
  { label: "Lluvia", apparent: 14, wind: 14, rain: 1.2, activity: "Caminata suave" },
  { label: "Viento fuerte", apparent: 15, wind: 28, rain: 0, activity: "Caminata suave" },
  { label: "Ejercicio", apparent: 16, wind: 8, rain: 0, activity: "Ejercicio" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value: number, digits = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function splitSelections(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function weatherIsRainy(weather: WeatherData) {
  return weather.precipitation >= 0.2 || weather.cloudCover >= 90;
}

function isMostlyOutside(indoorTime: string) {
  return indoorTime !== "Interior" && indoorTime !== "Principalmente interior";
}

function hasMedicalCondition(medicalCondition: string) {
  return normalize(medicalCondition) !== "sin condicion";
}

function hasFever(medicalCondition: string) {
  return normalize(medicalCondition).includes("fiebre");
}

function optionWarmth(value: string, rules: readonly (readonly [string, number])[], fallback: number) {
  const normalizedValue = normalize(value);
  const match = rules.find(([label]) => normalizedValue.includes(label));
  return match?.[1] ?? fallback;
}

function accessoryWarmth(accessories: string) {
  const normalizedValue = normalize(accessories);
  let score = 0;

  if (normalizedValue.includes("gorro")) score += 0.5;
  if (normalizedValue.includes("bufanda")) score += 0.55;
  if (normalizedValue.includes("guantes")) score += 0.55;
  if (normalizedValue.includes("paraguas")) score += 0.15;

  return score;
}

function doublesWarmth(doubles: string) {
  const normalizedValue = normalize(doubles);
  let score = 0;

  if (normalizedValue.includes("doble calcetin")) score += 0.35;
  if (normalizedValue.includes("doble polera")) score += 0.55;
  if (normalizedValue.includes("doble poleron")) score += 0.9;
  if (normalizedValue.includes("doble pantalon")) score += 0.75;

  return score;
}

function buildSpecificColdRisks(neighbors: Neighbor[]) {
  const areaWeights = new Map<string, number>();

  neighbors
    .filter((neighbor) => neighbor.distance <= 4.2 && neighbor.sample.feeling < 0)
    .forEach((neighbor) => {
      splitSelections(neighbor.sample.specificCold).forEach((area) => {
        const normalizedArea = normalize(area);
        const weight = neighbor.weight * Math.abs(neighbor.sample.feeling);

        if (normalizedArea.includes("manos")) {
          areaWeights.set("manos", (areaWeights.get("manos") ?? 0) + weight);
        }
        if (normalizedArea.includes("pies")) {
          areaWeights.set("pies", (areaWeights.get("pies") ?? 0) + weight);
        }
        if (normalizedArea.includes("piernas")) {
          areaWeights.set("piernas", (areaWeights.get("piernas") ?? 0) + weight);
        }
        if (normalizedArea.includes("torso") || normalizedArea.includes("espalda")) {
          areaWeights.set("torso", (areaWeights.get("torso") ?? 0) + weight);
        }
      });
    });

  const adviceByArea: Record<string, string> = {
    manos: "En dias parecidos aparecio frio en manos: considera guantes o bolsillo/abrigo con buen cierre.",
    pies: "En dias parecidos aparecio frio en pies: prioriza zapatos cerrados y doble calcetin si estaras afuera.",
    piernas: "En dias parecidos aparecio frio en piernas: sube a pantalon mas grueso o agrega doble pantalon.",
    torso: "En dias parecidos aparecio frio en torso/espalda: suma primera capa o sweater bajo la chaqueta.",
  };

  return [...areaWeights.entries()]
    .filter(([, weight]) => weight >= 0.18)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([area]) => adviceByArea[area]);
}

function inferOutfitWarmth(sample: OutfitSample) {
  return (
    optionWarmth(sample.upperBody, upperWarmth, 1.8) +
    optionWarmth(sample.lowerBody, lowerWarmth, 1.8) +
    optionWarmth(sample.outerLayer, outerWarmth, 1.5) +
    optionWarmth(sample.shoes, shoesWarmth, 1.1) +
    accessoryWarmth(sample.accessories) +
    doublesWarmth(sample.doubles)
  );
}

function targetWarmthForConditions(context: ConditionContext) {
  const { weather, activity, indoorTime, sensitivity, timeOfDay, medicalCondition } = context;
  let target = 7.9 - weather.apparent * 0.23;

  if (weather.apparent < 0) target += 0.8;
  if (weather.apparent >= 28) target -= 0.8;
  if (weather.wind >= 28) target += 1.1;
  else if (weather.wind >= 18) target += 0.7;
  else if (weather.wind >= 12) target += 0.25;
  if (weatherIsRainy(weather) && isMostlyOutside(indoorTime)) target += 0.45;
  if (weather.humidity >= 82 && weather.apparent <= 12) target += 0.3;
  if (weather.humidity >= 70 && weather.apparent >= 23) target -= 0.55;

  target += activityAdjustment[activity] ?? 0;
  target += indoorAdjustment[indoorTime] ?? 0;
  target += sensitivityAdjustment[sensitivity] ?? 0;
  target += timeAdjustment[timeOfDay] ?? 0;
  target += medicalConditionAdjustment[medicalCondition] ?? 0;

  return clamp(target, 0.8, 9.8);
}

function timeBucketFromDate(value: string) {
  const date = new Date(value);
  const hour = date.getHours();

  if (!Number.isFinite(hour)) return "Tarde";
  if (hour < 11) return "Manana";
  if (hour < 16) return "Mediodia";
  if (hour < 21) return "Tarde";
  return "Noche";
}

function activityGroup(activity: string) {
  if (activity === "Metro" || activity === "Micro" || activity === "Transporte publico") {
    return "transporte";
  }

  if (activity === "Auto/taxi" || activity === "Auto / taxi") return "auto";
  if (activity === "Ejercicio") return "ejercicio";
  if (activity.includes("quieto afuera")) return "quieto-afuera";
  return "movimiento-suave";
}

function indoorGroup(indoorTime: string) {
  if (indoorTime === "Al exterior" || indoorTime === "Principalmente exterior") {
    return "exterior";
  }

  if (
    indoorTime === "Mitad exterior mitad interior" ||
    indoorTime === "Mitad interior / mitad exterior"
  ) {
    return "mixto";
  }

  return "interior";
}

function sampleDistance(sample: OutfitSample, context: ConditionContext) {
  const { weather, activity, indoorTime, timeOfDay, medicalCondition } = context;
  const sampleWeather = sample.weather;
  const rainGap = weatherIsRainy(weather) === weatherIsRainy(sampleWeather) ? 0 : 0.75;
  const activityGap =
    activityGroup(sample.activity) === activityGroup(activity)
      ? sample.activity === activity
        ? 0
        : 0.18
      : activity === "Ejercicio" || sample.activity === "Ejercicio"
        ? 1.1
        : 0.45;
  const indoorGap =
    indoorGroup(sample.indoorTime) === indoorGroup(indoorTime) ? 0 : 0.45;
  const timeGap = timeBucketFromDate(sample.createdAt) === timeOfDay ? 0 : 0.25;
  const sampleMedicalCondition = sample.medicalCondition || "Sin condicion";
  const medicalGap =
    sampleMedicalCondition === medicalCondition
      ? 0
      : hasMedicalCondition(sampleMedicalCondition) && hasMedicalCondition(medicalCondition)
        ? 0.28
        : 0.5;

  return (
    Math.abs(weather.apparent - sampleWeather.apparent) / 5.5 +
    Math.abs(weather.temperature - sampleWeather.temperature) / 12 +
    Math.abs(weather.humidity - sampleWeather.humidity) / 45 +
    Math.abs(weather.wind - sampleWeather.wind) / 18 +
    Math.abs(weather.precipitation - sampleWeather.precipitation) / 3 +
    rainGap +
    activityGap +
    indoorGap +
    timeGap +
    medicalGap
  );
}

function recencyWeight(createdAt: string) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  return clamp(1 - ageDays / 365, 0.55, 1);
}

function sampleWeight(sample: OutfitSample, distance: number) {
  return (1 / (1 + distance * distance)) * recencyWeight(sample.createdAt);
}

function readLocalSamples() {
  if (typeof window === "undefined") return [];

  const samples: OutfitSample[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(STORAGE_KEY)) continue;

    try {
      const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      if (!Array.isArray(value)) continue;

      value.forEach((item) => {
        const record = item as OutfitSample;
        if (
          record?.weather &&
          typeof record.createdAt === "string" &&
          typeof record.upperBody === "string" &&
          typeof record.lowerBody === "string" &&
          typeof record.outerLayer === "string" &&
          typeof record.shoes === "string"
        ) {
          samples.push({
            createdAt: record.createdAt,
            weather: {
              temperature: safeNumber(record.weather.temperature, 18),
              apparent: safeNumber(record.weather.apparent, 18),
              humidity: safeNumber(record.weather.humidity, 60),
              wind: safeNumber(record.weather.wind, 0),
              gusts: safeNumber(record.weather.gusts, 0),
              precipitation: safeNumber(record.weather.precipitation, 0),
              cloudCover: safeNumber(record.weather.cloudCover, 45),
              source: record.weather.source === "automatic" ? "automatic" : "manual",
              updatedAt: record.weather.updatedAt || record.createdAt,
            },
            upperBody: record.upperBody,
            lowerBody: record.lowerBody,
            outerLayer: record.outerLayer,
            shoes: record.shoes,
            accessories: record.accessories || "",
            activity: record.activity || "Caminata suave",
            indoorTime: record.indoorTime || "Mitad exterior mitad interior",
            feeling: clamp(safeNumber(record.feeling, 0), -2, 2),
            specificCold: record.specificCold || "",
            doubles: record.doubles || "",
            heating: record.heating || "Sin calefaccion",
            medicalCondition: record.medicalCondition || "Sin condicion",
          });
        }
      });
    } catch {
      continue;
    }
  }

  return samples;
}

function dedupeSamples(samples: OutfitSample[]) {
  const seen = new Set<string>();

  return samples.filter((sample) => {
    const key = [
      sample.createdAt,
      sample.weather.apparent,
      sample.upperBody,
      sample.lowerBody,
      sample.outerLayer,
      sample.shoes,
      sample.specificCold || "",
      sample.doubles,
      sample.heating,
      sample.medicalCondition || "Sin condicion",
      sample.feeling,
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeOutfitPlan(context: ConditionContext, targetWarmth: number): OutfitPlan {
  const { weather, activity, indoorTime, timeOfDay, medicalCondition } = context;
  const rainy = weatherIsRainy(weather) && isMostlyOutside(indoorTime);
  const windy = weather.wind >= 18 && isMostlyOutside(indoorTime);
  const hot = weather.apparent >= 26;
  const exercise = activity === "Ejercicio";
  const medicalSensitive = hasMedicalCondition(medicalCondition);
  const mostlyIndoor =
    indoorTime === "Interior" || indoorTime === "Principalmente interior";
  let upper = "Polera";
  let lower = "Jeans liviano";
  let outer = "Sin chaqueta";
  let shoes = "Zapatillas";

  if (exercise) {
    upper = weather.apparent <= 8 ? "Polera manga larga respirable" : "Polera respirable";
    lower = weather.apparent <= 8 ? "Buzo liviano" : "Short o buzo liviano";
    outer = rainy ? "Impermeable liviano" : windy ? "Cortaviento liviano" : "Sin chaqueta";
    shoes = "Zapatillas";
  } else if (targetWarmth >= 8.2) {
    upper = "Primera capa + poleron";
    lower = "Pantalon termico";
    outer = rainy ? "Impermeable sobre abrigo grueso" : "Abrigo grueso";
    shoes = rainy ? "Zapatos impermeables" : "Bototos o zapatos cerrados";
  } else if (targetWarmth >= 6.7) {
    upper = "Polera manga larga + sweater";
    lower = "Jeans o pantalon de tela";
    outer = rainy ? "Impermeable abrigado" : windy ? "Chaqueta abrigada con cortaviento" : "Chaqueta abrigada";
    shoes = rainy ? "Zapatos impermeables" : "Zapatos cerrados";
  } else if (targetWarmth >= 5.2) {
    upper = "Polera + poleron";
    lower = "Jeans";
    outer = rainy ? "Impermeable o cortaviento" : windy ? "Cortaviento" : "Chaqueta delgada";
    shoes = rainy ? "Zapatos impermeables" : "Zapatillas o zapatos cerrados";
  } else if (targetWarmth >= 3.7) {
    upper = "Polera manga larga o camisa";
    lower = "Jeans o pantalon liviano";
    outer = rainy ? "Impermeable liviano" : windy || timeOfDay !== "Mediodia" ? "Chaqueta delgada opcional" : "Sin chaqueta";
    shoes = rainy ? "Zapatos impermeables" : "Zapatillas";
  } else if (targetWarmth >= 2.3) {
    upper = hot ? "Polera respirable" : "Polera";
    lower = hot ? "Short o pantalon liviano" : "Jeans liviano";
    outer = rainy ? "Impermeable liviano" : timeOfDay === "Manana" || timeOfDay === "Noche" ? "Capa liviana opcional" : "Sin chaqueta";
    shoes = rainy ? "Zapatos impermeables" : "Zapatillas";
  } else {
    upper = "Polera respirable";
    lower = "Short o pantalon muy liviano";
    outer = rainy ? "Impermeable liviano" : "Sin chaqueta";
    shoes = rainy ? "Zapatos impermeables" : "Sandalias o zapatillas";
  }

  if (mostlyIndoor && !rainy && !exercise && targetWarmth < 7.5) {
    outer = targetWarmth >= 4.8 ? "Capa liviana facil de sacar" : "Sin chaqueta";
  }

  const accessories: string[] = [];
  if (targetWarmth >= 8) accessories.push("Gorro", "bufanda", "guantes");
  else if (targetWarmth >= 6.6 && isMostlyOutside(indoorTime)) accessories.push("Gorro o bufanda");
  if (rainy) accessories.push("paraguas");
  if (hot && weather.cloudCover <= 60) accessories.push("lentes");
  if (medicalSensitive && !hot && isMostlyOutside(indoorTime)) {
    accessories.push(hasFever(medicalCondition) ? "capa facil de sacar" : "bufanda opcional");
  }

  const note = medicalSensitive
    ? "Como registraste condicion medica, usa capas removibles y evita quedar pasado de calor."
    : mostlyIndoor
      ? "Prioriza capas que puedas sacar rapido al entrar."
      : rainy
        ? "La capa exterior manda: que corte agua antes que sumar volumen."
        : windy
          ? "El viento cambia la sensacion; conviene bloquearlo por fuera."
          : exercise
            ? "Empieza un poco fresco: al moverte vas a subir temperatura."
            : "La combinacion busca margen sin quedar pasado de abrigo.";

  return {
    upper,
    lower,
    outer,
    shoes,
    accessories: accessories.length > 0 ? accessories.join(", ") : "Sin accesorios obligatorios",
    note,
  };
}

function groupCommunityCombos(neighbors: Neighbor[], targetWarmth: number) {
  const groups = new Map<string, CommunityCombo>();

  neighbors
    .filter((neighbor) => neighbor.distance <= 4.2)
    .slice(0, 90)
    .forEach((neighbor) => {
      const sample = neighbor.sample;
      const accessories = sample.accessories.trim() || "Sin accesorios";
      const specificCold = sample.specificCold.trim() || "Sin frio especifico";
      const doubles = sample.doubles.trim() || "Sin dobles";
      const heating = sample.heating.trim() || "Sin calefaccion";
      const medicalCondition = sample.medicalCondition.trim() || "Sin condicion";
      const key = [
        sample.upperBody,
        sample.lowerBody,
        sample.outerLayer,
        sample.shoes,
        accessories,
        specificCold,
        doubles,
        heating,
        medicalCondition,
      ].join("|");
      const comfortFactor =
        sample.feeling === 0 ? 1.15 : Math.abs(sample.feeling) === 1 ? 0.72 : 0.36;
      const warmthFit = clamp(1 - Math.abs(neighbor.adjustedWarmth - targetWarmth) / 5, 0.2, 1);
      const score = neighbor.weight * comfortFactor * warmthFit;
      const current = groups.get(key);

      if (current) {
        current.support += 1;
        current.score += score;
        current.comfortRate += sample.feeling === 0 ? 1 : 0;
        current.warmth += neighbor.adjustedWarmth;
        return;
      }

      groups.set(key, {
        key,
        support: 1,
        comfortRate: sample.feeling === 0 ? 1 : 0,
        score,
        warmth: neighbor.adjustedWarmth,
        upperBody: sample.upperBody,
        lowerBody: sample.lowerBody,
        outerLayer: sample.outerLayer,
        shoes: sample.shoes,
        accessories,
        specificCold,
        doubles,
        heating,
        medicalCondition,
      });
    });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      comfortRate: Math.round((group.comfortRate / group.support) * 100),
      warmth: group.warmth / group.support,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildRecommendation(samples: OutfitSample[], context: ConditionContext): Recommendation {
  const baseWarmth = targetWarmthForConditions(context);
  const neighbors = samples
    .map((sample) => {
      const distance = sampleDistance(sample, context);
      const weight = sampleWeight(sample, distance);
      const adjustedWarmth = inferOutfitWarmth(sample) - sample.feeling * 0.85;

      return { sample, distance, weight, adjustedWarmth };
    })
    .sort((a, b) => a.distance - b.distance);
  const usedNeighbors = neighbors.slice(0, 80);
  const totalWeight = usedNeighbors.reduce((total, neighbor) => total + neighbor.weight, 0);
  const crowdWarmth =
    totalWeight > 0
      ? usedNeighbors.reduce(
          (total, neighbor) => total + neighbor.adjustedWarmth * neighbor.weight,
          0,
        ) / totalWeight
      : baseWarmth;
  const historyBlend = samples.length > 0 ? clamp(totalWeight / 8, 0, 0.72) : 0;
  const targetWarmth = baseWarmth * (1 - historyBlend) + crowdWarmth * historyBlend;
  const closeNeighbors = usedNeighbors.filter((neighbor) => neighbor.distance <= 2.8);
  const comfortWeight = usedNeighbors.reduce(
    (total, neighbor) => total + (neighbor.sample.feeling === 0 ? neighbor.weight : 0),
    0,
  );
  const comfortRate = totalWeight > 0 ? Math.round((comfortWeight / totalWeight) * 100) : 0;
  const coldSignal = usedNeighbors.reduce(
    (total, neighbor) =>
      total + (neighbor.sample.feeling < 0 ? Math.abs(neighbor.sample.feeling) * neighbor.weight : 0),
    0,
  );
  const hotSignal = usedNeighbors.reduce(
    (total, neighbor) =>
      total + (neighbor.sample.feeling > 0 ? neighbor.sample.feeling * neighbor.weight : 0),
    0,
  );
  const trend =
    samples.length === 0
      ? "base"
      : coldSignal > hotSignal * 1.25
        ? "cold"
        : hotSignal > coldSignal * 1.25
          ? "hot"
          : "balanced";
  const confidence = Math.round(
    clamp(
      24 +
        Math.min(26, samples.length * 0.8) +
        Math.min(24, closeNeighbors.length * 5) +
        Math.min(16, totalWeight * 2.4) +
        (comfortRate >= 55 ? 6 : 0),
      18,
      94,
    ),
  );
  const plan = makeOutfitPlan(context, targetWarmth);
  const rainy = weatherIsRainy(context.weather) && isMostlyOutside(context.indoorTime);
  const windy = context.weather.wind >= 18 && isMostlyOutside(context.indoorTime);
  const medicalSensitive = hasMedicalCondition(context.medicalCondition);
  const title = rainy
    ? "Prioriza capa impermeable"
    : medicalSensitive
      ? "Cuida el margen termico"
      : context.activity === "Ejercicio"
        ? "Ve liviano para moverte"
        : targetWarmth >= 7.6
          ? "Abrigate fuerte"
          : targetWarmth >= 5.6
            ? "Usa capas"
            : targetWarmth >= 3.6
              ? "Capa liviana opcional"
              : "Ve liviano";
  const sourceLabel =
    samples.length === 0
      ? "modelo general"
      : `${samples.length} respuestas anonimas`;
  const verdict =
    `Con ${roundNumber(context.weather.apparent, 0)}° de sensacion y ${context.activity.toLowerCase()}, ` +
    `${plan.upper.toLowerCase()}, ${plan.lower.toLowerCase()} y ${plan.outer.toLowerCase()} es la apuesta mas estable.`;
  const reasons = [
    `Sensacion ${roundNumber(context.weather.apparent, 0)}° con ${roundNumber(context.weather.wind, 0)} km/h de viento.`,
    context.indoorTime === "Interior" ||
    context.indoorTime === "Principalmente interior"
      ? "Vas a pasar mas tiempo adentro, asi que pesa mas la comodidad sin capa exterior."
      : "Vas a exponerte al exterior, asi que la capa externa pesa mas.",
    samples.length === 0
      ? "Sin respuestas previas: se usa aproximacion por clima, actividad y exposicion."
      : closeNeighbors.length > 0
        ? `${closeNeighbors.length} respuestas quedaron muy cerca de esta combinacion de clima.`
        : "Hay respuestas guardadas, pero ninguna calza perfecto con este clima.",
  ];
  const risks = [
    confidence < 48
      ? "Confianza baja: registra esta salida para corregir el modelo."
      : `Confianza ${confidence}%: suficiente para decidir, pero sigue siendo aproximacion.`,
  ];
  const specificColdRisks = buildSpecificColdRisks(usedNeighbors);

  if (trend === "cold") {
    reasons.push("Las respuestas parecidas muestran mas frio que calor.");
    risks.push("Si dudas entre dos capas, toma la mas facil de quitar.");
  } else if (trend === "hot") {
    reasons.push("Las respuestas parecidas muestran mas calor que frio.");
    risks.push("Evita capas pesadas sin ventilacion.");
  } else if (trend === "balanced") {
    reasons.push(`En respuestas parecidas, ${comfortRate}% termino comodo.`);
  }

  if (rainy) risks.push("Lluvia probable: cambia a calzado impermeable si caminaras mas de unas cuadras.");
  if (windy) risks.push("Viento relevante: una prenda delgada que bloquee viento rinde mas que sumar grosor.");
  risks.push(...specificColdRisks);
  if (medicalSensitive) {
    reasons.push(`${context.medicalCondition}: el modelo suma un margen moderado de abrigo.`);
    risks.push("Condicion medica marcada: prioriza capas removibles y ajusta segun como te sientas.");
  }
  if (context.weather.humidity >= 75 && context.weather.apparent >= 23) {
    risks.push("Humedad alta con calor: usa telas respirables y reduce capas.");
  }

  return {
    title,
    verdict,
    confidence,
    targetWarmth,
    plan,
    reasons,
    risks,
    neighbors: usedNeighbors,
    closeCount: closeNeighbors.length,
    comfortRate,
    sourceLabel,
    trend,
    communityCombos: groupCommunityCombos(usedNeighbors, targetWarmth),
  };
}

function buildScenarioPlans(context: ConditionContext) {
  const scenarios = [
    {
      label: "Exterior largo",
      context: { ...context, indoorTime: "Al exterior" },
    },
    {
      label: "Interior largo",
      context: { ...context, indoorTime: "Interior" },
    },
    {
      label: "Lluvia",
      context: {
        ...context,
        weather: {
          ...context.weather,
          precipitation: Math.max(context.weather.precipitation, 1.2),
          cloudCover: Math.max(context.weather.cloudCover, 92),
        },
      },
    },
    {
      label: "Viento fuerte",
      context: {
        ...context,
        weather: {
          ...context.weather,
          wind: Math.max(context.weather.wind, 28),
          gusts: Math.max(context.weather.gusts, 36),
        },
      },
    },
    {
      label: "Ejercicio",
      context: { ...context, activity: "Ejercicio" },
    },
    {
      label: "Noche",
      context: {
        ...context,
        timeOfDay: "Noche",
        weather: {
          ...context.weather,
          apparent: context.weather.apparent - 2,
          temperature: context.weather.temperature - 2,
        },
      },
    },
    {
      label: "Resfriado",
      context: { ...context, medicalCondition: "Resfriado" },
    },
  ];

  return scenarios.map((scenario) => {
    const warmth = targetWarmthForConditions(scenario.context);
    const plan = makeOutfitPlan(scenario.context, warmth);

    return {
      label: scenario.label,
      warmth,
      main: `${plan.upper} + ${plan.outer}`,
      support: plan.shoes,
    };
  });
}

function buildCoverageRows(context: ConditionContext) {
  return coverageCases.map((item) => {
    const weather = {
      ...context.weather,
      temperature: item.apparent,
      apparent: item.apparent,
      wind: item.wind,
      gusts: Math.max(context.weather.gusts, item.wind + 6),
      precipitation: item.rain,
      cloudCover: item.rain > 0 ? 92 : context.weather.cloudCover,
    };
    const rowContext = {
      ...context,
      weather,
      activity: item.activity,
      indoorTime:
        item.rain > 0 || item.wind >= 24 ? "Al exterior" : context.indoorTime,
    };
    const warmth = targetWarmthForConditions(rowContext);
    const plan = makeOutfitPlan(rowContext, warmth);

    return {
      label: item.label,
      outfit: `${plan.upper}; ${plan.outer}`,
      shoes: plan.shoes,
    };
  });
}

function SegmentGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="use-segment-group">
      <p>{label}</p>
      <div>
        {options.map((option) => (
          <button
            className={selected === option ? "active" : ""}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QueUsarPage() {
  const [samples, setSamples] = useState<OutfitSample[]>([]);
  const [sampleStatus, setSampleStatus] = useState("Cargando respuestas...");
  const [weatherStatus, setWeatherStatus] = useState("Clima manual listo.");
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [activity, setActivity] = useState(activityOptions[0]);
  const [indoorTime, setIndoorTime] = useState(indoorTimeOptions[1]);
  const [sensitivity, setSensitivity] = useState(sensitivityOptions[0]);
  const [timeOfDay, setTimeOfDay] = useState(timeOfDayOptions[2]);
  const [medicalCondition, setMedicalCondition] = useState(medicalConditionOptions[0]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const didAutoCaptureWeather = useRef(false);

  useEffect(() => {
    async function loadSamples() {
      const localSamples = readLocalSamples();

      try {
        const response = await fetch("/api/outfit-insights", { cache: "no-store" });
        const data = (await response.json()) as {
          samples?: OutfitSample[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No pude cargar respuestas.");
        }

        const remoteSamples = Array.isArray(data.samples) ? data.samples : [];
        const nextSamples = dedupeSamples([...remoteSamples, ...localSamples]);
        setSamples(nextSamples);

        if (remoteSamples.length > 0 && localSamples.length > 0) {
          setSampleStatus(
            `${remoteSamples.length} respuestas comunitarias + ${localSamples.length} de este navegador.`,
          );
        } else if (remoteSamples.length > 0) {
          setSampleStatus(`${remoteSamples.length} respuestas comunitarias anonimas.`);
        } else if (localSamples.length > 0) {
          setSampleStatus(`${localSamples.length} respuestas de este navegador.`);
        } else {
          setSampleStatus("Sin respuestas todavia. Usando aproximacion general.");
        }
      } catch (error) {
        setSamples(localSamples);
        setSampleStatus(
          localSamples.length > 0
            ? `${localSamples.length} respuestas locales. La nube no respondio.`
            : error instanceof Error
              ? `${error.message} Usando aproximacion general.`
              : "Usando aproximacion general.",
        );
      }
    }

    loadSamples();
  }, []);

  const context = useMemo(
    () => ({
      weather,
      activity,
      indoorTime,
      sensitivity,
      timeOfDay,
      medicalCondition,
    }),
    [weather, activity, indoorTime, sensitivity, timeOfDay, medicalCondition],
  );
  const recommendation = useMemo(
    () => buildRecommendation(samples, context),
    [samples, context],
  );
  const scenarios = useMemo(() => buildScenarioPlans(context), [context]);
  const coverageRows = useMemo(() => buildCoverageRows(context), [context]);

  function updateWeather(field: keyof WeatherData, value: string) {
    const nextValue = safeNumber(value, 0);
    setWeather((current) => ({
      ...current,
      [field]: nextValue,
      source: "manual",
      updatedAt: new Date().toISOString(),
    }));
    setWeatherStatus("Clima manual actualizado.");
  }

  const captureWeather = useCallback((mode: "auto" | "manual" = "manual") => {
    if (!navigator.geolocation) {
      setWeatherStatus("Tu navegador no entrega ubicacion.");
      return;
    }

    setIsLoadingWeather(true);
    setWeatherStatus(
      mode === "auto"
        ? "Actualizando clima actual automaticamente..."
        : "Buscando clima actual...",
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const params = new URLSearchParams({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          current:
            "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m",
          timezone: "auto",
        });

        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          );

          if (!response.ok) throw new Error("No pude obtener el clima.");

          const data = await response.json();
          const current = data.current;

          setWeather({
            temperature: roundNumber(current.temperature_2m),
            apparent: roundNumber(current.apparent_temperature),
            humidity: roundNumber(current.relative_humidity_2m, 0),
            wind: roundNumber(current.wind_speed_10m),
            gusts: roundNumber(current.wind_gusts_10m),
            precipitation: roundNumber(current.precipitation),
            cloudCover: roundNumber(current.cloud_cover, 0),
            source: "automatic",
            updatedAt: new Date().toISOString(),
          });
          setWeatherStatus("Clima automatico actualizado.");
        } catch (error) {
          setWeatherStatus(error instanceof Error ? error.message : "Error inesperado.");
        } finally {
          setIsLoadingWeather(false);
        }
      },
      () => {
        setWeatherStatus("No se autorizo la ubicacion.");
        setIsLoadingWeather(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  useEffect(() => {
    if (didAutoCaptureWeather.current) return;

    didAutoCaptureWeather.current = true;
    captureWeather("auto");
  }, [captureWeather]);

  return (
    <main className="use-page min-h-screen bg-[#f8fafc] text-[#172018]">
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <Link className="navbar-brand" href="/">
            <span className="navbar-brand-logo" aria-hidden="true" />
            <span className="navbar-brand-label">taHelaoJuan</span>
          </Link>

          <nav className="navbar-links" aria-label="Principal">
            <Link href="/">Inicio</Link>
            <Link aria-current="page" className="is-current" href="/que-usar">
              Que usar
            </Link>
            <Link href="/clima">Clima</Link>
            <Link href="/#historial">Historial</Link>
          </nav>

          <div className="navbar-actions">
            <Link className="primary-button compact" href="/">
              Registrar
            </Link>
          </div>
        </div>
      </header>

      <section className="use-hero">
        <div className="use-hero-copy">
          <p className="eyebrow">Que usar</p>
          <h1>{recommendation.title}</h1>
          <p>{recommendation.verdict}</p>

          <div className="use-hero-metrics" aria-label="Resumen">
            <div>
              <strong>{weather.apparent}°</strong>
              <span>Sensacion</span>
            </div>
            <div>
              <strong>{recommendation.confidence}%</strong>
              <span>Confianza</span>
            </div>
            <div>
              <strong>{recommendation.closeCount}</strong>
              <span>Parecidas</span>
            </div>
          </div>
        </div>

        <section className="use-controls" aria-label="Condiciones">
          <div className="use-controls-heading">
            <div>
              <p className="eyebrow">Condiciones</p>
              <h2>Hoy</h2>
            </div>
            <button
              className="secondary-button"
              disabled={isLoadingWeather}
              onClick={() => captureWeather()}
              type="button"
            >
              {isLoadingWeather ? "Cargando..." : "Usar ubicacion"}
            </button>
          </div>

          <p className="use-status">{weatherStatus}</p>

          <div className="use-weather-inputs">
            <label>
              Sensacion
              <input
                type="number"
                value={weather.apparent}
                onChange={(event) => updateWeather("apparent", event.target.value)}
              />
              <span>°C</span>
            </label>
            <label>
              Temperatura
              <input
                type="number"
                value={weather.temperature}
                onChange={(event) => updateWeather("temperature", event.target.value)}
              />
              <span>°C</span>
            </label>
            <label>
              Viento
              <input
                type="number"
                value={weather.wind}
                onChange={(event) => updateWeather("wind", event.target.value)}
              />
              <span>km/h</span>
            </label>
            <label>
              Lluvia
              <input
                type="number"
                value={weather.precipitation}
                onChange={(event) => updateWeather("precipitation", event.target.value)}
              />
              <span>mm</span>
            </label>
            <label>
              Humedad
              <input
                type="number"
                value={weather.humidity}
                onChange={(event) => updateWeather("humidity", event.target.value)}
              />
              <span>%</span>
            </label>
            <label>
              Nubes
              <input
                type="number"
                value={weather.cloudCover}
                onChange={(event) => updateWeather("cloudCover", event.target.value)}
              />
              <span>%</span>
            </label>
          </div>

          <SegmentGroup
            label="Actividad"
            options={activityOptions}
            selected={activity}
            onChange={setActivity}
          />
          <SegmentGroup
            label="Exposicion"
            options={indoorTimeOptions}
            selected={indoorTime}
            onChange={setIndoorTime}
          />
          <SegmentGroup
            label="Condicion medica"
            options={medicalConditionOptions}
            selected={medicalCondition}
            onChange={setMedicalCondition}
          />
          <div className="use-two-segments">
            <SegmentGroup
              label="Sensibilidad"
              options={sensitivityOptions}
              selected={sensitivity}
              onChange={setSensitivity}
            />
            <SegmentGroup
              label="Horario"
              options={timeOfDayOptions}
              selected={timeOfDay}
              onChange={setTimeOfDay}
            />
          </div>
        </section>
      </section>

      <section className="use-dashboard">
        <section className="use-result-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Resultado</p>
              <h2>Combinacion recomendada</h2>
            </div>
            <span>{recommendation.sourceLabel}</span>
          </div>

          <div className="use-outfit-grid">
            <article>
              <span>Superior</span>
              <strong>{recommendation.plan.upper}</strong>
            </article>
            <article>
              <span>Inferior</span>
              <strong>{recommendation.plan.lower}</strong>
            </article>
            <article>
              <span>Capa</span>
              <strong>{recommendation.plan.outer}</strong>
            </article>
            <article>
              <span>Calzado</span>
              <strong>{recommendation.plan.shoes}</strong>
            </article>
            <article className="wide">
              <span>Accesorios</span>
              <strong>{recommendation.plan.accessories}</strong>
            </article>
            <article className="wide">
              <span>Ajuste fino</span>
              <strong>{recommendation.plan.note}</strong>
            </article>
          </div>
        </section>

        <aside className="use-evidence-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Evidencia</p>
              <h2>Respuestas usadas</h2>
            </div>
          </div>

          <p className="use-status">{sampleStatus}</p>

          <div className="use-stat-grid">
            <div>
              <strong>{samples.length}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{recommendation.closeCount}</strong>
              <span>Muy parecidas</span>
            </div>
            <div>
              <strong>{recommendation.comfortRate}%</strong>
              <span>Comodas</span>
            </div>
          </div>

          <div className={`use-trend ${recommendation.trend}`}>
            <span />
            <p>
              {recommendation.trend === "cold"
                ? "La gente tendio a pasar frio."
                : recommendation.trend === "hot"
                  ? "La gente tendio a pasar calor."
                  : recommendation.trend === "balanced"
                    ? "Las respuestas estan equilibradas."
                    : "Sin tendencia comunitaria."}
            </p>
          </div>
        </aside>

        <section className="use-detail-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Por que</p>
              <h2>Lectura del modelo</h2>
            </div>
          </div>

          <div className="use-reason-list">
            {recommendation.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </section>

        <section className="use-detail-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Cuidado</p>
              <h2>Riesgos de ajuste</h2>
            </div>
          </div>

          <div className="use-risk-list">
            {recommendation.risks.map((risk) => (
              <p key={risk}>{risk}</p>
            ))}
          </div>
        </section>

        <section className="use-wide-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Combinaciones reales</p>
              <h2>Lo que mas se parece</h2>
            </div>
          </div>

          {recommendation.communityCombos.length === 0 ? (
            <div className="use-empty">
              No hay respuestas cercanas suficientes. Guarda registros reales para que esta lista se vuelva especifica.
            </div>
          ) : (
            <div className="use-combo-list">
              {recommendation.communityCombos.map((combo) => (
                <article key={combo.key}>
                  <div>
                    <strong>
                      {combo.upperBody}, {combo.lowerBody}, {combo.outerLayer}
                    </strong>
                    <p>
                      {combo.shoes} · {combo.accessories} · {combo.doubles} ·{" "}
                      {combo.heating} · {combo.medicalCondition} ·{" "}
                      {combo.specificCold}
                    </p>
                  </div>
                  <span>
                    {combo.support} resp. · {combo.comfortRate}% comodo
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="use-wide-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Variantes</p>
              <h2>Si cambia el plan</h2>
            </div>
          </div>

          <div className="use-scenario-grid">
            {scenarios.map((scenario) => (
              <article key={scenario.label}>
                <span>{scenario.label}</span>
                <strong>{scenario.main}</strong>
                <p>{scenario.support}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="use-wide-panel">
          <div className="use-section-title">
            <div>
              <p className="eyebrow">Cobertura</p>
              <h2>Casos frecuentes</h2>
            </div>
          </div>

          <div className="use-coverage-grid">
            {coverageRows.map((row) => (
              <article key={row.label}>
                <span>{row.label}</span>
                <strong>{row.outfit}</strong>
                <p>{row.shoes}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
