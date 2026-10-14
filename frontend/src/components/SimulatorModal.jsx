import React, { useState, useEffect } from 'react';
import { deviceApi, iotSimulateApi } from '../api';
import { Cpu, X, Send, AlertTriangle, CheckCircle, Flame, Snowflake, Wind, Activity } from 'lucide-react';

export default function SimulatorModal({ isOpen, onClose, onDataSent }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [temperature, setTemperature] = useState(23.5);
  const [humidity, setHumidity] = useState(52.0);
  const [mq135Gas, setMq135Gas] = useState(1150);
  const [mq7Co, setMq7Co] = useState(380);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      const res = await deviceApi.list();
      const list = res.data.filter((d) => d.active);
      setDevices(list);
      if (list.length > 0 && !selectedDevice) {
        setSelectedDevice(list[0]);
      }
    } catch (e) {
      setLog('기기 목록을 불러오지 못했습니다.');
    }
  };

  const applyPreset = (type) => {
    if (type === 'normal') {
      setTemperature(22.0);
      setHumidity(48.5);
      setMq135Gas(1100);
      setMq7Co(350);
      setLog('👉 [정상 쾌적] 프리셋이 적용되었습니다.');
    } else if (type === 'smoke') {
      setTemperature(26.5);
      setHumidity(64.0);
      setMq135Gas(2750);
      setMq7Co(3400);
      setLog('👉 [흡연/연기 의심] 고농도 가스 프리셋이 적용되었습니다.');
    } else if (type === 'freeze') {
      setTemperature(-3.2);
      setHumidity(42.0);
      setMq135Gas(950);
      setMq7Co(320);
      setLog('👉 [동파 위험] 영하 기온 프리셋이 적용되었습니다.');
    } else if (type === 'humid') {
      setTemperature(24.0);
      setHumidity(86.5);
      setMq135Gas(1650);
      setMq7Co(420);
      setLog('👉 [환기 권장] 고습도 프리셋이 적용되었습니다.');
    }
  };

  const sendPacket = async () => {
    if (!selectedDevice) {
      setLog('선택된 ESP32 기기가 없습니다.');
      return;
    }

    setLoading(true);
    setLog('전송 중...');

    try {
      const sampleKeyBase = `${selectedDevice.macAddress}:${Date.now()}`;
      const nowIso = new Date().toISOString();

      // DHT22 (온도 & 습도)
      const dhtSensorId = selectedDevice.sensorIds?.DHT22;
      if (dhtSensorId) {
        await iotSimulateApi.sendData(dhtSensorId, {
          sampleKey: `${sampleKeyBase}:DHT`,
          macAddress: selectedDevice.macAddress,
          measuredAt: nowIso,
          readings: [
            { metricCode: 'TEMPERATURE', measuredValue: parseFloat(temperature) },
            { metricCode: 'HUMIDITY', measuredValue: parseFloat(humidity) },
          ],
        });
      }

      // MQ-135 (공기질)
      const mq135SensorId = selectedDevice.sensorIds?.MQ135;
      if (mq135SensorId) {
        await iotSimulateApi.sendData(mq135SensorId, {
          sampleKey: `${sampleKeyBase}:MQ135`,
          macAddress: selectedDevice.macAddress,
          measuredAt: nowIso,
          readings: [
            { metricCode: 'GAS', measuredValue: parseFloat(mq135Gas) },
          ],
        });
      }

      // MQ-7 (일산화탄소/연기)
      const mq7SensorId = selectedDevice.sensorIds?.MQ7;
      if (mq7SensorId) {
        await iotSimulateApi.sendData(mq7SensorId, {
          sampleKey: `${sampleKeyBase}:MQ7`,
          macAddress: selectedDevice.macAddress,
          measuredAt: nowIso,
          readings: [
            { metricCode: 'GAS', measuredValue: parseFloat(mq7Co) },
          ],
        });
      }

      setLog(`✅ [성공] ${selectedDevice.setCode} (${selectedDevice.zoneName}) 로 센서 패킷 3건이 성공적으로 전송되었습니다!`);
      if (onDataSent) onDataSent();
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      setLog(`❌ [오류] 전송 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">가상 센서 패킷 발생기</h3>
              <p className="text-xs text-slate-500">테스트용 가상 센서 데이터 전송 도구</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Target device select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">대상 ESP32 디바이스 선택</label>
            {devices.length === 0 ? (
              <div className="text-xs text-rose-500 p-2 bg-rose-50 rounded-lg">
                등록된 활성 ESP32 기기가 없습니다. 웹 관리자 콘솔에서 먼저 기기를 등록해주세요.
              </div>
            ) : (
              <select
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                value={selectedDevice?.deviceSetId || ''}
                onChange={(e) => {
                  const dev = devices.find((d) => d.deviceSetId === Number(e.target.value));
                  setSelectedDevice(dev);
                }}
              >
                {devices.map((d) => (
                  <option key={d.deviceSetId} value={d.deviceSetId}>
                    [{d.setCode}] {d.zoneName} - {d.installationLabel} ({d.macAddress})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">테스트용 시나리오 프리셋</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('normal')}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>🟢 쾌적 정상 상태</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('smoke')}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition"
              >
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>🚨 흡연/연기 의심</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('freeze')}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 transition"
              >
                <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                <span>❄️ 동파 위험 (영하)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('humid')}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
              >
                <Wind className="w-3.5 h-3.5 text-amber-600" />
                <span>💨 환기 권장 (고습도)</span>
              </button>
            </div>
          </div>

          {/* Manual inputs */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">온도 (°C)</label>
              <input
                type="number"
                step="0.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1 mt-0.5 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">습도 (%)</label>
              <input
                type="number"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1 mt-0.5 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">MQ-135 공기질 (ADC)</label>
              <input
                type="number"
                step="50"
                value={mq135Gas}
                onChange={(e) => setMq135Gas(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1 mt-0.5 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">MQ-7 일산화탄소 (ADC)</label>
              <input
                type="number"
                step="50"
                value={mq7Co}
                onChange={(e) => setMq7Co(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded px-2.5 py-1 mt-0.5 bg-white"
              />
            </div>
          </div>

          {/* Log / Message */}
          {log && (
            <div className="p-2.5 text-xs rounded-lg bg-slate-100 text-slate-700 font-mono border border-slate-200">
              {log}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              닫기
            </button>
            <button
              type="button"
              disabled={loading || !selectedDevice}
              onClick={sendPacket}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? '전송 중...' : '가상 패킷 즉시 전송'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
