export interface TelemetryRecord {
  id: string;
  deviceId: string;
  soilMoistureRaw: number;
  recordedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TelemetryHistoryResponse {
  success: boolean;
  data: TelemetryRecord[];
  pagination: PaginationMeta;
}

export interface LatestTelemetryResponse {
  success: boolean;
  data: TelemetryRecord | null;
  message?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  backend: {
    status: 'up';
    uptime: number;
    timestamp: string;
  };
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
}

