import React from 'react';
import { Activity, Clock, Cpu, Database } from 'lucide-react';
import { TelemetryRecord } from '../types/telemetry';

interface MetricCardsProps {
  latestRecord: TelemetryRecord | null;
  dbStatus: 'connected' | 'disconnected' | 'unknown';
  dbLatencyMs?: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  latestRecord,
  dbStatus,
  dbLatencyMs,
}) => {
  // Đánh giá trạng thái thiết bị: Nếu có tin nhắn trong vòng 30 giây gần nhất là Online (chu kỳ telemetry ESP32 là 5s)
  const isDeviceActive = React.useMemo(() => {
    if (!latestRecord) return false;
    const diffSeconds = (Date.now() - new Date(latestRecord.recordedAt).getTime()) / 1000;
    return diffSeconds >= -5 && diffSeconds <= 30;
  }, [latestRecord]);

  const formattedTime = React.useMemo(() => {
    if (!latestRecord) return 'Chưa có bản ghi';
    const date = new Date(latestRecord.recordedAt);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, [latestRecord]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Độ ẩm RAW hiện tại */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Độ Ẩm Đất (RAW ADC)
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          {latestRecord ? (
            <>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {latestRecord.soilMoistureRaw}
              </span>
              <span className="text-xs font-medium text-slate-400">/ 4095 ADC</span>
            </>
          ) : (
            <span className="text-xl font-bold text-slate-400 italic">Chưa có dữ liệu</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {latestRecord
            ? 'Tín hiệu Analog 12-bit đọc từ GPIO34'
            : 'Đang đợi gói tin từ vi điều khiển'}
        </p>
      </div>

      {/* 2. Trạng thái Thiết bị ESP32 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Thiết Bị ESP32
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          {latestRecord ? (
            <span className="text-xl font-bold text-slate-900">
              {latestRecord.deviceId}
            </span>
          ) : (
            <span className="text-xl font-bold text-slate-400 italic">Chưa kết nối</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isDeviceActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          <span className="text-xs font-medium text-slate-600">
            {isDeviceActive ? 'Đang truyền dữ liệu' : 'Mất kết nối / Chưa gửi tin'}
          </span>
        </div>
      </div>

      {/* 3. Thời điểm nhận dữ liệu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Thời Điểm Nhận
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-sm font-semibold text-slate-800 break-words block">
            {formattedTime}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Ghi nhận tự động bởi Backend Server
        </p>
      </div>

      {/* 4. Cơ sở dữ liệu PostgreSQL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            PostgreSQL 16
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-xl font-bold ${
              dbStatus === 'connected' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
          {dbLatencyMs !== undefined && (
            <span className="text-xs font-medium text-slate-400">({dbLatencyMs}ms)</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Database: smart_plant (Docker)
        </p>
      </div>
    </div>
  );
};

