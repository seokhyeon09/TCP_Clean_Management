"""Internal inference endpoint; expose through the authenticated Java backend only."""
import json
import logging
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from inference import evaluate, MODEL_VERSION
from restroom_unified.model import UnifiedModel

MAX_BODY = 1_000_000


def handler_for(model):
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def respond(self, status, body):
            encoded = json.dumps(body, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self):
            if self.path == "/health":
                self.respond(200, {"status": "ok", "modelVersion": MODEL_VERSION})
            else:
                self.respond(404, {"error": "Not found"})

        def do_POST(self):
            if self.path != "/evaluate":
                self.respond(404, {"error": "Not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= MAX_BODY:
                    self.respond(413, {"error": "Invalid body size"})
                    return
                payload = json.loads(self.rfile.read(length))
                result = evaluate(payload, model)
            except (ValueError, TypeError, UnicodeError) as error:
                self.respond(400, {"error": str(error)})
                return
            except Exception:
                logging.exception("Inference failed")
                self.respond(500, {"error": "Inference failed"})
                return
            self.respond(200, result)

    return Handler


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    model = UnifiedModel.load()
    server = HTTPServer((os.environ.get("AI_BIND", "0.0.0.0"), 8090), handler_for(model))
    logging.info("Sensor AI ready on port 8090 (model %s)", MODEL_VERSION)
    server.serve_forever()
