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
});

test("merges upper body and outer layer into one multi-select wizard step", async () => {
  const home = await source("app/page.tsx");

  assert.match(home, /const upperLayerOptions = \[\.\.\.upperBodyOptions, \.\.\.outerLayerOptions\]/);
  assert.match(home, /"Parte superior y capas"/);
  assert.match(home, /toggleUpperLayerOption/);
  assert.match(home, /upperLayerOptions\.map/);
  assert.match(home, /disabled=\{isSaving \|\| !canAdvanceWizardStep\(\)\}/);
  assert.doesNotMatch(home, /"Capa exterior"/);
});

test("auto-loads current weather on recommendation surfaces", async () => {
  const [home, queUsar] = await Promise.all([
    source("app/page.tsx"),
    source("app/que-usar/page.tsx"),
  ]);

  assert.match(home, /didAutoCaptureWeather/);
  assert.match(home, /captureWeather\("auto"\)/);
  assert.match(queUsar, /didAutoCaptureWeather/);
  assert.match(queUsar, /captureWeather\("auto"\)/);
});

test("keeps community insights anonymous", async () => {
  const route = await source("app/api/outfit-insights/route.ts");

  assert.match(route, /samples/);
  assert.match(route, /upperBody/);
  assert.match(route, /lowerBody/);
  assert.match(route, /outerLayer/);
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
