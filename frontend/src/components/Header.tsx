import React from 'react';
import { RefreshCw, Sprout, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isBackendConnected: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isBackendConnected,
  isRefreshing,
  lastUpdated,
  onRefresh,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Sprout className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Smart Plant IoT
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                v1.0.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Hệ thống giám sát độ ẩm đất & điều khiển tưới thông minh
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isBackendConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {isBackendConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Backend Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Backend Offline</span>
              </>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu ngay lập tức"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {lastUpdated && (
            <span className="text-xs text-slate-400 hidden md:inline">
              Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

