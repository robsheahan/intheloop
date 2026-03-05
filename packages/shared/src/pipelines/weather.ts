import { PipelineContext, PipelineResult } from './types';
import { baseEntityName } from '../utils/category-fields';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export async function checkWeather(ctx: PipelineContext): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const entity of ctx.entities) {
    const city = baseEntityName(entity.entity_name);
    const alertType = (entity.entity_metadata.alert_type as string) || 'temp_above';
    const threshold = parseFloat(entity.entity_metadata.threshold as string);

    if (isNaN(threshold)) continue;

    try {
      const result = await fetchWeather(city, alertType, threshold);
      if (!result) continue;

      const dedupKey = `${result.city}|${alertType}|${result.forecastDate}`;

      results.push({
        entity_name: city,
        tracked_entity_id: entity.id,
        dedup_key: dedupKey,
        content: {
          type: 'weather',
          city: result.city,
          alert_type: alertType,
          threshold,
          value: result.currentValue,
          temp_max: result.tempMax,
          temp_min: result.tempMin,
          precipitation: result.precip,
          wind_speed: result.wind,
          forecast_date: result.forecastDate,
        },
      });
    } catch (err) {
      console.error(`Weather pipeline error for "${city}":`, err);
    }
  }

  return results;
}

interface WeatherResult {
  city: string;
  currentValue: number;
  tempMax: number | null;
  tempMin: number | null;
  precip: number | null;
  wind: number | null;
  forecastDate: string;
}

async function fetchWeather(
  city: string,
  alertType: string,
  threshold: number
): Promise<WeatherResult | null> {
  const geoRes = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!geoRes.ok) return null;

  const geoData = await geoRes.json();
  const locations = geoData.results || [];
  if (locations.length === 0) return null;

  const { latitude: lat, longitude: lon, name: resolvedName } = locations[0];

  const forecastParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '1',
  });

  const forecastRes = await fetch(`${FORECAST_URL}?${forecastParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!forecastRes.ok) return null;

  const forecast = await forecastRes.json();
  const daily = forecast.daily || {};

  const tempMax = daily.temperature_2m_max?.[0] ?? null;
  const tempMin = daily.temperature_2m_min?.[0] ?? null;
  const precip = daily.precipitation_sum?.[0] ?? null;
  const wind = daily.wind_speed_10m_max?.[0] ?? null;
  const forecastDate = daily.time?.[0] || '';

  let triggered = false;
  let currentValue = 0;

  if (alertType === 'temp_above' && tempMax !== null) {
    triggered = tempMax >= threshold;
    currentValue = tempMax;
  } else if (alertType === 'temp_below' && tempMin !== null) {
    triggered = tempMin <= threshold;
    currentValue = tempMin;
  } else if (alertType === 'rain_above' && precip !== null) {
    triggered = precip >= threshold;
    currentValue = precip;
  } else if (alertType === 'wind_above' && wind !== null) {
    triggered = wind >= threshold;
    currentValue = wind;
  }

  if (!triggered) return null;

  return { city: resolvedName || city, currentValue, tempMax, tempMin, precip, wind, forecastDate };
}
