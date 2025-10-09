#!/usr/bin/env bash
set -euo pipefail

# dev-serve.sh
# Kills any process listening on port 4200, then starts the Angular dev server
# Usage: ./dev-serve.sh

cd "$(dirname "$0")"

# find PID listening on 4200 (IPv4 or IPv6)
PID=$(lsof -tiTCP:4200 -sTCP:LISTEN || true)
if [ -n "$PID" ]; then
  echo "Killing process on :4200 (PID $PID)"
  kill $PID || true
  sleep 1
  if lsof -iTCP:4200 -sTCP:LISTEN -nP >/dev/null 2>&1; then
    echo "Process still listening, forcing kill"
    kill -9 $PID || true
    sleep 1
  fi
else
  echo "No process was listening on :4200"
fi

# start dev server in background, capture PID and logs
echo "Starting dev server on port 4200..."
nohup npm run start > front-dev.log 2>&1 &
echo $! > front-dev.pid
sleep 1
if lsof -iTCP:4200 -sTCP:LISTEN -nP >/dev/null 2>&1; then
  echo "Dev server started (PID $(cat front-dev.pid))"
  echo "Log file: $(pwd)/front-dev.log"
else
  echo "Failed to start dev server or it's not listening on :4200"
  echo "Check $(pwd)/front-dev.log for details"
fi

# show last 40 lines of the log for convenience
echo "--- tail of front-dev.log ---"
tail -n 40 front-dev.log || true
