#!/bin/sh
set -e

# Start Nginx in background
nginx -g "daemon on;"

# Start NestJS
exec node dist/main.js
