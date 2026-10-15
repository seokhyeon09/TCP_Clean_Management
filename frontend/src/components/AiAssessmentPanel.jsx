import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { formatToKst } from '../utils/format';

const labels = {
  smoking: '흡연', smoke_residual: '흡연 후 잔류', occupancy_odor: '이용·냄새',
  handwashing_humidity: '손 씻기·습기', wet_floor: '젖은 바닥', cleaning_products: '청소 제품',
  cleaning_wet_floor: '청소+젖은 바닥', sanitizer: '소독제', fragrance: '방향제',
  door_open: '문 열림', window_open: '창문 열림', ventilation_change: '환기 변화',
  faucet_on: '수도 사용', leak_active: '누수', freeze_risk_1h: '1시간 내 동파', freeze_risk_3h: '3시간 내 동파',
};
const statusNames = {
  WARMING_UP: '준비 중', PENDING: '판정 대기', NO_DATA: '데이터 대기',
  OFFLINE: '오프라인', UNAVAILABLE: '연결 확인', DISABLED: '비활성화',
};
const levelStyles = {
  긴급: 'bg-rose-100 text-rose-800', 주의: 'bg-amber-100 text-amber-800',
  정보: 'bg-sky-100 text-sky-800', 평상시: 'bg-emerald-100 text-emerald-800',
};

export default function AiAssessmentPanel({ assessments = [] }) {
  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <BrainCircuit className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">AI 센서 종합 판정</h3>
          <p className="mt-1 text-xs text-slate-500">기기별 온습도·가스 이력으로 16개 항목을 판정합니다. 처음 2시간은 연속 데이터가 필요합니다.</p>
        </div>
      </div>
      {assessments.length === 0 && <p className="text-xs text-slate-500">등록된 기기의 판정 데이터를 기다리고 있습니다.</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {assessments.map((assessment) => {
          const result = assessment.result;
          const ready = assessment.status === 'READY';
          const level = ready ? result?.level : statusNames[assessment.status] || '판정 대기';
          const progress = Math.min(100, Math.round(100 * (result?.historyRows || 0) / (result?.warmupRows || 480)));
          return (
            <article key={assessment.deviceSetId} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-800">{assessment.setCode}</div>
                  <div className="text-xs text-slate-500">{assessment.installationLabel}</div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${levelStyles[level] || 'bg-slate-100 text-slate-600'}`}>{level}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800" role="status">{assessment.message}</p>
              {assessment.alertError && <p className="text-xs text-rose-700" role="alert">{assessment.alertError}</p>}
              {assessment.status === 'WARMING_UP' && (
                <div>
                  <progress className="w-full h-2 accent-indigo-600" value={progress} max="100" aria-label="AI 준비 진행률" />
                  <p className="text-xs text-slate-500 mt-1">연속 이력 {Math.floor((result?.historyRows || 0) / 4)} / 120분 · {progress}%</p>
                </div>
              )}
              {result && !result.mq7Available && (
                <p className="text-xs text-amber-700">MQ-7의 측정 가능 히터 구간 값이 없어 흡연 판정이 제한됩니다.</p>
              )}
              {ready && result?.items?.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {result.items.map((item) => (
                    <li key={item.code} className="flex gap-2 items-baseline">
                      <span className={`px-1.5 py-0.5 rounded ${levelStyles[item.level] || ''}`}>{item.level}</span>
                      <span className="text-slate-700">{item.message}</span>
                    </li>
                  ))}
                </ul>
              )}
              {ready && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-indigo-700 font-semibold">16개 항목별 모델 확률</summary>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(labels).map(([code, label]) => (
                      <div key={code} className="flex justify-between gap-2 text-slate-600">
                        <span>{label}</span>
                        <span className="font-mono">{typeof result?.probabilities?.[code] === 'number' ? `${(result.probabilities[code] * 100).toFixed(1)}%` : '-'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-slate-500">모델 확률은 실제 발생 확률을 보장하지 않습니다. 등급에는 항목별 임계값과 지속 시간 규칙이 함께 적용됩니다.</p>
                </details>
              )}
              {result?.at && <p className="text-[11px] text-slate-400">판정 기준: {formatToKst(result.at)}</p>}
            </article>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">합성 데이터로 학습된 참고 판정입니다. 실제 현장 검증이 필요하며, 문·창문·환기 변화·방향제 항목은 특히 정확도가 제한됩니다.</p>
    </section>
  );
}
