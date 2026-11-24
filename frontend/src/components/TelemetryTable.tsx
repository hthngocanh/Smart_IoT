import React from 'react';
import { TelemetryRecord, PaginationMeta } from '../types/telemetry';
import { ChevronLeft, ChevronRight, Database, Filter } from 'lucide-react';

interface TelemetryTableProps {
  records: TelemetryRecord[];
  pagination: PaginationMeta | null;
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  onPageChange: (newPage: number) => void;
}

export const TelemetryTable: React.FC<TelemetryTableProps> = ({
  records,
  pagination,
  selectedDevice,
  onDeviceChange,
  onPageChange,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            Lịch Sử Gói Tin Telemetry
          </h2>
          <p className="text-xs text-slate-500">
            Dữ liệu cảm biến được lưu trữ trực tiếp trong cơ sở dữ liệu PostgreSQL
          </p>
        </div>

        {/* Lọc theo Device ID */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc Device ID (ví dụ: ESP32_001)..."
              value={selectedDevice}
              onChange={(e) => onDeviceChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-56 transition-all"
            />
          </div>
          {selectedDevice && (
            <button
              onClick={() => onDeviceChange('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Chưa có bản ghi nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Hệ thống chưa ghi nhận gói tin cảm biến nào trong PostgreSQL{selectedDevice ? ` cho thiết bị "${selectedDevice}"` : ''}.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Mã Gói Tin (ID)</th>
                  <th className="px-5 py-3">Mã Thiết Bị (Device ID)</th>
                  <th className="px-5 py-3 text-right">Giá Trị RAW ADC</th>
                  <th className="px-5 py-3 text-right">Thời Gian Ghi Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => {
                  const date = new Date(r.recordedAt);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                        {r.id}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {r.deviceId}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {r.soilMoistureRaw}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ 4095</span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {date.toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Tổng cộng <span className="font-bold text-slate-800">{pagination.total}</span> bản ghi (Trang {pagination.page}/{pagination.totalPages})
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  {pagination.page}
                </span>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

