from datetime import datetime, timedelta, timezone
import json
from http.server import HTTPServer
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from inference import evaluate, LOCAL_TIME
from restroom_unified.model import UnifiedModel, UnifiedJudge
from server import handler_for


def payload(count=480, mq7=None):
    start = datetime(2026, 10, 15, tzinfo=timezone.utc)
    rows = []
    for index in range(count):
        rows.append({"at": (start + timedelta(seconds=index * 15)).isoformat(),
                     "temperature": 22 + index % 2, "humidity": 48 + index % 3,
                     "mq135Adc": 1800 + index % 17, "mq7Adc": mq7 if index % 10 >= 6 else None})
    return {"deviceId": "installation-1", "samples": rows}


class InferenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = UnifiedModel.load()

    def test_real_model_and_warmup_boundary(self):
        before = evaluate(payload(479), self.model)
        self.assertFalse(before["ready"])
        self.assertEqual({}, before["probabilities"])
        ready = evaluate(payload(480), self.model)
        self.assertTrue(ready["ready"])
        self.assertEqual(16, len(ready["probabilities"]))
        self.assertFalse(ready["mq7Available"])
        self.assertTrue(ready["at"].endswith("Z"))

    def test_batch_matches_original_streaming_model_in_korean_local_time(self):
        data = payload(500, mq7=750)
        judge = UnifiedJudge(data["deviceId"], self.model)
        for row in data["samples"]:
            result = judge.add(datetime.fromisoformat(row["at"]).astimezone(LOCAL_TIME),
                               row["temperature"], row["humidity"], row["mq135Adc"], row["mq7Adc"])
        batch = evaluate(data, self.model)
        for key in ("ready", "level", "headline", "labels", "items", "probabilities", "smoking", "freeze_levels", "checks"):
            self.assertEqual(result[key], batch[key], key)
        self.assertTrue(batch["mq7Available"])

    def test_retries_and_other_devices_do_not_mutate_history(self):
        data = payload()
        first = evaluate(data, self.model)
        other = payload(481, 700)
        other["deviceId"] = "installation-2"
        evaluate(other, self.model)
        self.assertEqual(first, evaluate(data, self.model))

    def test_rejects_gaps_duplicates_timezone_free_and_invalid_adc(self):
        for mutate in (
            lambda d: d["samples"][1].update(at=d["samples"][0]["at"]),
            lambda d: d["samples"].pop(1),
            lambda d: d["samples"][0].update(at="2026-10-15T00:00:00"),
            lambda d: d["samples"][0].update(mq135Adc=5000),
            lambda d: d["samples"][0].update(humidity=float("nan")),
            lambda d: d["samples"][0].update(mq7Adc=True),
        ):
            with self.subTest(mutate=mutate):
                data = payload(3)
                mutate(data)
                with self.assertRaises(ValueError):
                    evaluate(data, self.model)

    def test_bounded_history(self):
        for rows in ([], payload(2401)["samples"]):
            with self.assertRaises(ValueError):
                evaluate({"deviceId": "test", "samples": rows}, self.model)

    def test_http_contract_and_malformed_request(self):
        server = HTTPServer(("127.0.0.1", 0), handler_for(self.model))
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with urlopen(base + "/health") as response:
                self.assertEqual("ok", json.load(response)["status"])
            request = Request(base + "/evaluate", data=json.dumps(payload()).encode(),
                              headers={"Content-Type": "application/json"})
            with urlopen(request) as response:
                self.assertTrue(json.load(response)["ready"])
            with self.assertRaises(HTTPError) as error:
                urlopen(Request(base + "/evaluate", data=b"{}"))
            self.assertEqual(400, error.exception.code)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
