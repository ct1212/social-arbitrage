# Social Arbitrage Dashboard

Chris Camillo-style social signal detection for swing trading.

Detect cultural phenomena before they hit earnings. Find the edge in what people are *actually* talking about.

## Core Concept

Monitor social signals → Detect momentum shifts → Map to tickers → Generate swing trade alerts

## Current Signals

- **X/Twitter:** Product mentions, trending topics, sentiment shifts
- **Future:** YouTube transcripts, Reddit, TikTok, search trends

## Alert Types

1. **Emerging Trend:** Sudden spike in product/category mentions
2. **Sentiment Flip:** Positive/negative shift in brand perception  
3. **Ticker Mention:** Direct stock talk acceleration
4. **Earnings Preview:** Social buzz ahead of earnings calls

## Weekly Swing Focus

- Entry: Monday based on weekend social accumulation
- Exit: Friday or on signal decay
- Hold: Max 1-2 weeks for momentum plays

## Setup

```bash
cp .env.local.example .env.local
# Add your API keys
npm install
npm run dev
```

## Project Structure

```
/dashboard       → Next.js dashboard UI
/signals         → Signal detection engine  
/ingest          → Data ingestion (X, YT, etc.)
/tickers         → Trend-to-ticker mapping
/alerts          → Alert generation & scoring
```
