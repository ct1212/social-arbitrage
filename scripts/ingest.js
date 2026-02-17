#!/usr/bin/env node
// Manual ingestion script for testing

const fs = require('fs');
const path = require('path');

const XIngestor = require('../src/ingest/x-ingestor');
const ArbitrageEngine = require('../src/signals/engine');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function main() {
  console.log('🔍 Social Arbitrage Ingestion\n');

  if (!process.env.X_BEARER_TOKEN) {
    console.error('❌ X_BEARER_TOKEN not set in .env.local');
    process.exit(1);
  }

  const ingestor = new XIngestor(process.env.X_BEARER_TOKEN);
  const engine = new ArbitrageEngine();

  // Get keywords from engine
  const categories = engine.getDefaultKeywords();
  const allKeywords = Object.values(categories).flat();

  console.log(`Tracking ${allKeywords.length} keywords across ${Object.keys(categories).length} categories\n`);

  // Fetch data (limit for testing)
  const testKeywords = allKeywords.slice(0, 5);
  console.log('Testing with:', testKeywords.join(', '), '\n');

  try {
    const data = await ingestor.batchFetch(testKeywords);
    
    console.log('📊 Results:\n');
    for (const [keyword, info] of Object.entries(data)) {
      console.log(`${keyword}: ${info.current} mentions (24h)`);
    }

    // Would normally save to DB and trigger analysis
    console.log('\n✅ Ingestion complete');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
