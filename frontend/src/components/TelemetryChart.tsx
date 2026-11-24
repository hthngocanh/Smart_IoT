import React from 'react';
import { TelemetryRecord } from '../types/telemetry';
import { LineChart as ChartIcon } from 'lucide-react';

interface TelemetryChartProps {
  data: TelemetryRecord[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ data }) => {
  // Sắp xếp dữ liệu theo thứ tự thời gian tăng dần để vẽ biểu đồ
  const sortedData = React.useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
  }, [data]);

  if (sortedData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <ChartIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Chưa có dữ liệu biểu đồ</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Khi ESP32 gửi gói tin telemetry hoặc có bản ghi mới, biểu đồ xu hướng độ ẩm đất theo thời gian sẽ hiển thị tại đây.
        </p>
      </div>
    );
  }

  // Kích thước SVG
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Dải giá trị ADC 12-bit là 0 - 4095
  const minY = 0;
  const maxY = 4095;

  // Tính toạ độ các điểm
  const points = sortedData.map((d, index) => {
    const x =
      sortedData.length > 1
        ? padding.left + (index / (sortedData.length - 1)) * innerWidth
        : padding.left + innerWidth / 2;
    const y = padding.top + innerHeight - ((d.soilMoistureRaw - minY) / (maxY - minY)) * innerHeight;
    return { x, y, raw: d.soilMoistureRaw, time: new Date(d.recordedAt) };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
      : '';

  const yTicks = [0, 1024, 2048, 3072, 4095];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-emerald-600" />
            Biểu Đồ Xu Hướng Độ Ẩm Đất (RAW ADC)
          </h2>
          <p className="text-xs text-slate-500">
            Hiển thị {sortedData.length} điểm đo gần nhất theo trục thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Tín hiệu ADC GPIO34 (0 - 4095)</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto pt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-64 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines ngang */}
          {yTicks.map((tick) => {
            const y = padding.top + innerHeight - ((tick - minY) / (maxY - minY)) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-sans"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Diện tích tô màu Gradient dưới đường biểu diễn */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Đường vẽ line chart */}
          <path
            d={pathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Điểm nút và nhãn giá trị */}
          {points.map((p, i) => (
            <g key={i} className="group">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                className="fill-white stroke-emerald-600 stroke-[2] hover:r-6 transition-all cursor-pointer"
              />
              {/* Nhãn thời gian ở trục X */}
              {(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0) && (
                <text
                  x={p.x}
                  y={padding.top + innerHeight + 20}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-sans"
                >
                  {p.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

