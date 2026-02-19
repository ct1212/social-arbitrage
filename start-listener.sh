#!/bin/bash
# Start Social Arbitrage Discord command listener

cd /home/agent/projects/trading/social-arbitrage
source .env.local
node discord-commands.js >> /home/agent/.openclaw/social-arbitrage-commands.log 2>&1
