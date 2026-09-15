"""
server.py — LOCAL DEVELOPMENT ONLY. A small Flask web server that exposes
_solver.py over HTTP, so the React app (running in the browser) can call it
while you're running "npm run dev" on your own machine.

In production (once deployed to Vercel), this file isn't used at all —
api/solve.py takes over that job there, using Vercel's own serverless
function format instead of a Flask server. See api/solve.py's docstring
for why that one looks so different from this one.

Why this file needs to exist at all: _solver.py is just a Python function.
The browser can't call a Python function directly — it can only make HTTP
requests. This file's only job is to sit and listen for those requests,
call solve_grid() from _solver.py, and send the result back as JSON.

Run it with:
    python/.venv/bin/python server.py
It will listen at http://localhost:8000
"""

import os
import sys

# pyrefly: ignore [missing-import]
from flask import Flask, jsonify, request

# _solver.py actually lives in ../api (see api/solve.py's docstring for
# why), not in this folder — so before we can import it, Python needs to be
# told to also look inside that folder. sys.path is the list of folders
# Python searches through when you write an `import` statement; inserting
# our target folder at the front makes it the first place checked.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
# pyrefly: ignore [missing-import]
from _solver import solve_grid

# Creates the actual web server application. __name__ just tells Flask
# where this file lives, so it can find things like templates later if we
# ever need them (we don't, for a pure API like this).
app = Flask(__name__)


# This decorator (@app.route(...)) tells Flask: "when a request comes in
# for the URL path /solve, using POST (or OPTIONS, see below), run the
# function right below this line and send back whatever it returns."
@app.route("/solve", methods=["POST", "OPTIONS"])
def solve():
    # Before the browser sends our actual POST request, it first sends an
    # OPTIONS request — a "preflight" check asking "are you going to allow
    # this cross-origin request?" It carries no real data, it just needs a
    # response with the right Access-Control-* headers (added below by
    # allow_frontend_origin) and a success status code, so we return early
    # with nothing but an empty, successful response.
    if request.method == "OPTIONS":
        return "", 200

    # request.get_json() reads the JSON body the browser sent and turns it
    # into a normal Python dict, e.g. {"letters": ["C", "A", "T", ...]}.
    body = request.get_json()
    letters = body.get("letters")

    if not isinstance(letters, list) or len(letters) != 16:
        # abort-style error response: (data, status_code). 400 means
        # "Bad Request" — the client sent something we can't use.
        return jsonify({"error": "Expected a list of exactly 16 letters"}), 400

    # Each entry looks like {"word": "cat", "path": [4, 0, 8]} — see
    # solve_grid()'s docstring in solver.py for what "path" means.
    words = solve_grid(letters)

    # jsonify converts a Python dict into a proper JSON HTTP response,
    # with the right headers set automatically.
    return jsonify({"words": words})


# Vite's dev server usually runs on http://localhost:5173, but if that port
# is already busy (e.g. an old "npm run dev" left running in another tab),
# Vite silently picks the next free one — 5174, 5175, etc. Different ports
# count as different "origins" to the browser, and browsers block
# cross-origin requests by default for security (this protection is called
# CORS). Rather than hardcode one exact port and have things mysteriously
# break whenever Vite picks a different one, we read whatever origin the
# browser actually sent (request.origin) and, as long as it's some flavor
# of localhost, echo it straight back — this only ever runs on your own
# machine during development, so trusting any localhost port is safe here.
@app.after_request
def allow_frontend_origin(response):
    origin = request.origin or ""
    if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST"
    return response


# Only runs when this file is executed directly (not when imported).
if __name__ == "__main__":
    app.run(port=8000, debug=True)
