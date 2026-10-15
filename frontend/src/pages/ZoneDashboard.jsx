import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, authApi, alertApi } from '../api';
import { formatToKst, formatMetricValue } from '../utils/format';
import AiAssessmentPanel from '../components/AiAssessmentPanel';
import {
  Thermometer,
  Droplets,
  Wind,
  Flame,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Send,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function ZoneDashboard({ initialZoneId }) {
  const { user, isAdmin, refreshUserData } = useAuth();
  const [accessibleZones, setAccessibleZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId || null);
  const [dashboardData, setDashboardData] = useState(null);
  const [seriesData, setSeriesData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(60); // 60분
  const [permissionError, setPermissionError] = useState(false);

  // Resolution modal
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [actionDetail, setActionDetail] = useState('');

  useEffect(() => {
    loadAccessibleZones();
  }, [user]);

  useEffect(() => {
    if (selectedZoneId) {
      loadZoneData(selectedZoneId);
      const timer = setInterval(() => {
        loadZoneData(selectedZoneId, false);
      }, 5000); // 5초마다 실시간 갱신 (ESP32 전송 주기)
      return () => clearInterval(timer);
    }
  }, [selectedZoneId, timeRange]);

  const loadAccessibleZones = async () => {
    try {
      const res = await authApi.getMyZones();
      const zones = res.data;
      setAccessibleZones(zones);
      if (zones.length > 0) {
        if (!selectedZoneId || !zones.some((z) => z.id === selectedZoneId)) {
          setSelectedZoneId(zones[0].id);
        }
      } else {
        setSelectedZoneId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadZoneData = async (zoneId, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setPermissionError(false);

    try {
      const [dashRes, alertRes] = await Promise.all([
        dashboardApi.getZoneDashboard(zoneId),
        alertApi.list({ zoneId, status: 'UNRESOLVED' }),
      ]);
      setDashboardData(dashRes.data);
      setAlerts(alertRes.data);

      // Load time series for chart
      const fromTime = new Date(Date.now() - timeRange * 60 * 1000).toISOString();
      const seriesRes = await dashboardApi.getZoneSeries(zoneId, { from: fromTime });
      processSeriesData(seriesRes.data);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setPermissionError(true);
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const processSeriesData = (readings) => {
    // Group readings by timestamp for Recharts
    const grouped = {};
    for (const r of readings) {
      const timeLabel = formatToKst(r.measuredAt, false);
      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { time: timeLabel, fullTime: r.measuredAt };
      }
      if (r.metricCode === 'TEMPERATURE') {
        grouped[timeLabel].temp = parseFloat(r.measuredValue);
      } else if (r.metricCode === 'HUMIDITY') {
        grouped[timeLabel].humid = parseFloat(r.measuredValue);
      } else if (r.metricCode === 'GAS') {
        // Distinguish gas if possible
        if (!grouped[timeLabel].gas) {
          grouped[timeLabel].gas = parseFloat(r.measuredValue);
        }
      }
    }
    const chartList = Object.values(grouped).sort(
      (a, b) => new Date(a.fullTime) - new Date(b.fullTime)
    );
    setSeriesData(chartList);
  };

  const handleResolveAlert = async (e) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    try {
      await alertApi.resolve(resolvingAlert.alertId, actionDetail);
      setResolvingAlert(null);
      setActionDetail('');
      loadZoneData(selectedZoneId, false);
    } catch (e) {
      alert('경고 조치 완료 처리 실패');
    }
  };

  // Case 1: No permissions granted to zone manager
  if (!isAdmin && accessibleZones.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">배정된 화장실(기기)이 없습니다</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            현재 <strong>{user?.displayName || user?.username}</strong> 계정에는 열람 권한이 부여된 ESP32 구역이 없습니다.
            <br />
            <strong>웹 관리자(admin)</strong>에게 문의하여 화장실 접근 권한을 배정받으세요.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left">
            <div className="font-semibold text-slate-700 mb-1">💡 시스템 안내:</div>
            <p>1. 우측 상단 로그아웃 후 <strong>관리자 계정(admin)</strong>으로 접속하세요.</p>
            <p>2. <strong>'관리자 권한 매핑'</strong> 탭에서 본 계정에 화장실 접근 권한을 부여하세요.</p>
            <p>3. 다시 본 계정으로 로그인하면 배정된 구역의 실시간 센서 대시보드가 열립니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: 403 Forbidden
  if (permissionError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-rose-800">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold">접근 권한 거부 (403 Forbidden)</h2>
          <p className="text-xs text-rose-600 mt-1">해당 화장실의 센서 데이터에 대한 조회 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  const latestTemp = dashboardData?.latestMetrics?.TEMPERATURE?.currentValue;
  const latestHumid = dashboardData?.latestMetrics?.HUMIDITY?.currentValue;
  const latestMq135 = dashboardData?.latestMetrics?.MQ135?.currentValue ?? dashboardData?.latestMetrics?.GAS?.currentValue;
  const latestMq7 = dashboardData?.latestMetrics?.MQ7?.currentValue;
  const comfortScore = dashboardData?.comfortScore;
  const isOnline = dashboardData?.hasOnlineDevice;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Zone selection bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">관제 화장실 선택:</span>
          </div>
          
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <select
              value={selectedZoneId || ''}
              onChange={(e) => setSelectedZoneId(Number(e.target.value))}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 pr-8 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer appearance-none shadow-xs hover:border-slate-400 transition"
            >
              {accessibleZones.map((z) => (
                <option key={z.id} value={z.id}>
                  🚻 {z.name} {z.address ? `(${z.address})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg hidden sm:inline-block">
            담당: {accessibleZones.length}곳
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-semibold text-slate-700">
              {isOnline ? 'ESP32 통신 정상 (온라인)' : 'ESP32 오프라인 대기'}
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>수신: {formatToKst(dashboardData?.lastDataReceivedAt)}</span>
          </div>
          <button
            onClick={() => loadZoneData(selectedZoneId)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-pulse-subtle">
          <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>⚠️ 화장실 내 이상 징후 감지 ({alerts.length}건)</span>
          </div>
          <div className="divide-y divide-rose-200/60">
            {alerts.map((a) => (
              <div key={a.alertId} className="pt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-rose-900">[{a.alertType === 'AI_ANOMALY' ? 'AI 이상 징후' : a.alertType}]</span>{' '}
                  <span className="text-rose-700">{a.message}</span>
                  <span className="text-[10px] text-rose-400 ml-2">
                    {formatToKst(a.createdAt, false)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setResolvingAlert(a);
                    setActionDetail('현장 환기 조치 및 점검 완료');
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  조치 완료
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Section Title */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
          <span>화장실 환경 종합 지표</span>
          {dashboardData?.devices?.length > 1 && (
            <span className="text-[11px] font-normal normal-case px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold">
              ESP32 {dashboardData.devices.length}대 종합 산출
            </span>
          )}
        </div>
        {dashboardData?.devices?.length > 0 && (
          <div className="text-[11px] text-slate-400">
            설치 기기: {dashboardData.devices.map((d) => d.setCode).join(', ')}
          </div>
        )}
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Comfort Score Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">기준값 기반 쾌적 지수</div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-4xl font-black text-slate-900">
                {comfortScore !== null && comfortScore !== undefined ? comfortScore : '-'}
              </span>
              {comfortScore !== null && comfortScore !== undefined && (
                <span className="text-xs font-semibold text-slate-400">/ 100 점</span>
              )}
            </div>
          </div>
          <div className="mt-3">
            {comfortScore !== null && comfortScore !== undefined ? (
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                  comfortScore >= 80
                    ? 'bg-emerald-100 text-emerald-800'
                    : comfortScore >= 50
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {dashboardData?.overallStatus === 'PLEASANT'
                  ? '🟢 쾌적함'
                  : dashboardData?.overallStatus === 'NEEDS_VENTILATION'
                  ? '🟡 환기 권장'
                  : '🔴 주의/점검'}
              </span>
            ) : (
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                ⚪ 센서 수집 대기
              </span>
            )}
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">실내 온도</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatMetricValue(latestTemp)} <span className="text-sm font-semibold text-slate-400">°C</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">적정: 18.0 ~ 26.0 °C</div>
        </div>

        {/* Humidity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">실내 습도</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatMetricValue(latestHumid)} <span className="text-sm font-semibold text-slate-400">%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">적정: 40.0 ~ 60.0 %</div>
        </div>

        {/* MQ-135 Gas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">공기질 (MQ-135)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {latestMq135 !== null && latestMq135 !== undefined ? (
              <>
                {formatMetricValue(latestMq135, 0)}{' '}
                <span className="text-xs font-semibold text-slate-400">ADC</span>
              </>
            ) : (
              <span className="text-slate-400 font-semibold text-base">-</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-purple-600 font-semibold">암모니아/악취 지수</div>
        </div>

        {/* MQ-7 Gas / Smoke */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">연기/CO (MQ-7)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {latestMq7 !== null && latestMq7 !== undefined ? (
              <>
                {formatMetricValue(latestMq7, 0)}{' '}
                <span className="text-xs font-semibold text-slate-400">ADC</span>
              </>
            ) : (
              <span className="text-slate-400 font-semibold text-base">-</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-semibold">화재/일산화탄소 감시</div>
        </div>
      </div>

      {/* Time Series Chart */}
      <AiAssessmentPanel assessments={dashboardData?.aiAssessments || []} />

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">실시간 센서 시계열 트렌드 그래프</h3>
            <p className="text-xs text-slate-500">ESP32 5초 주기 데이터 수집 곡선 (한국 표준시 KST 기준)</p>
          </div>
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeRange(10)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                timeRange === 10 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              최근 10분
            </button>
            <button
              onClick={() => setTimeRange(60)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                timeRange === 60 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              최근 1시간
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          {seriesData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              선택한 기간 동안 수집된 센서 데이터가 없습니다. 우측 상단 '가상 센서 패킷 발생기'를 통해 실시간 데이터를 전송해보세요.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8b5cf6' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  name="온도 (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="humid"
                  name="습도 (%)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gas"
                  name="가스 농도 (ADC)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Zone Devices Section (Multi-ESP32 Support) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              이 화장실에 배치된 ESP32 하드웨어 현황 ({dashboardData?.devices?.length ?? 0}대)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            같은 화장실에 여러 기기가 설치된 경우, 상단 지표는 종합/평균값이며 아래에서 기기별 실측치를 개별 비교할 수 있습니다.
          </span>
        </div>

        {(!dashboardData?.devices || dashboardData.devices.length === 0) ? (
          <div className="text-center py-8 text-xs text-slate-400">
            현재 이 화장실에 등록된 ESP32 기기가 없습니다. 웹 관리자 콘솔에서 기기를 등록하세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.devices.map((dev) => (
              <div
                key={dev.deviceSetId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                      <span>{dev.setCode}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          dev.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{dev.installationLabel}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dev.online ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {dev.online ? '온라인' : '오프라인'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  MAC: {dev.macAddress}
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/60 text-center">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                    <div className="text-[10px] text-slate-400">온도</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {dev.latestValues?.TEMPERATURE != null ? `${dev.latestValues.TEMPERATURE}°C` : '-'}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                    <div className="text-[10px] text-slate-400">습도</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {dev.latestValues?.HUMIDITY != null ? `${dev.latestValues.HUMIDITY}%` : '-'}
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-100">
                    <div className="text-[10px] text-slate-400">공기질</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {dev.latestValues?.MQ135 != null ? `${dev.latestValues.MQ135}` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Alert Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              이상치 경고 조치 완료 처리
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              조치 내용을 기록하면 시스템에서 경고가 해제되며, 조치 이력(ActionLog)에 관리자 정보와 함께 저장됩니다.
            </p>

            <form onSubmit={handleResolveAlert} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">조치 내용 상세</label>
                <textarea
                  required
                  rows={3}
                  value={actionDetail}
                  onChange={(e) => setActionDetail(e.target.value)}
                  placeholder="예: 현장 환기팬 가동 및 창문 개방 완료"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  조치 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
