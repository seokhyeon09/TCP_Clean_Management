# TCP Clean Management

ESP32 센서 수집, 화장실별 대시보드, AI 환경 판정 및 이상 알림 관리 시스템입니다.

## 실행

Docker Desktop 또는 Docker Engine을 실행한 뒤 프로젝트 루트에서:

```sh
docker compose up --build -d
```

- 대시보드: http://localhost:3000
- 백엔드: http://localhost:8080
- `sensor-ai`: 내부 네트워크의 8090 포트에서 실행하며 외부 포트는 공개하지 않습니다.

MySQL, Redis, Python AI, Spring Boot, React가 함께 시작됩니다. AI가 연결되지 않아도 센서 수집과 대시보드는 작동하며 AI 영역에는 연결 상태가 표시됩니다.

**기존 MySQL DB는 `backend/db/migrate_sensor_ai.sql`을 적용해야 합니다.** `ddl-auto=update`도 기존 MySQL ENUM의 새 알림 유형은 자동 추가하지 않습니다. 다음은 PowerShell 실행 예이며, 스크립트는 재실행해도 안전합니다. 새 빈 DB는 애플리케이션이 전체 스키마를 생성합니다.

```powershell
Get-Content backend/db/migrate_sensor_ai.sql | docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u tcp_user tcp_clean_db'
```

`ddl-auto=update`를 끈 환경에서는 백엔드 배포 전에 이 스크립트를 적용하세요. 알림 저장에 실패하더라도 AI 판정은 유지되며 화면에 저장 오류를 따로 표시합니다.

## 센서 AI 연동

원본: [bangak684/restroom_sensor_ai](https://github.com/bangak684/restroom_sensor_ai), 커밋 `e66ee4e67d79a87a0e6b9fe4790ec33e7b7c0267`. 학습된 모델과 실행 코드가 `ai-service/`에 포함되어 있습니다. [모델 출처와 어댑터 설명](ai-service/UPSTREAM.md).

1. 기존 센서 수집 API로 DHT22의 온도·습도와 MQ-135의 **12비트 원시 ADC 값(0~4095)**을 전송합니다. ppm이나 전압으로 변환한 가스 값은 AI 입력으로 사용하지 마세요.
2. 백엔드는 활성 ESP32의 **현재 설치 이력별로** 최근 10시간을 조회하고, 5초 전송을 닫힌 15초 구간으로 묶습니다. 온습도는 마지막 값, MQ-135는 중앙값, MQ-7은 마지막 유효 히터 구간 값을 사용합니다. 개별 센서 전송이 완료될 시간을 위해 5초 여유를 둡니다.
3. 480개의 연속 구간(약 2시간)이 모이면 16개 항목의 판정을 시작합니다. 필수 값이 누락되거나 유효 범위를 벗어난 구간, 설치 위치·보드 변경은 준비 이력을 다시 시작합니다. 누락된 값을 인위적으로 채우지 않습니다. 이미 저장된 이력은 서비스 재시작 후 재사용합니다.
4. 관리자/담당자 화장실 상세 화면의 **AI 센서 종합 판정**에서 준비 진행률, 등급, 항목별 결과·확률을 확인합니다. 기존 쾌적 지수는 기준값 기반 지표로 별도 표시합니다.
5. AI가 `주의` 또는 `긴급`으로 판정하면 기존 조치 관리에 `AI_ANOMALY` 알림을 저장합니다. 설치·판정 항목별 미해결 AI 알림은 중복 생성하지 않으며, 조치한 알림도 생성 후 30분 동안 재생성을 억제합니다. 다른 종류의 이상 징후와 흡연 의심→경보 등 단계 상승은 별도 알림을 생성합니다. 기존 온도·가스 임계값 경보도 계속 작동합니다.

모델은 **합성 데이터로만 학습**했으므로 실제 센서에서 임계값과 정확도를 검증해야 합니다. 특히 문·창문·환기 변화·방향제 판정은 정확도가 제한됩니다. DHT11로 학습한 모델에 현재 시스템의 DHT22를 연결하므로 설치 현장 검증이 필요합니다.

### MQ-7 히터 구간 표시

MQ-7 요청의 `readings` 항목에 선택 필드 `heaterPhaseValid`를 추가했습니다. 펌웨어가 실제 히터 제어 주기에서 읽을 수 있는 구간임을 확인한 경우에만 `true`로 보내세요.

```json
{
  "sampleKey": "02:AA:BB:CC:DD:EE:boot1:123",
  "macAddress": "02:AA:BB:CC:DD:EE",
  "measuredAt": "2026-10-15T09:00:00+09:00",
  "readings": [{"metricCode": "GAS", "measuredValue": 750, "heaterPhaseValid": true}]
}
```

기존 펌웨어 요청은 그대로 수집됩니다. 표시가 없거나 `false`인 MQ-7 값은 대시보드 원시 수치에는 표시되지만 AI에는 `null`로 전달합니다. 유효 MQ-7 값이 없으면 흡연 판정이 크게 제한되며 화면에 안내가 표시됩니다. 다른 센서에 이 필드를 보내면 400, 같은 샘플 키의 값을 다르게 재전송하면 409를 반환합니다.

### 설정

| 환경 변수 | 기본값 | 용도 |
|---|---|---|
| `SENSOR_AI_ENABLED` | `true` | AI 주기적 판정 활성화 |
| `SENSOR_AI_URL` | `http://localhost:8090` | Docker에서는 `http://sensor-ai:8090` |
| `SENSOR_AI_TIMEOUT_MS` | `10000` | AI 응답 제한 시간 |
| `SENSOR_AI_POLL_INTERVAL_MS` | `15000` | 모든 장치 판정 완료 후 다음 실행까지 대기 시간 |

장치가 오프라인이거나 판정 갱신이 60초 이상 지연되면 최신 정상 판정으로 표시하지 않습니다. 단일 백엔드 인스턴스를 기준으로 하며, 여러 인스턴스에서 동시에 작업하려면 스케줄 작업 분산 잠금이 필요합니다. 설치 수가 많아지면 10시간 배치 재평가의 부하를 측정하고 전용 작업 큐 등으로 확장하세요. 모델이 0~100 쾌적 점수를 출력하는 것은 아닙니다.

### AI만 로컬 실행

Python 3.13 환경에서:

```sh
cd ai-service
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

내부 API는 `GET /health`, `POST /evaluate`입니다. 후자는 `deviceId`와 `samples`(1~2400개)를 받으며 각 행에 UTC 오프셋을 포함한 `at`, `temperature`, `humidity`, `mq135Adc`, 선택 `mq7Adc`를 지정합니다. 시간은 15초 간격이어야 합니다. 사용자는 백엔드의 기존 인증된 구역별 대시보드 API로 결과를 조회합니다.

## 검증

```sh
cd backend
./gradlew test
cd ../ai-service
python -m unittest discover -s tests -v
cd ../frontend
npm run build
```

백엔드 테스트는 별도의 H2 메모리 DB를 사용하며 실제 MySQL 데이터를 수정하지 않습니다. Python 테스트는 실제 모델의 준비 경계·원본 스트리밍과의 일치·HTTP 계약·잘못된 입력을 검증합니다.
