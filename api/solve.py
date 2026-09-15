"""
api/solve.py — the PRODUCTION version of the /solve endpoint, deployed by
Vercel as a serverless function. This is what actually answers requests
once the site is live — python/server.py (Flask) is only ever used for
LOCAL development.

Why this looks so different from server.py: Vercel doesn't run a
long-lived server process the way your own machine does. Instead, every
.py file inside an /api folder becomes its own on-demand function —
Vercel starts it up only when a request actually arrives, runs it, and
shuts it back down afterward. Because of that model, Vercel's Python
functions use a specific, minimal pattern instead of a full framework
like Flask: a class named exactly `handler`, inheriting from
BaseHTTPRequestHandler (part of Python's standard library — no extra
packages to install), with one method per HTTP method you want to support.

solver.py and words.txt live right here in api/, not in python/, because
Vercel only guarantees that files INSIDE the same /api folder as a
function get deployed alongside it.
"""

import json
from http.server import BaseHTTPRequestHandler

from solver import solve_grid


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Read exactly as many bytes as the request says its body contains,
        # then parse that as JSON — same idea as Flask's request.get_json(),
        # just done by hand since we're not using a framework here.
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length)
        body = json.loads(raw_body)
        letters = body.get("letters")

        if not isinstance(letters, list) or len(letters) != 16:
            self._send_json({"error": "Expected a list of exactly 16 letters"}, status=400)
            return

        words = solve_grid(letters)
        self._send_json({"words": words})

    def _send_json(self, data, status=200):
        """Small helper so do_POST doesn't repeat these 4 lines every time
        it needs to send a response."""
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    # Note there's no CORS handling here, unlike server.py. In production,
    # the React app and this API are served from the SAME domain (e.g.
    # your-project.vercel.app), so the browser never even considers it a
    # cross-origin request — CORS headers are only needed when the two
    # sides are on genuinely different origins, which is only true during
    # local development (localhost:5173 talking to localhost:8000).
