# 원본 모델

- 저장소: https://github.com/bangak684/restroom_sensor_ai
- 고정 커밋: `e66ee4e67d79a87a0e6b9fe4790ec33e7b7c0267`
- 모델 SHA-256: `a303cbf8f9d56ac6943657fb2a57f2e433793bc35aeee08acd3975e871c99176`
- 변경 없이 복사한 파일: `restroom_unified/{__init__,features,model,rules}.py`, `models/unified/{unified_model.joblib,policy.json}`
- 모델 실행 라이브러리 버전은 원본 `requirements.txt`와 동일하며, 어댑터의 한국 시간대 처리를 위해 `tzdata`를 추가했습니다. 학습 데이터·학습 도구·그래프 라이브러리는 배포에 포함하지 않습니다.

`inference.py`는 원본 특징 계산과 판정 규칙을 배치로 실행하는 어댑터입니다. 마지막 10시간의 연속된 15초 이력을 받아 특징을 한 번에 계산하고, 준비 완료 시점부터 판정을 순서대로 재생합니다. 장치 간 공유 상태가 없으므로 재시도, 재시작, 여러 조회자가 모델의 이력을 늘리지 않습니다. 시간대에 영향을 받는 특징과 겨울철 규칙에는 Asia/Seoul을 적용합니다.

원본은 **합성 데이터로만 학습·평가**했습니다. 현장 데이터로 성능과 임계값을 검증해야 합니다. 원본은 DHT11을 모형화했으며, 이 시스템의 DHT22 입력은 같은 °C/% 단위로 전달하지만 별도의 현장 검증이 필요합니다. 원본의 설명과 성능은 [README](https://github.com/bangak684/restroom_sensor_ai/blob/e66ee4e67d79a87a0e6b9fe4790ec33e7b7c0267/README.md), [알고리즘](https://github.com/bangak684/restroom_sensor_ai/blob/e66ee4e67d79a87a0e6b9fe4790ec33e7b7c0267/docs/ALGORITHMS.md)을 참고하세요.
