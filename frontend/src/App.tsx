import { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { TelemetryChart } from './components/TelemetryChart';
import { TelemetryTable } from './components/TelemetryTable';
import { fetchHealth, fetchLatestTelemetry, fetchTelemetryHistory } from './services/api';
import { PaginationMeta, TelemetryRecord } from './types/telemetry';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [dbLatencyMs, setDbLatencyMs] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [latestRecord, setLatestRecord] = useState<TelemetryRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TelemetryRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadData = useCallback(async () => {
    try {
      // 1. Kiểm tra sức khỏe Backend & DB
      try {
        const health = await fetchHealth();
        setIsBackendConnected(health.backend?.status === 'up');
        setDbStatus(health.database?.status === 'connected' ? 'connected' : 'disconnected');
        setDbLatencyMs(health.database?.latencyMs);
        setErrorMessage(null);
      } catch (healthErr: any) {
        setIsBackendConnected(false);
        setDbStatus('disconnected');
        setErrorMessage('Không thể kết nối đến Backend Server (http://localhost:3000). Vui lòng đảm bảo Backend đang chạy.');
        return;
      }

      // 2. Tải bản ghi mới nhất
      try {
        const latestRes = await fetchLatestTelemetry(selectedDevice || undefined);
        setLatestRecord(latestRes.data);
      } catch (latestErr) {
        console.error('Lỗi tải latest telemetry:', latestErr);
      }

      // 3. Tải lịch sử phân trang
      try {
        const historyRes = await fetchTelemetryHistory(selectedDevice || undefined, currentPage, 15);
        setHistoryRecords(historyRes.data || []);
        setPagination(historyRes.pagination || null);
      } catch (histErr) {
        console.error('Lỗi tải telemetry history:', histErr);
      }

      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDevice, currentPage]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Vòng lặp polling tự động cập nhật dữ liệu mỗi 3 giây
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        isBackendConnected={isBackendConnected}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        onRefresh={handleManualRefresh}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner cảnh báo lỗi khi mất kết nối Backend */}
        {errorMessage && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-800 shadow-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">Mất kết nối máy chủ: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Cụm 4 Card thông số trạng thái */}
        <MetricCards
          latestRecord={latestRecord}
          dbStatus={dbStatus}
          dbLatencyMs={dbLatencyMs}
        />

        {/* Biểu đồ xu hướng độ ẩm đất RAW theo thời gian */}
        <TelemetryChart data={historyRecords} />

        {/* Bảng dữ liệu lịch sử và phân trang */}
        <TelemetryTable
          records={historyRecords}
          pagination={pagination}
          selectedDevice={selectedDevice}
          onDeviceChange={(dev) => {
            setSelectedDevice(dev);
            setCurrentPage(1);
          }}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Đề tài: Xây dựng hệ thống tưới cây thông minh ứng dụng IoT, giám sát độ ẩm đất và điều khiển tưới tự động từ xa © 2026
      </footer>
    </div>
  );
}

export default App;

