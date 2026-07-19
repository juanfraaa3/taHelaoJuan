import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("adds Que usar to the visible navigation", async () => {
  const [home, weather, queUsar] = await Promise.all([
    source("app/page.tsx"),
    source("app/clima/page.tsx"),
    source("app/que-usar/page.tsx"),
  ]);

  assert.match(home, /href="\/que-usar"/);
  assert.match(weather, /href="\/que-usar"/);
  assert.match(queUsar, /aria-current="page" className="is-current" href="\/que-usar"/);
  assert.match(queUsar, />\s*Que usar\s*</);
});

test("builds the decision view around conditions, evidence and variants", async () => {
  const page = await source("app/que-usar/page.tsx");

  assert.match(page, /buildRecommendation/);
  assert.match(page, /buildScenarioPlans/);
  assert.match(page, /buildCoverageRows/);
  assert.match(page, /\/api\/outfit-insights/);
  assert.match(page, /Combinacion recomendada/);
  assert.match(page, /Combinaciones reales/);
  assert.match(page, /Casos frecuentes/);
  assert.match(page, /medicalConditionOptions/);
  assert.match(page, /medicalConditionAdjustment/);
  assert.match(page, /buildSpecificColdRisks/);
  assert.match(page, /Condicion medica/);
});

test("keeps home focused on recommendation and compact history", async () => {
  const home = await source("app/page.tsx");

  assert.match(home, /Aprendizaje y ultimos registros/);
  assert.match(home, /className="home-insight-section"/);
  assert.doesNotMatch(home, /Condiciones del registro/);
  assert.doesNotMatch(home, /Registro rapido/);
  assert.doesNotMatch(home, /href="#modelo"/);
  assert.doesNotMatch(home, /Usar clima actual/);
});

test("renders the twelve-step registration wizard with new context fields", async () => {
  const home = await source("app/page.tsx");

  assert.match(home, /"Parte superior"/);
  assert.match(home, /"Parte inferior"/);
  assert.match(home, /"Calzado"/);
  assert.match(home, /"Accesorios"/);
  assert.match(home, /"Actividad"/);
  assert.match(home, /"Ubicacion"/);
  assert.match(home, /"Sensacion"/);
  assert.match(home, /"Frio especifico"/);
  assert.match(home, /"Dobles"/);
  assert.match(home, /"Calefaccion"/);
  assert.match(home, /"Condicion medica"/);
  assert.match(home, /"Algo extra que quieras recordar"/);
  assert.match(home, /const specificColdOptions = \[/);
  assert.match(home, /Frio en las manos/);
  assert.match(home, /Frio en el torso \(espalda\)/);
  assert.match(home, /const doublesOptions = \[/);
  assert.match(home, /const heatingOptions = \[/);
  assert.match(home, /const medicalConditionOptions = \[/);
  assert.match(home, /toggleDraftMultiOption\("upperBody", option\)/);
  assert.match(home, /toggleDraftMultiOption\("lowerBody", option\)/);
  assert.match(home, /disabled=\{isSaving \|\| !canAdvanceWizardStep\(\)\}/);
});

test("auto-loads current weather on recommendation surfaces", async () => {
  const [home, queUsar] = await Promise.all([
    source("app/page.tsx"),
    source("app/que-usar/page.tsx"),
  ]);

  assert.match(home, /didAutoCaptureWeather/);
  assert.match(home, /captureWeather\(\)/);
  assert.match(queUsar, /didAutoCaptureWeather/);
  assert.match(queUsar, /captureWeather\("auto"\)/);
});

test("keeps community insights anonymous", async () => {
  const route = await source("app/api/outfit-insights/route.ts");

  assert.match(route, /samples/);
  assert.match(route, /upperBody/);
  assert.match(route, /lowerBody/);
  assert.match(route, /outerLayer/);
  assert.match(route, /specificCold/);
  assert.match(route, /doubles/);
  assert.match(route, /heating/);
  assert.match(route, /medicalCondition/);
  assert.doesNotMatch(route, /userEmail|notes|password/i);
});

test("includes responsive styling for the Que usar dashboard", async () => {
  const css = await source("app/globals.css");

  assert.match(css, /\.use-dashboard/);
  assert.match(css, /\.use-outfit-grid/);
  assert.match(css, /\.use-scenario-grid/);
  assert.match(css, /\.use-coverage-grid/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
