import { HealthResponse, LatestTelemetryResponse, TelemetryHistoryResponse } from '../types/telemetry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok && res.status !== 503) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchLatestTelemetry(deviceId?: string): Promise<LatestTelemetryResponse> {
  const url = new URL(`${API_BASE_URL}/telemetry/latest`, window.location.origin);
  if (deviceId) {
    url.searchParams.append('deviceId', deviceId);
  }
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    throw new Error(`Lỗi tải dữ liệu mới nhất: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchTelemetryHistory(
  deviceId?: string,
  page = 1,
  limit = 20,
): Promise<TelemetryHistoryResponse> {
  const url = new URL(`${API_BASE_URL}/telemetry`, window.location.origin);
  if (deviceId) {
    url.searchParams.append('deviceId', deviceId);
  }
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    throw new Error(`Lỗi tải lịch sử dữ liệu: HTTP ${res.status}`);
  }
  return res.json();
}

