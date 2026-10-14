import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, dashboardApi, alertApi } from '../api';
import { formatToKst, formatMetricValue } from '../utils/format';
import {
  Building2,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Cpu,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export default function ZoneOverview({ onSelectZone }) {
  const { user, isAdmin } = useAuth();
  const [zones, setZones] = useState([]);
  const [zoneDataMap, setZoneDataMap] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PLEASANT, NEEDS_VENTILATION, WARNING, NO_DATA

  useEffect(() => {
    loadOverviewData();
    const timer = setInterval(() => {
      loadOverviewData(false);
    }, 5000); // 5초마다 실시간 갱신
    return () => clearInterval(timer);
  }, [user]);

  const loadOverviewData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      // 1. Get accessible zones for current user
      const [zRes, alertRes] = await Promise.all([
        authApi.getMyZones(),
        alertApi.list({ status: 'UNRESOLVED' }),
      ]);
      const zoneList = zRes.data;
      setZones(zoneList);
      setAlerts(alertRes.data);

      // 2. Fetch dashboard data for all zones in parallel
      const results = await Promise.all(
        zoneList.map(async (z) => {
          try {
            const res = await dashboardApi.getZoneDashboard(z.id);
            return { id: z.id, data: res.data };
          } catch (e) {
            return null;
          }
        })
      );

      const map = {};
      results.forEach((r) => {
        if (r) map[r.id] = r.data;
      });
      setZoneDataMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // KPI calculations
  const totalZones = zones.length;
  const pleasantCount = zones.filter((z) => zoneDataMap[z.id]?.overallStatus === 'PLEASANT').length;
  const needsVentCount = zones.filter((z) => zoneDataMap[z.id]?.overallStatus === 'NEEDS_VENTILATION').length;
  const warningCount = zones.filter((z) => zoneDataMap[z.id]?.overallStatus === 'WARNING').length;
  const totalOnlineDevices = zones.reduce((acc, z) => {
    const devs = zoneDataMap[z.id]?.devices || [];
    return acc + devs.filter((d) => d.online).length;
  }, 0);

  // Filtering
  const filteredZones = zones.filter((z) => {
    const data = zoneDataMap[z.id];
    const matchesSearch =
      z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (z.address && z.address.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    return data?.overallStatus === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>화장실 구역(Zone) 통합 현황</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Zone Overview
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? '전체 화장실의 실시간 쾌적도, 온습도, 공기질 및 ESP32 기기 상태를 한눈에 모니터링합니다.'
              : `${user?.displayName || user?.username} 님이 담당하는 화장실 구역 전체의 실시간 상태를 한눈에 파악합니다.`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadOverviewData(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500">관제 대상 화장실</div>
          <div className="mt-1 text-2xl font-black text-slate-800">{totalZones} <span className="text-xs font-semibold text-slate-400">구역</span></div>
          <div className="text-[10px] text-slate-400 mt-1">담당 구역 총합</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-emerald-700">🟢 쾌적 화장실</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{pleasantCount} <span className="text-xs font-semibold text-slate-400">구역</span></div>
          <div className="text-[10px] text-emerald-600/70 mt-1">지수 80점 이상</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-amber-700">🟡 환기 권장</div>
          <div className="mt-1 text-2xl font-black text-amber-600">{needsVentCount} <span className="text-xs font-semibold text-slate-400">구역</span></div>
          <div className="text-[10px] text-amber-600/70 mt-1">습도/가스 주의</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-rose-700">🔴 주의/점검 필요</div>
          <div className="mt-1 text-2xl font-black text-rose-600">{warningCount} <span className="text-xs font-semibold text-slate-400">구역</span></div>
          <div className="text-[10px] text-rose-600/70 mt-1">이상치 감지됨</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-sky-700">실시간 통신 기기</div>
          <div className="mt-1 text-2xl font-black text-sky-600 flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{totalOnlineDevices}</span>
            <span className="text-xs font-semibold text-slate-400">대</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">온라인 ESP32</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="화장실 이름 또는 건물/위치 검색..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 text-xs overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">상태 필터:</span>
          {[
            { key: 'ALL', label: '전체 보기' },
            { key: 'PLEASANT', label: '쾌적' },
            { key: 'NEEDS_VENTILATION', label: '환기 필요' },
            { key: 'WARNING', label: '주의' },
            { key: 'NO_DATA', label: '대기 중' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filterStatus === f.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone Cards Grid */}
      {filteredZones.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">해당하는 화장실 구역이 없습니다</h3>
          <p className="text-xs text-slate-400 mt-1">
            검색어 또는 상태 필터를 조정하시거나, 관리자에게 구역 접근 권한을 확인하세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredZones.map((z) => {
            const data = zoneDataMap[z.id];
            const score = data?.comfortScore;
            const devices = data?.devices || [];
            const onlineDevCount = devices.filter((d) => d.online).length;
            const mq135Val = data?.latestMetrics?.MQ135?.currentValue ?? data?.latestMetrics?.GAS?.currentValue;
            const mq7Val = data?.latestMetrics?.MQ7?.currentValue;
            const tempVal = data?.latestMetrics?.TEMPERATURE?.currentValue;
            const humidVal = data?.latestMetrics?.HUMIDITY?.currentValue;

            return (
              <div
                key={z.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top: Zone Info & Status Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition flex items-center space-x-1.5">
                        <span>{z.name}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{z.address}</p>
                    </div>

                    <div>
                      {score !== null && score !== undefined ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            score >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : score >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {data?.overallStatus === 'PLEASANT'
                            ? '🟢 쾌적함'
                            : data?.overallStatus === 'NEEDS_VENTILATION'
                            ? '🟡 환기 권장'
                            : '🔴 주의'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          ⚪ 수집 대기
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Score & Status Message */}
                  <div className="mt-3.5 flex items-baseline justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">종합 쾌적 지수</div>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">
                        {score !== null && score !== undefined ? `${score} 점` : '-'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 max-w-[160px] leading-snug">
                      {data?.statusMessage || '상태 측정 중'}
                    </div>
                  </div>

                  {/* 4 Sensor Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-amber-600">
                        <Thermometer className="w-3.5 h-3.5" />
                        <span className="text-[11px] text-slate-500">온도</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {formatMetricValue(tempVal)} °C
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-sky-600">
                        <Droplets className="w-3.5 h-3.5" />
                        <span className="text-[11px] text-slate-500">습도</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {formatMetricValue(humidVal)} %
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-purple-600">
                        <Wind className="w-3.5 h-3.5" />
                        <span className="text-[11px] text-slate-500">공기질</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {formatMetricValue(mq135Val, 0)} <span className="text-[10px] text-slate-400 font-normal">ADC</span>
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-rose-600">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-[11px] text-slate-500">연기/CO</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {formatMetricValue(mq7Val, 0)} <span className="text-[10px] text-slate-400 font-normal">ADC</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Devices & Navigate Button */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        ESP32 <strong>{devices.length}대</strong> ({onlineDevCount}대 온라인)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatToKst(data?.lastDataReceivedAt, false)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectZone && onSelectZone(z.id)}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 font-bold rounded-xl text-xs transition duration-150 shadow-xs"
                  >
                    <span>실시간 상세 관제 바로가기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
