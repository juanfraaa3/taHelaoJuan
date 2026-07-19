"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type OutfitRecord = {
  id: string;
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
  doubles: string;
  heating: string;
  notes: string;
};

type AccessUser = {
  email: string;
  displayName: string;
};

type AuthMode = "login" | "register";

type AuthForm = {
  email: string;
  password: string;
};

type DraftRecord = {
  upperBody: string;
  lowerBody: string;
  outerLayer: string;
  shoes: string;
  accessories: string;
  activity: string;
  indoorTime: string;
  feeling: number | null;
  doubles: string;
  heating: string;
  notes: string;
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

const defaultDraft: DraftRecord = {
  upperBody: "",
  lowerBody: "",
  outerLayer: "Sin chaqueta",
  shoes: "",
  accessories: "",
  activity: "",
  indoorTime: "",
  feeling: null,
  doubles: "",
  heating: "",
  notes: "",
};

const feelingLabels: Record<number, string> = {
  [-2]: "Mucho frio",
  [-1]: "Frio",
  0: "Comodo",
  1: "Algo de calor",
  2: "Mucho calor",
};

const upperBodyOptions = [
  "Polera",
  "Polera manga larga",
  "Camisa",
  "Sweater delgado",
  "Poleron",
  "Primera capa",
  "Chaqueta delgada",
  "Cortaviento",
  "Chaqueta abrigada",
  "Impermeable",
  "Abrigo grueso",
];

const outerLayerOptions = [
  "Chaqueta delgada",
  "Cortaviento",
  "Chaqueta abrigada",
  "Impermeable",
  "Abrigo grueso",
];

const lowerBodyOptions = [
  "Short",
  "Jeans",
  "Pantalon tela",
  "Buzo",
  "Pantalon termico",
];

const shoesOptions = [
  "Zapatillas",
  "Zapatos cerrados",
  "Zapatos abiertos",
  "Bototos",
  "Sandalias",
  "Zapatos impermeables",
  "Descalzo",
];

const accessoryOptions = [
  "Gorro",
  "Bufanda",
  "Guantes",
  "Paraguas",
  "Lentes",
  "Mochila",
];

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

const doublesOptions = [
  "Doble calcetin",
  "Doble polera",
  "Doble poleron",
  "Doble pantalon",
];

const heatingOptions = [
  "Calefaccion baja",
  "Calefaccion intermedia",
  "Calefaccion alta",
  "Sin calefaccion",
];

const wizardSteps = [
  "Parte superior",
  "Parte inferior",
  "Calzado",
  "Accesorios",
  "Actividad",
  "Ubicacion",
  "Sensacion",
  "Dobles",
  "Calefaccion",
  "Algo extra que quieras recordar",
];

function roundNumber(value: number, digits = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function getBaseAdvice(weather: WeatherData) {
  const apparent = weather.apparent;
  const advice: string[] = [];

  if (apparent < 6) {
    advice.push("Primera capa termica o polera gruesa");
    advice.push("Chaqueta abrigada");
    advice.push("Pantalon largo y zapatos cerrados");
  } else if (apparent < 12) {
    advice.push("Polera + sweater o poleron");
    advice.push("Chaqueta mediana");
    advice.push("Pantalon largo");
  } else if (apparent < 17) {
    advice.push("Polera + capa liviana");
    advice.push("Chaqueta delgada si sales temprano o tarde");
  } else if (apparent < 22) {
    advice.push("Polera normal");
    advice.push("Capa liviana opcional");
  } else if (apparent < 27) {
    advice.push("Ropa liviana");
    advice.push("Evita capas que no puedas quitarte");
  } else {
    advice.push("Ropa muy liviana y respirable");
    advice.push("Prioriza sombra, agua y telas frescas");
  }

  if (weather.wind >= 18) {
    advice.push("Agrega cortaviento: el viento puede hacerte sentir mas frio");
  }

  if (weather.precipitation > 0 || weather.cloudCover > 80) {
    advice.push("Lleva capa impermeable o paraguas si estaras afuera");
  }

  return advice;
}

function weatherDistance(current: WeatherData, record: OutfitRecord) {
  return (
    Math.abs(current.apparent - record.weather.apparent) +
    Math.abs(current.temperature - record.weather.temperature) * 0.4 +
    Math.abs(current.humidity - record.weather.humidity) / 20 +
    Math.abs(current.wind - record.weather.wind) / 8
  );
}

function buildPrediction(records: OutfitRecord[], weather: WeatherData) {
  const baseAdvice = getBaseAdvice(weather);

  if (records.length === 0) {
    return {
      title: "Registra tu primer dato",
      summary:
        "Todavia no hay historial personal. Te muestro una recomendacion general y la app empezara a aprender cuando guardes ejemplos.",
      confidence: 20,
      advice: baseAdvice,
      similar: [] as OutfitRecord[],
    };
  }

  const similar = [...records]
    .sort((a, b) => weatherDistance(weather, a) - weatherDistance(weather, b))
    .slice(0, 8);

  const averageFeeling =
    similar.reduce((total, record) => total + record.feeling, 0) /
    similar.length;

  const advice = [...baseAdvice];
  let title = "Recomendacion balanceada";
  let summary =
    "Tu historial parecido no muestra una tendencia fuerte. Usa la recomendacion base y registra como te fue.";

  if (averageFeeling <= -0.45) {
    title = "Probablemente necesitas mas abrigo";
    summary =
      "En dias parecidos tendiste a pasar frio. Conviene agregar una capa facil de quitar si cambia la temperatura.";
    advice.unshift("Suma una capa extra respecto a lo que usarias normalmente");
  } else if (averageFeeling >= 0.45) {
    title = "Probablemente puedes ir mas liviano";
    summary =
      "En dias parecidos tendiste a pasar calor. Conviene elegir capas delgadas o ropa que puedas ventilar.";
    advice.unshift("Reduce una capa o elige telas mas respirables");
  }

  const confidence = Math.min(90, 30 + records.length * 3 + similar.length * 4);

  return {
    title,
    summary,
    confidence,
    advice,
    similar,
  };
}

function storageKeyFor(email?: string | null) {
  return email ? `${STORAGE_KEY}:${email}` : STORAGE_KEY;
}

function parseStoredRecords(email?: string | null) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKeyFor(email));
    return raw ? (JSON.parse(raw) as OutfitRecord[]) : [];
  } catch {
    return [];
  }
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: text } as T;
  }
}

function splitSelections(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinSelections(values: string[]) {
  return values.join(", ");
}

function deriveOuterLayer(upperBody: string) {
  const selectedLayers = splitSelections(upperBody).filter((item) =>
    outerLayerOptions.includes(item),
  );

  return selectedLayers.length > 0
    ? joinSelections(selectedLayers)
    : "Sin chaqueta";
}

function WizardOptions({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="wizard-options">
      {options.map((option) => (
        <button
          key={option}
          className={selected === option ? "active" : ""}
          onClick={() => onSelect(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [records, setRecords] = useState<OutfitRecord[]>([]);
  const [user, setUser] = useState<AccessUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthForm>({
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [draft, setDraft] = useState<DraftRecord>(defaultDraft);
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [syncStatus, setSyncStatus] = useState(
    "Cargando registros guardados en la nube...",
  );
  const [weatherStatus, setWeatherStatus] = useState(
    "Puedes usar clima automatico o ajustar los datos a mano.",
  );
  const didAutoCaptureWeather = useRef(false);

  useEffect(() => {
    async function loadRecords() {
      let currentUser: AccessUser | null = null;

      try {
        const response = await fetch("/api/me");
        const data = await readApiJson<{
          user?: AccessUser;
          error?: string;
        }>(response);

        if (!response.ok || !data.user) {
          throw new Error(data.error ?? "No hay usuario autenticado.");
        }

        currentUser = data.user;
        setUser(data.user);
      } catch {
        const localRecords = parseStoredRecords();
        setRecords(localRecords);
        setSyncStatus(
          "Inicia sesion para cargar tus registros guardados.",
        );
        setHasLoadedRecords(true);
        return;
      }

      try {
        const response = await fetch("/api/outfit-records");
        const data = await readApiJson<{
          records?: OutfitRecord[];
          user?: AccessUser;
          error?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? "No pude cargar los registros.");
        }

        setRecords(data.records ?? []);
        setUser(data.user ?? currentUser);
        setSyncStatus(`Registros sincronizados para ${currentUser.email}.`);
      } catch {
        const localRecords = parseStoredRecords(currentUser.email);
        setRecords(localRecords);
        setSyncStatus(
          "No pude conectar con la nube. Estoy usando el respaldo de este navegador.",
        );
      } finally {
        setHasLoadedRecords(true);
      }
    }

    loadRecords();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && hasLoadedRecords) {
      window.localStorage.setItem(
        storageKeyFor(user?.email),
        JSON.stringify(records),
      );
    }
  }, [hasLoadedRecords, records, user?.email]);

  const prediction = useMemo(
    () => buildPrediction(records, weather),
    [records, weather],
  );

  const comfortRate =
    records.length === 0
      ? 0
      : Math.round(
          (records.filter((record) => record.feeling === 0).length /
            records.length) *
            100,
        );

  async function loadCloudRecords(currentUser: AccessUser) {
    const response = await fetch("/api/outfit-records");
    const data = await readApiJson<{
      records?: OutfitRecord[];
      user?: AccessUser;
      error?: string;
    }>(response);

    if (!response.ok) {
      throw new Error(data.error ?? "No pude cargar los registros.");
    }

    setRecords(data.records ?? []);
    setUser(data.user ?? currentUser);
    setSyncStatus(`Registros sincronizados para ${currentUser.email}.`);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setIsAuthSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await readApiJson<{
        user?: AccessUser;
        error?: string;
      }>(response);

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "No pude iniciar sesion.");
      }

      setUser(data.user);
      setAuthForm({ email: "", password: "" });
      setHasLoadedRecords(false);
      await loadCloudRecords(data.user);
      setHasLoadedRecords(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setRecords([]);
    setHasLoadedRecords(true);
    setSyncStatus("Inicia sesion para cargar tus registros guardados.");
  }

  const captureWeather = useCallback((mode: "auto" | "manual" = "manual") => {
    if (!navigator.geolocation) {
      setWeatherStatus("Tu navegador no entrega ubicacion. Usa datos manuales.");
      return;
    }

    setWeatherStatus(
      mode === "auto"
        ? "Actualizando clima actual automaticamente..."
        : "Buscando tu ubicacion y el clima actual...",
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current:
            "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m",
          timezone: "auto",
        });

        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          );
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
        } catch {
          setWeatherStatus(
            "No pude obtener el clima automatico. Puedes ajustar los campos manualmente.",
          );
        }
      },
      () => {
        setWeatherStatus(
          "No se autorizo la ubicacion. Puedes registrar el clima manualmente.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  useEffect(() => {
    if (!hasLoadedRecords || !user || didAutoCaptureWeather.current) return;

    didAutoCaptureWeather.current = true;
    captureWeather("auto");
  }, [captureWeather, hasLoadedRecords, user]);

  function updateWeather(field: keyof WeatherData, value: string) {
    const numericValue = Number(value);
    setWeather((current) => ({
      ...current,
      [field]: Number.isFinite(numericValue) ? numericValue : 0,
      source: "manual",
      updatedAt: new Date().toISOString(),
    }));
  }

  function toggleAccessory(accessory: string) {
    toggleDraftMultiOption("accessories", accessory);
  }

  function toggleDraftMultiOption(
    field: "upperBody" | "lowerBody" | "accessories" | "doubles",
    option: string,
  ) {
    const selected = splitSelections(draft[field]);
    const nextSelections = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    const nextValue = joinSelections(nextSelections);

    setDraft((current) => ({
      ...current,
      [field]: nextValue,
      ...(field === "upperBody"
        ? { outerLayer: deriveOuterLayer(nextValue) }
        : {}),
    }));
  }

  function canAdvanceWizardStep() {
    if (wizardStep === 0) return splitSelections(draft.upperBody).length > 0;
    if (wizardStep === 1) return splitSelections(draft.lowerBody).length > 0;
    if (wizardStep === 2) return Boolean(draft.shoes);
    if (wizardStep === 4) return Boolean(draft.activity);
    if (wizardStep === 5) return Boolean(draft.indoorTime);
    if (wizardStep === 6) return draft.feeling !== null;
    if (wizardStep === 8) return Boolean(draft.heating);

    return true;
  }

  function openWizard() {
    setWizardStep(0);
    setIsWizardOpen(true);
  }

  function closeWizard() {
    setWizardStep(0);
    setIsWizardOpen(false);
  }

  function nextWizardStep() {
    setWizardStep((current) => Math.min(current + 1, wizardSteps.length - 1));
  }

  function previousWizardStep() {
    setWizardStep((current) => Math.max(current - 1, 0));
  }

  function selectDraftOption(
    field:
      | "shoes"
      | "activity"
      | "indoorTime"
      | "heating",
    value: string,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    nextWizardStep();
  }

  async function saveRecord() {
    const newRecord: OutfitRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      weather,
      ...draft,
      outerLayer: deriveOuterLayer(draft.upperBody),
      feeling: draft.feeling ?? 0,
    };

    setIsSaving(true);
    setSyncStatus("Guardando registro en la nube...");

    try {
      const response = await fetch("/api/outfit-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      const data = await readApiJson<{
        record?: OutfitRecord;
        error?: string;
      }>(response);

      if (!response.ok || !data.record) {
        throw new Error(data.error ?? "No pude guardar el registro.");
      }

      setRecords((current) => [data.record!, ...current]);
      setDraft(defaultDraft);
      closeWizard();
      setSyncStatus("Registro guardado en la nube.");
    } catch {
      setRecords((current) => [newRecord, ...current]);
      setDraft(defaultDraft);
      closeWizard();
      setSyncStatus(
        "No pude guardar en la nube. Lo deje como respaldo local en este navegador.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(records, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tahelaojuan-registros.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteRecord(id: string) {
    const previousRecords = records;
    setRecords((current) => current.filter((record) => record.id !== id));
    setSyncStatus("Borrando registro...");

    try {
      const response = await fetch(
        `/api/outfit-records?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = await readApiJson<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "No pude borrar el registro.");
      }

      setSyncStatus("Registro borrado de la nube.");
    } catch {
      setRecords(previousRecords);
      setSyncStatus("No pude borrar ese registro en la nube.");
    }
  }

  function renderWizardStep() {
    if (wizardStep === 0) {
      return (
        <div className="wizard-options compact-options">
          {upperBodyOptions.map((option) => (
            <button
              key={option}
              className={
                splitSelections(draft.upperBody).includes(option)
                  ? "active"
                  : ""
              }
              onClick={() => toggleDraftMultiOption("upperBody", option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (wizardStep === 1) {
      return (
        <div className="wizard-options compact-options">
          {lowerBodyOptions.map((option) => (
            <button
              key={option}
              className={
                splitSelections(draft.lowerBody).includes(option)
                  ? "active"
                  : ""
              }
              onClick={() => toggleDraftMultiOption("lowerBody", option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <WizardOptions
          options={shoesOptions}
          selected={draft.shoes}
          onSelect={(option) => selectDraftOption("shoes", option)}
        />
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="wizard-stack">
          <p className="wizard-help">
            Puedes elegir varios. Si no llevas accesorios, solo avanza.
          </p>
          <div className="wizard-options compact-options">
            {accessoryOptions.map((option) => (
              <button
                key={option}
                className={
                  splitSelections(draft.accessories).includes(option)
                    ? "active"
                    : ""
                }
                onClick={() => toggleAccessory(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (wizardStep === 4) {
      return (
        <WizardOptions
          options={activityOptions}
          selected={draft.activity}
          onSelect={(option) => selectDraftOption("activity", option)}
        />
      );
    }

    if (wizardStep === 5) {
      return (
        <WizardOptions
          options={indoorTimeOptions}
          selected={draft.indoorTime}
          onSelect={(option) => selectDraftOption("indoorTime", option)}
        />
      );
    }

    if (wizardStep === 6) {
      return (
        <div className="wizard-options feeling-options">
          {[-2, -1, 0, 1, 2].map((value) => (
            <button
              key={value}
              className={draft.feeling === value ? "active" : ""}
              onClick={() => {
                setDraft({ ...draft, feeling: value });
                nextWizardStep();
              }}
              type="button"
            >
              {feelingLabels[value]}
            </button>
          ))}
        </div>
      );
    }

    if (wizardStep === 7) {
      return (
        <div className="wizard-stack">
          <p className="wizard-help">
            Puedes elegir varios. Si no aplica ninguno, solo avanza.
          </p>
          <div className="wizard-options compact-options">
            {doublesOptions.map((option) => (
              <button
                key={option}
                className={
                  splitSelections(draft.doubles).includes(option)
                    ? "active"
                    : ""
                }
                onClick={() => toggleDraftMultiOption("doubles", option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (wizardStep === 8) {
      return (
        <WizardOptions
          options={heatingOptions}
          selected={draft.heating}
          onSelect={(option) => selectDraftOption("heating", option)}
        />
      );
    }

    return (
      <div className="wizard-stack">
        <label className="notes-field">
          <textarea
            placeholder="Ej: en la sombra tuve frio, pero caminando estaba bien."
            value={draft.notes}
            onChange={(event) =>
              setDraft({ ...draft, notes: event.target.value })
            }
          />
        </label>
        <div className="answer-summary">
          <span>{draft.upperBody}</span>
          <span>{draft.lowerBody}</span>
          <span>{draft.shoes}</span>
          <span>{draft.accessories || "Sin accesorios"}</span>
          <span>{draft.activity}</span>
          <span>{draft.indoorTime}</span>
          <span>
            {draft.feeling === null ? "Sin sensacion" : feelingLabels[draft.feeling]}
          </span>
          <span>{draft.doubles || "Sin dobles"}</span>
          <span>{draft.heating}</span>
        </div>
      </div>
    );
  }

  if (!hasLoadedRecords && !user) {
    return (
      <main className="auth-page min-h-screen bg-[#fff7ed] text-[#21120a]">
        <section className="auth-panel">
          <div className="brand-lockup">
            <span className="brand-lockup-logo" aria-hidden="true" />
            <p className="eyebrow">taHelaoJuan</p>
          </div>
          <h1>Cargando sesion</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page min-h-screen bg-[#fff7ed] text-[#21120a]">
        <section className="auth-panel">
          <div className="brand-lockup">
            <span className="brand-lockup-logo" aria-hidden="true" />
            <p className="eyebrow">taHelaoJuan</p>
          </div>
          <h1>{authMode === "login" ? "Entrar" : "Crear cuenta"}</h1>

          <form className="auth-form" onSubmit={submitAuth}>
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                required
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({ ...authForm, email: event.target.value })
                }
              />
            </label>
            <label>
              Clave
              <input
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({ ...authForm, password: event.target.value })
                }
              />
            </label>

            {authError && <p className="auth-error">{authError}</p>}

            <button
              className="primary-button"
              disabled={isAuthSubmitting}
              type="submit"
            >
              {isAuthSubmitting
                ? "Procesando..."
                : authMode === "login"
                  ? "Entrar"
                  : "Crear cuenta"}
            </button>
          </form>

          <button
            className="auth-switch"
            type="button"
            onClick={() => {
              setAuthError("");
              setAuthMode(authMode === "login" ? "register" : "login");
            }}
          >
            {authMode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
          </button>
        </section>
      </main>
    );
  }

  if (isWizardOpen) {
    return (
      <main className="wizard-page min-h-screen bg-[#fff7ed] text-[#21120a]">
        <section className="wizard-shell">
          <div className="wizard-topbar">
            <div>
              <div className="brand-lockup">
                <span className="brand-lockup-logo" aria-hidden="true" />
                <p className="eyebrow">taHelaoJuan</p>
              </div>
              <h1>Registrar salida</h1>
            </div>
            <button
              className="secondary-button"
              disabled={isSaving}
              onClick={closeWizard}
            >
              Cerrar
            </button>
          </div>

          <div className="wizard-weather-strip">
            <span>{weather.apparent}° sensacion</span>
            <span>{weather.humidity}% humedad</span>
            <span>{weather.wind} km/h viento</span>
          </div>

          <div className="wizard-card focus-wizard-card">
            <div className="wizard-progress">
              <span
                style={{
                  width: `${((wizardStep + 1) / wizardSteps.length) * 100}%`,
                }}
              />
            </div>
            <p className="wizard-counter">
              Pregunta {wizardStep + 1} de {wizardSteps.length}
            </p>
            <h2>{wizardSteps[wizardStep]}</h2>

            {renderWizardStep()}

            <div className="wizard-actions">
              <button
                className="secondary-button"
                disabled={wizardStep === 0 || isSaving}
                onClick={previousWizardStep}
              >
                Atras
              </button>
              {wizardStep >= wizardSteps.length - 1 ? (
                <button
                  className="primary-button compact"
                  disabled={isSaving}
                  onClick={saveRecord}
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              ) : (
                <button
                  className="primary-button compact"
                  disabled={isSaving || !canAdvanceWizardStep()}
                  onClick={nextWizardStep}
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff7ed] text-[#21120a]">
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <a className="navbar-brand" href="#">
            <span className="navbar-brand-logo" aria-hidden="true" />
            <span className="navbar-brand-label">taHelaoJuan</span>
          </a>

          <nav className="navbar-links" aria-label="Principal">
            <a href="/que-usar">Que usar</a>
            <a href="/clima">Clima</a>
            <a href="#modelo">Modelo</a>
            <a href="#historial">Historial</a>
          </nav>

          <div className="navbar-actions">
            <span className="navbar-session">{user.email}</span>
            <button className="primary-button compact" onClick={openWizard}>
              Registrar
            </button>
            <button className="secondary-button" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-[#fed7aa] bg-[#fff3e6]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="hero-brand">
                <span className="hero-brand-logo" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c2410c]">
                  taHelaoJuan
                </p>
              </div>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#21120a] sm:text-5xl">
                Decide que ponerte con datos tuyos, no con pura intuicion.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#6f5140]">
                Registra clima, ropa y sensacion real. La app compara dias
                parecidos y mejora la recomendacion mientras juntas historial.
              </p>
              <p className="cloud-status">{syncStatus}</p>
            </div>

            <div className="hero-actions">
              <button className="primary-button compact" onClick={openWizard}>
                REGISTRAR
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="metric">
                <span>{records.length}</span>
                <small>registros</small>
              </div>
              <div className="metric">
                <span>{comfortRate}%</span>
                <small>comodo</small>
              </div>
              <div className="metric">
                <span>{prediction.confidence}%</span>
                <small>confianza</small>
              </div>
            </div>
          </div>

          <aside className="recommendation-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Ahora mismo</p>
                <h2>{prediction.title}</h2>
              </div>
              <div className="temperature-badge">
                {weather.apparent}°<span>sensacion</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6f5140]">
              {prediction.summary}
            </p>
            <ul className="mt-5 space-y-2">
              {prediction.advice.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-5">
          <section className="panel" id="clima">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Clima</p>
                <h2>Condiciones del registro</h2>
              </div>
              <button
                className="secondary-button"
                onClick={() => captureWeather()}
              >
                Usar clima actual
              </button>
            </div>

            <p className="status-text">{weatherStatus}</p>

            <div className="weather-grid">
              <label>
                Temperatura
                <input
                  type="number"
                  value={weather.temperature}
                  onChange={(event) =>
                    updateWeather("temperature", event.target.value)
                  }
                />
                <span>°C</span>
              </label>
              <label>
                Sensacion
                <input
                  type="number"
                  value={weather.apparent}
                  onChange={(event) =>
                    updateWeather("apparent", event.target.value)
                  }
                />
                <span>°C</span>
              </label>
              <label>
                Humedad
                <input
                  type="number"
                  value={weather.humidity}
                  onChange={(event) =>
                    updateWeather("humidity", event.target.value)
                  }
                />
                <span>%</span>
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
                Rafagas
                <input
                  type="number"
                  value={weather.gusts}
                  onChange={(event) =>
                    updateWeather("gusts", event.target.value)
                  }
                />
                <span>km/h</span>
              </label>
              <label>
                Lluvia
                <input
                  type="number"
                  value={weather.precipitation}
                  onChange={(event) =>
                    updateWeather("precipitation", event.target.value)
                  }
                />
                <span>mm</span>
              </label>
            </div>
          </section>

          <section className="panel" id="modelo">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Modelo local</p>
                <h2>Como esta aprendiendo</h2>
              </div>
            </div>
            <div className="model-box">
              <div>
                <strong>{records.length < 8 ? "Recolectando datos" : "Personalizando"}</strong>
                <p>
                  Con menos de 8 registros la recomendacion es principalmente
                  general. Desde ahi empieza a pesar mas tu historial.
                </p>
              </div>
              <div className="progress-track">
                <span
                  style={{ width: `${Math.min(100, records.length * 12.5)}%` }}
                />
              </div>
            </div>
            {prediction.similar.length > 0 && (
              <div className="similar-list">
                <p>Dias parecidos usados:</p>
                {prediction.similar.slice(0, 3).map((record) => (
                  <span key={record.id}>
                    {new Date(record.createdAt).toLocaleDateString("es-CL")} ·{" "}
                    {record.weather.apparent}° · {feelingLabels[record.feeling]}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Registro rapido</p>
                <h2>Nuevo registro</h2>
              </div>
            </div>

            <div className="start-registration">
              <p>
                Responde una pregunta a la vez. La app guarda clima, ropa,
                actividad y como te sentiste para mejorar la recomendacion.
              </p>
              <button className="primary-button" onClick={openWizard}>
                REGISTRAR
              </button>
            </div>
          </section>

          <section className="panel" id="historial">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Historial</p>
                <h2>Ultimos registros</h2>
              </div>
              <button
                className="secondary-button"
                disabled={records.length === 0}
                onClick={exportData}
              >
                Exportar datos
              </button>
            </div>

            {records.length === 0 ? (
              <div className="empty-state">
                Guarda algunos dias reales. Lo importante es registrar tambien
                cuando te equivocas, porque eso entrena mejor la recomendacion.
              </div>
            ) : (
              <div className="records-list">
                {records.slice(0, 6).map((record) => (
                  <article key={record.id}>
                    <div>
                      <strong>
                        {new Date(record.createdAt).toLocaleString("es-CL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </strong>
                      <p>
                        {record.weather.apparent}° sensacion ·{" "}
                        {record.weather.humidity}% humedad ·{" "}
                        {record.weather.wind} km/h viento
                      </p>
                      <p>
                        {record.upperBody}, {record.lowerBody},{" "}
                        {record.outerLayer}
                      </p>
                      {(record.doubles || record.heating) && (
                        <p>
                          {record.doubles || "Sin dobles"} ·{" "}
                          {record.heating || "Sin calefaccion"}
                        </p>
                      )}
                      <span>{feelingLabels[record.feeling]}</span>
                    </div>
                    <button onClick={() => deleteRecord(record.id)}>Borrar</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
