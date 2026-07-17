"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type LocationOption = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type WeatherResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
};

type WeatherState = {
  location: LocationOption;
  data: WeatherResponse;
};

const defaultLocation: LocationOption = {
  id: 1,
  name: "Santiago",
  admin1: "Region Metropolitana",
  country: "Chile",
  latitude: -33.4489,
  longitude: -70.6693,
  timezone: "America/Santiago",
};

const weatherLabels: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta fuerte con granizo",
};

function round(value: number | undefined, digits = 0) {
  return Number.isFinite(value) ? Number(value!.toFixed(digits)) : 0;
}

function weatherLabel(code: number | undefined) {
  return weatherLabels[code ?? -1] ?? "Clima variable";
}

function locationLabel(location: LocationOption) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
  }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string | undefined) {
  if (!value) return "--:--";
  return formatHour(value);
}

function hourlyItems(data: WeatherResponse) {
  const hourly = data.hourly;
  if (!hourly) return [];

  return hourly.time.slice(0, 12).map((time, index) => ({
    time,
    temperature: hourly.temperature_2m[index],
    apparent: hourly.apparent_temperature[index],
    precipitation: hourly.precipitation_probability[index],
    weatherCode: hourly.weather_code[index],
    wind: hourly.wind_speed_10m[index],
  }));
}

function dailyItems(data: WeatherResponse) {
  const daily = data.daily;
  if (!daily) return [];

  return daily.time.map((time, index) => ({
    time,
    weatherCode: daily.weather_code[index],
    max: daily.temperature_2m_max[index],
    min: daily.temperature_2m_min[index],
    precipitation: daily.precipitation_probability_max[index],
    wind: daily.wind_speed_10m_max[index],
    uv: daily.uv_index_max[index],
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index],
  }));
}

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationOption[]>([]);
  const [status, setStatus] = useState("Cargando clima de Santiago...");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadWeather(defaultLocation);
  }, []);

  const current = weather?.data.current;
  const nextHours = useMemo(() => hourlyItems(weather?.data ?? {}), [weather]);
  const nextDays = useMemo(() => dailyItems(weather?.data ?? {}), [weather]);

  async function loadWeather(location: LocationOption) {
    setIsLoading(true);
    setStatus(`Actualizando clima para ${locationLabel(location)}...`);

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m",
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset",
      forecast_days: "7",
      timezone: "auto",
    });

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("No pude obtener el clima.");
      }

      const data = (await response.json()) as WeatherResponse;
      setWeather({ location, data });
      setStatus(`Clima actualizado para ${locationLabel(location)}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  async function searchLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;

    setIsSearching(true);
    setStatus(`Buscando ${search}...`);

    try {
      const params = new URLSearchParams({
        name: search,
        count: "6",
        language: "es",
        format: "json",
      });
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("No pude buscar esa ciudad.");
      }

      const data = (await response.json()) as { results?: LocationOption[] };
      const results = data.results ?? [];
      setSearchResults(results);
      setStatus(
        results.length > 0
          ? "Elige una ubicacion para ver su clima."
          : "No encontre resultados para esa busqueda.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setIsSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("Tu navegador no entrega ubicacion.");
      return;
    }

    setStatus("Buscando tu ubicacion...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationOption = {
          id: Date.now(),
          name: "Mi ubicacion",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setSearchResults([]);
        loadWeather(location);
      },
      () => {
        setStatus("No se autorizo la ubicacion.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <main className="weather-app-page min-h-screen bg-[#fff7ed] text-[#21120a]">
      <header className="app-navbar">
        <div className="app-navbar-inner">
          <Link className="navbar-brand" href="/">
            <span>taHelaoJuan</span>
          </Link>

          <nav className="navbar-links" aria-label="Principal">
            <Link href="/">Inicio</Link>
            <Link href="/clima">Clima</Link>
            <Link href="/#historial">Historial</Link>
          </nav>

          <div className="navbar-actions">
            <button className="primary-button compact" onClick={useCurrentLocation}>
              Mi ubicacion
            </button>
          </div>
        </div>
      </header>

      <section className="weather-hero">
        <div>
          <p className="eyebrow">Clima</p>
          <h1>Tiempo actual y pronostico</h1>
          <p>
            Revisa temperatura, sensacion, viento, lluvia y los proximos dias
            antes de decidir que ponerte.
          </p>
        </div>

        <form className="weather-search" onSubmit={searchLocation}>
          <label>
            Buscar ciudad
            <div className="weather-search-row">
              <input
                placeholder="Ej: Santiago, Valparaiso, Buenos Aires"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="primary-button compact" disabled={isSearching}>
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </label>

          {searchResults.length > 0 && (
            <div className="weather-location-list">
              {searchResults.map((location) => (
                <button
                  key={`${location.id}-${location.latitude}-${location.longitude}`}
                  type="button"
                  onClick={() => {
                    setSearchResults([]);
                    setQuery(locationLabel(location));
                    loadWeather(location);
                  }}
                >
                  {locationLabel(location)}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="weather-dashboard">
        <p className="cloud-status">{status}</p>

        <div className="weather-layout">
          <section className="current-weather-card">
            <div className="current-weather-top">
              <div>
                <p className="eyebrow">Ahora</p>
                <h2>{weather ? locationLabel(weather.location) : "Cargando..."}</h2>
                <p>{weatherLabel(current?.weather_code)}</p>
              </div>
              <div className="weather-primary">
                {round(current?.temperature_2m)}°<span>actual</span>
              </div>
            </div>

            <div className="weather-current-grid">
              <div>
                <span>{round(current?.apparent_temperature)}°</span>
                <small>Sensacion</small>
              </div>
              <div>
                <span>{round(current?.relative_humidity_2m)}%</span>
                <small>Humedad</small>
              </div>
              <div>
                <span>{round(current?.wind_speed_10m)} km/h</span>
                <small>Viento</small>
              </div>
              <div>
                <span>{round(current?.wind_gusts_10m)} km/h</span>
                <small>Rafagas</small>
              </div>
              <div>
                <span>{round(current?.precipitation, 1)} mm</span>
                <small>Lluvia</small>
              </div>
              <div>
                <span>{round(current?.cloud_cover)}%</span>
                <small>Nubes</small>
              </div>
            </div>

            <button
              className="secondary-button"
              disabled={isLoading || !weather}
              onClick={() => weather && loadWeather(weather.location)}
            >
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </section>

          <aside className="weather-side-card">
            <p className="eyebrow">Hoy</p>
            <h2>Resumen rapido</h2>
            <div className="weather-chip-list">
              <span className="weather-chip">
                Max {round(nextDays[0]?.max)}° / Min {round(nextDays[0]?.min)}°
              </span>
              <span className="weather-chip">
                Lluvia {round(nextDays[0]?.precipitation)}%
              </span>
              <span className="weather-chip">
                UV {round(nextDays[0]?.uv, 1)}
              </span>
              <span className="weather-chip">
                Sol {formatTime(nextDays[0]?.sunrise)} - {formatTime(nextDays[0]?.sunset)}
              </span>
            </div>
          </aside>
        </div>

        <section className="weather-section-card">
          <div className="weather-section-title">
            <div>
              <p className="eyebrow">Proximas horas</p>
              <h2>Pronostico horario</h2>
            </div>
          </div>

          <div className="hourly-strip">
            {nextHours.map((item) => (
              <article className="hourly-card" key={item.time}>
                <strong>{formatHour(item.time)}</strong>
                <span>{round(item.temperature)}°</span>
                <p>{weatherLabel(item.weatherCode)}</p>
                <small>{round(item.precipitation)}% lluvia</small>
              </article>
            ))}
          </div>
        </section>

        <section className="weather-section-card">
          <div className="weather-section-title">
            <div>
              <p className="eyebrow">Semana</p>
              <h2>Proximos dias</h2>
            </div>
          </div>

          <div className="daily-grid">
            {nextDays.map((item) => (
              <article className="daily-card" key={item.time}>
                <div>
                  <strong>{formatDay(item.time)}</strong>
                  <p>{weatherLabel(item.weatherCode)}</p>
                </div>
                <span>
                  {round(item.max)}° / {round(item.min)}°
                </span>
                <small>
                  Lluvia {round(item.precipitation)}% · Viento {round(item.wind)} km/h
                </small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
