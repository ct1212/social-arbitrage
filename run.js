#!/usr/bin/env node
// Social Arbitrage Runner
// High-quality signals only (1-2 per day, 80%+ confidence)

const fs = require('fs');
const path = require('path');

const XIngestor = require('./src/ingest/x-ingestor');
const ArbitrageEngine = require('./src/signals/engine');
const SocialArbitragePoster = require('./src/alerts/discord-poster');

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Copy from .env.local.example');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function main() {
  console.log('🎯 Social Arbitrage Runner\n');
  console.log('High-quality signals only (1-2/day, 80%+ confidence)\n');

  loadEnv();

  // Validate required env vars
  const required = ['X_BEARER_TOKEN', 'DISCORD_BOT_TOKEN'];
  const missing = required.filter(key => !process.env[key] || process.env[key].includes('your_'));
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Initialize
  const ingestor = new XIngestor(process.env.X_BEARER_TOKEN);
  const engine = new ArbitrageEngine();
  const poster = new SocialArbitragePoster(
    process.env.DISCORD_BOT_TOKEN,
    '1473265368272470047' // #social-arbitrage channel
  );

  try {
    // Connect to Discord
    console.log('Connecting to Discord...');
    await poster.connect();

    // Check engine status
    const status = engine.getStatus();
    console.log('\nEngine Status:');
    console.log(`  Next signal available in: ${status.nextSignalInHours}h`);
    console.log(`  Recent signals: ${status.recentSignals.length}`);
    console.log(`  Cooldown keywords: ${status.cooldownKeywords.join(', ') || 'none'}\n`);

    // If rate limited, just post status and exit
    if (status.nextSignalInHours > 0) {
      console.log('⏳ Rate limited. Posting status update...');
      await poster.postStatus(status);
      await poster.disconnect();
      return;
    }

    // Fetch data
    console.log('Fetching social data...');
    const categories = engine.getDefaultKeywords();
    const allKeywords = Object.values(categories).flat();
    
    // Test with subset first
    const testKeywords = allKeywords.slice(0, 8);
    console.log(`Checking ${testKeywords.length} keywords...\n`);

    const mentionsData = await ingestor.batchFetch(testKeywords);

    // Detect signals (high quality filter applied)
    console.log('Analyzing for high-confidence signals...');
    const signals = engine.detectEmergingTrends(mentionsData);

    if (signals.length === 0) {
      console.log('✓ No high-confidence signals found (threshold: 80%)');
      console.log('  This is expected. Quality over quantity.');
    } else {
      console.log(`\n🚨 Found ${signals.length} high-confidence signal(s)!\n`);
      
      for (const signal of signals) {
        console.log(`Signal: ${signal.keyword} ($${signal.ticker})`);
        console.log(`  Confidence: ${signal.confidence.toFixed(0)}%`);
        console.log(`  Momentum: +${(signal.momentum * 100).toFixed(0)}%`);
        console.log(`  Risk: ${signal.swingScore.riskLevel}\n`);
        
        // Post to Discord
        await poster.postSignal(signal);
        console.log('✅ Posted to #social-arbitrage\n');
      }
    }

    await poster.disconnect();
    console.log('Done.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    await poster.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
