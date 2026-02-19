#!/usr/bin/env node
// Social Arbitrage Research Runner
// Uses x-research skill for deep signal detection
// Run: node run-research.js [ticker/topic]

const fs = require('fs');
const path = require('path');

const XResearchIngestor = require('./src/ingest/x-research-ingestor');
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

// Map keywords to tickers
const keywordToTicker = {
  'Apple': 'AAPL',
  'iPhone': 'AAPL',
  'Tesla': 'TSLA',
  'NVDA': 'NVDA',
  'NVIDIA': 'NVDA',
  'META': 'META',
  'Bitcoin': 'BTC',
  'Ethereum': 'ETH',
  'Solana': 'SOL',
  'Chainlink': 'LINK',
  'Netflix': 'NFLX',
  'Disney': 'DIS',
  'Amazon': 'AMZN',
  'Google': 'GOOGL',
  'OpenAI': 'MSFT', // Microsoft investment
  'ChatGPT': 'MSFT',
  'Palantir': 'PLTR',
  'Robinhood': 'HOOD',
  'Coinbase': 'COIN',
  'SpaceX': 'N/A', // Private
  'Stripe': 'N/A' // Private
};

async function main() {
  const target = process.argv[2];
  
  console.log('🎯 Social Arbitrage Research Runner\n');
  console.log('Deep X research for swing trading signals\n');

  if (!target) {
    console.log('Usage: node run-research.js <ticker or keyword>');
    console.log('Examples:');
    console.log('  node run-research.js AAPL');
    console.log('  node run-research.js "iPhone 16"');
    console.log('  node run-research.js Tesla');
    process.exit(1);
  }

  loadEnv();

  // Initialize
  const ingestor = new XResearchIngestor();
  const poster = new SocialArbitragePoster(
    process.env.DISCORD_BOT_TOKEN,
    '1473265368272470047' // #social-arbitrage channel
  );

  try {
    // Connect to Discord
    console.log('Connecting to Discord...');
    await poster.connect();

    // Determine ticker
    const ticker = keywordToTicker[target] || target.toUpperCase();
    
    console.log(`\n🔍 Deep research on: ${target} (${ticker})\n`);
    console.log('This will run multiple X searches...\n');

    // Run deep research
    const result = await ingestor.researchTopic(target, {
      hoursBack: '7d',
      minLikes: 10,
      pages: 2,
      limit: 20
    });

    // Display results
    console.log('\n📊 RESEARCH RESULTS\n');
    console.log(`Signal Strength: ${result.signalStrength}/100`);
    console.log(`Sentiment: ${result.sentiment.toUpperCase()}`);
    console.log(`Signal Type: ${result.signalType}`);
    console.log(`\nMetrics:`);
    console.log(`  Total Mentions: ${result.metrics.totalMentions}`);
    console.log(`  Avg Engagement: ${result.metrics.avgEngagement} likes`);
    console.log(`  High-Engagement: ${result.metrics.highEngagementTweets} tweets`);
    console.log(`  Positive Signals: ${result.metrics.positiveSignals}`);
    console.log(`  Negative Signals: ${result.metrics.negativeSignals}`);

    // Show top tweets
    console.log('\n🏆 Top Tweets:');
    result.topTweets.forEach((tweet, i) => {
      console.log(`\n${i + 1}. @${tweet.username} (${tweet.likes} likes)`);
      console.log(`   ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
    });

    // Determine if this is a high-confidence signal
    const isHighConfidence = result.signalStrength >= 60 && result.metrics.totalMentions >= 10;
    
    if (isHighConfidence) {
      console.log('\n🚨 HIGH CONFIDENCE SIGNAL DETECTED!\n');
      
      const signal = {
        keyword: target,
        ticker: ticker,
        confidence: result.signalStrength,
        sentiment: result.sentiment,
        signalType: result.signalType,
        metrics: result.metrics,
        topTweets: result.topTweets,
        timestamp: result.timestamp
      };
      
      await poster.postResearchSignal(signal);
      console.log('✅ Posted to #social-arbitrage\n');
    } else {
      console.log('\n✓ Signal strength below threshold (60+). No alert posted.');
      console.log('  This is expected. Quality over quantity.\n');
    }

    await poster.disconnect();
    console.log('Done.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await poster.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
