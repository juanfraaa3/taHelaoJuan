"use client";

import { useEffect, useMemo, useState } from "react";

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
  notes: string;
};

type DraftRecord = {
  upperBody: string;
  lowerBody: string;
  outerLayer: string;
  shoes: string;
  accessories: string;
  activity: string;
  indoorTime: string;
  feeling: number;
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
  upperBody: "Polera manga corta",
  lowerBody: "Jeans",
  outerLayer: "Sin chaqueta",
  shoes: "Zapatillas",
  accessories: "",
  activity: "Caminata suave",
  indoorTime: "Mitad interior / mitad exterior",
  feeling: 0,
  notes: "",
};

const feelingLabels: Record<number, string> = {
  [-2]: "Mucho frio",
  [-1]: "Algo de frio",
  0: "Comodo",
  1: "Algo de calor",
  2: "Mucho calor",
};

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

function parseStoredRecords() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OutfitRecord[]) : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [records, setRecords] = useState<OutfitRecord[]>([]);
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [draft, setDraft] = useState<DraftRecord>(defaultDraft);
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    "Cargando registros guardados en la nube...",
  );
  const [weatherStatus, setWeatherStatus] = useState(
    "Puedes usar clima automatico o ajustar los datos a mano.",
  );

  useEffect(() => {
    async function loadRecords() {
      try {
        const response = await fetch("/api/outfit-records");
        const data = (await response.json()) as {
          records?: OutfitRecord[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No pude cargar los registros.");
        }

        setRecords(data.records ?? []);
        setSyncStatus("Registros sincronizados con la nube.");
      } catch {
        const localRecords = parseStoredRecords();
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [hasLoadedRecords, records]);

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

  async function captureWeather() {
    if (!navigator.geolocation) {
      setWeatherStatus("Tu navegador no entrega ubicacion. Usa datos manuales.");
      return;
    }

    setWeatherStatus("Buscando tu ubicacion y el clima actual...");

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
  }

  function updateWeather(field: keyof WeatherData, value: string) {
    const numericValue = Number(value);
    setWeather((current) => ({
      ...current,
      [field]: Number.isFinite(numericValue) ? numericValue : 0,
      source: "manual",
      updatedAt: new Date().toISOString(),
    }));
  }

  async function saveRecord() {
    const newRecord: OutfitRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      weather,
      ...draft,
    };

    setIsSaving(true);
    setSyncStatus("Guardando registro en la nube...");

    try {
      const response = await fetch("/api/outfit-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      const data = (await response.json()) as {
        record?: OutfitRecord;
        error?: string;
      };

      if (!response.ok || !data.record) {
        throw new Error(data.error ?? "No pude guardar el registro.");
      }

      setRecords((current) => [data.record!, ...current]);
      setDraft(defaultDraft);
      setSyncStatus("Registro guardado en la nube.");
    } catch {
      setRecords((current) => [newRecord, ...current]);
      setDraft(defaultDraft);
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
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No pude borrar el registro.");
      }

      setSyncStatus("Registro borrado de la nube.");
    } catch {
      setRecords(previousRecords);
      setSyncStatus("No pude borrar ese registro en la nube.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f2ed] text-[#181b1f]">
      <section className="border-b border-[#d8d1c3] bg-[#f9f7f1]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#47644b]">
                taHelaoJuan
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#17191c] sm:text-5xl">
                Decide que ponerte con datos tuyos, no con pura intuicion.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#50545b]">
                Registra clima, ropa y sensacion real. La app compara dias
                parecidos y mejora la recomendacion mientras juntas historial.
              </p>
              <p className="cloud-status">{syncStatus}</p>
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
            <p className="mt-4 text-sm leading-6 text-[#4f555f]">
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
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Clima</p>
                <h2>Condiciones del registro</h2>
              </div>
              <button className="secondary-button" onClick={captureWeather}>
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

          <section className="panel">
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
                <h2>Que llevas puesto y como te sientes</h2>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Parte superior
                <input
                  value={draft.upperBody}
                  onChange={(event) =>
                    setDraft({ ...draft, upperBody: event.target.value })
                  }
                />
              </label>
              <label>
                Parte inferior
                <input
                  value={draft.lowerBody}
                  onChange={(event) =>
                    setDraft({ ...draft, lowerBody: event.target.value })
                  }
                />
              </label>
              <label>
                Chaqueta / capa exterior
                <input
                  value={draft.outerLayer}
                  onChange={(event) =>
                    setDraft({ ...draft, outerLayer: event.target.value })
                  }
                />
              </label>
              <label>
                Calzado
                <input
                  value={draft.shoes}
                  onChange={(event) =>
                    setDraft({ ...draft, shoes: event.target.value })
                  }
                />
              </label>
              <label>
                Accesorios
                <input
                  placeholder="Gorro, bufanda, guantes, mochila..."
                  value={draft.accessories}
                  onChange={(event) =>
                    setDraft({ ...draft, accessories: event.target.value })
                  }
                />
              </label>
              <label>
                Actividad
                <select
                  value={draft.activity}
                  onChange={(event) =>
                    setDraft({ ...draft, activity: event.target.value })
                  }
                >
                  <option>Caminata suave</option>
                  <option>Transporte publico</option>
                  <option>Auto / taxi</option>
                  <option>Ejercicio</option>
                  <option>Estar quieto afuera</option>
                </select>
              </label>
              <label>
                Tiempo interior/exterior
                <select
                  value={draft.indoorTime}
                  onChange={(event) =>
                    setDraft({ ...draft, indoorTime: event.target.value })
                  }
                >
                  <option>Principalmente exterior</option>
                  <option>Mitad interior / mitad exterior</option>
                  <option>Principalmente interior</option>
                </select>
              </label>
            </div>

            <div className="feeling-control">
              <p>Resultado real</p>
              <div>
                {[-2, -1, 0, 1, 2].map((value) => (
                  <button
                    key={value}
                    className={draft.feeling === value ? "active" : ""}
                    onClick={() => setDraft({ ...draft, feeling: value })}
                    type="button"
                  >
                    {feelingLabels[value]}
                  </button>
                ))}
              </div>
            </div>

            <label className="notes-field">
              Nota opcional
              <textarea
                placeholder="Ej: en la sombra tuve frio, pero caminando estaba bien."
                value={draft.notes}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </label>

            <button
              className="primary-button"
              disabled={isSaving}
              onClick={saveRecord}
            >
              {isSaving ? "Guardando..." : "Guardar registro"}
            </button>
          </section>

          <section className="panel">
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
