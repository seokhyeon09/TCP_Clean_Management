"""Synthetic data test suite for restroom sensor AI judgment engine."""
from datetime import datetime, timedelta, timezone
import json
import time
from urllib.request import Request, urlopen

from inference import evaluate
from restroom_unified.model import UnifiedModel


def generate_scenario(name, count=500, start_dt=None):
    if start_dt is None:
        start_dt = datetime(2026, 10, 15, 8, 0, 0, tzinfo=timezone.utc)
    
    samples = []
    
    for i in range(count):
        t_stamp = start_dt + timedelta(seconds=i * 15)
        
        if name == "normal":
            # 정상 평상시: 쾌적한 실내 환경
            temp = 22.0 + (i % 5) * 0.1
            humid = 50.0 + (i % 7) * 0.2
            mq135 = 1100 + (i % 13) * 5
            mq7 = 550 + (i % 9) * 4 if i % 10 >= 4 else None

        elif name == "smoking_alarm":
            # 흡연 발생 시나리오: 470행까지 정상이다가 급격한 CO + 연기 급증
            if i < 470:
                temp = 22.0 + (i % 5) * 0.1
                humid = 50.0 + (i % 7) * 0.2
                mq135 = 1100 + (i % 13) * 5
                mq7 = 550 if i % 10 >= 4 else None
            else:
                progress = i - 470
                temp = 22.5 + progress * 0.05
                humid = 52.0 - progress * 0.1
                # 연기 및 일산화탄소 대폭 상승
                mq135 = min(3800, 1500 + progress * 100)
                mq7 = min(3500, 1200 + progress * 120)

        elif name == "freeze_risk":
            # 겨울철 동파 위험 시나리오: 1월 혹한기, 실내 온도가 15도에서 급격히 영하로 추락
            winter_start = datetime(2026, 1, 15, 2, 0, 0, tzinfo=timezone.utc)
            t_stamp = winter_start + timedelta(seconds=i * 15)
            if i < 400:
                temp = 10.0 - (i / 400.0) * 8.0 # 10도 -> 2도
            else:
                temp = max(-6.0, 2.0 - (i - 400) * 0.1) # 2도 -> -6도
            humid = 70.0 + (i % 5) * 1.0
            mq135 = 1000 + (i % 11) * 3
            mq7 = 500 if i % 10 >= 4 else None

        elif name == "cleaning_wet_floor":
            # 화장실 청소 및 소독제, 물청소 젖은 바닥
            if i < 460:
                temp = 22.0
                humid = 50.0
                mq135 = 1100
                mq7 = 550 if i % 10 >= 4 else None
            else:
                progress = i - 460
                temp = 21.0 - progress * 0.05 # 물 증발로 인한 미세 온도 하강
                humid = min(92.0, 55.0 + progress * 1.5) # 물청소로 습도 급상승
                mq135 = min(3600, 1400 + progress * 90) # 소독제/락스 화학 냄새
                mq7 = 550 if i % 10 >= 4 else None # CO는 정상

        elif name == "water_leak":
            # 지속적인 배관 누수 시나리오 (습도 90% 이상 30분 이상 장기 지속)
            if i < 200:
                temp = 21.0
                humid = 55.0 + (i / 200.0) * 20.0
            else:
                temp = 20.0
                humid = min(96.0, 75.0 + ((i - 200) / 100.0) * 15.0)
            mq135 = 1050 + (i % 5) * 4 # 가스 정상
            mq7 = 500 if i % 10 >= 4 else None

        elif name == "warmup":
            # 예열 단계: 샘플 수 부족 (300개 < 480개)
            temp = 22.0
            humid = 50.0
            mq135 = 1100
            mq7 = 550 if i % 10 >= 4 else None

        else:
            raise ValueError(f"Unknown scenario {name}")

        samples.append({
            "at": t_stamp.isoformat().replace("+00:00", "Z"),
            "temperature": round(temp, 2),
            "humidity": round(humid, 2),
            "mq135Adc": int(mq135),
            "mq7Adc": int(mq7) if mq7 is not None else None
        })
        
    return {"deviceId": f"test-{name}", "samples": samples}


def run_tests():
    print("=" * 75)
    print("   [Sensor AI 합성 데이터 판정 테스트 시작]   ")
    print("=" * 75)
    
    model = UnifiedModel.load()
    print("✓ 머신러닝 통합 모델 로드 완료 (models/unified/unified_model.joblib)")
    print()

    scenarios = [
        ("정상 상태 (Normal Baseline)", "normal", 500),
        ("흡연 발생 (Smoking Event)", "smoking_alarm", 500),
        ("동파 위험 (Winter Freeze Hazard)", "freeze_risk", 500),
        ("청소 및 소독 / 바닥 젖음 (Cleaning & Wet Floor)", "cleaning_wet_floor", 500),
        ("지속 누수 (Water Leakage)", "water_leak", 500),
        ("센서 예열 중 (Warming Up < 2시간)", "warmup", 300),
    ]

    results = []

    for desc, key, count in scenarios:
        data = generate_scenario(key, count=count)
        start_time = time.time()
        
        # 1. Direct Python Evaluation
        res = evaluate(data, model)
        elapsed_ms = (time.time() - start_time) * 1000

        # 2. HTTP Server Evaluation via localhost:8090
        try:
            req = Request("http://127.0.0.1:8090/evaluate",
                          data=json.dumps(data).encode("utf-8"),
                          headers={"Content-Type": "application/json"})
            with urlopen(req, timeout=10) as http_res:
                http_body = json.loads(http_res.read().decode("utf-8"))
                http_ok = True
        except Exception as e:
            http_body = str(e)
            http_ok = False

        results.append({
            "desc": desc,
            "key": key,
            "count": count,
            "elapsed_ms": elapsed_ms,
            "ready": res.get("ready"),
            "level": res.get("level"),
            "headline": res.get("headline"),
            "labels": res.get("labels", []),
            "smoking": res.get("smoking", {}),
            "freeze": res.get("freeze_levels", {}),
            "items": res.get("items", []),
            "checks": res.get("checks", []),
            "top_probs": sorted(res.get("probabilities", {}).items(), key=lambda x: -x[1])[:4],
            "http_ok": http_ok
        })

    # Print summary
    for r in results:
        print(f"▶ 시나리오: {r['desc']}")
        print(f"  - 샘플 수: {r['count']}개 ({r['count'] * 15 / 60:.1f}분치 이력) | 연산 시간: {r['elapsed_ms']:.1f}ms | HTTP 서버 연동: {'성공(200 OK)' if r['http_ok'] else '실패'}")
        print(f"  - 판정 상태: ready={r['ready']} | 등급: [{r['level']}] | 헤드라인: \"{r['headline']}\"")
        if r['labels']:
            print(f"  - 감지된 라벨: {', '.join(r['labels'])}")
        if r['items']:
            items_str = " / ".join([f"({it['level']}) {it['message']}" for it in r['items']])
            print(f"  - 알림 항목: {items_str}")
        if r['smoking'].get('score') is not None:
            sm = r['smoking']
            print(f"  - 흡연 분석: score={sm.get('score')} | alarm={sm.get('alarm')} | suspect={sm.get('suspect')}")
        if r['freeze']:
            fr = r['freeze']
            print(f"  - 동파 분석: 1시간 위험={fr.get('freeze_risk_1h')} | 3시간 위험={fr.get('freeze_risk_3h')}")
        if r['top_probs']:
            top_str = ", ".join([f"{k}: {v*100:.1f}%" for k, v in r['top_probs']])
            print(f"  - 상위 확률: {top_str}")
        if r['checks']:
            print(f"  - 복합 교차검증: {', '.join(r['checks'])}")
        print("-" * 75)

    return results


if __name__ == "__main__":
    run_tests()
