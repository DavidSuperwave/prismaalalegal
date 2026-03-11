#!/bin/sh
# Copy openclaw.json config into the volume before starting
if [ -f /tmp/openclaw.json ]; then
    cp /tmp/openclaw.json /home/node/.openclaw/openclaw.json
    chmod 666 /home/node/.openclaw/openclaw.json
fi

# Start OpenClaw
exec "$@"
