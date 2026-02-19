#!/usr/bin/env node
// Social Arbitrage Watchlist Manager
// Add/remove tickers and check them regularly

const fs = require('fs');
const path = require('path');

const WATCHLIST_FILE = path.join(__dirname, 'data', 'watchlist.json');

// Default watchlist
const DEFAULT_WATCHLIST = [
  { ticker: 'AAPL', keyword: 'Apple', category: 'tech' },
  { ticker: 'TSLA', keyword: 'Tesla', category: 'auto' },
  { ticker: 'NVDA', keyword: 'NVIDIA', category: 'tech' },
  { ticker: 'META', keyword: 'Meta', category: 'tech' },
  { ticker: 'LINK', keyword: 'Chainlink', category: 'crypto' },
  { ticker: 'COIN', keyword: 'Coinbase', category: 'crypto' }
];

function loadWatchlist() {
  try {
    const data = fs.readFileSync(WATCHLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { tickers: DEFAULT_WATCHLIST, lastChecked: null };
  }
}

function saveWatchlist(watchlist) {
  const dir = path.dirname(WATCHLIST_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
}

function showHelp() {
  console.log(`
Usage: node watchlist.js [command] [args]

Commands:
  list                          Show all watched tickers
  add <ticker> <keyword>        Add ticker to watchlist
  remove <ticker>               Remove ticker from watchlist  
  check                         Research all tickers (runs x-research)
  reset                         Reset to default watchlist

Examples:
  node watchlist.js add HOOD "Robinhood"
  node watchlist.js add PLTR "Palantir" 
  node watchlist.js remove TSLA
  node watchlist.js check
`);
}

function listWatchlist() {
  const watchlist = loadWatchlist();
  console.log('\n📋 Social Arbitrage Watchlist\n');
  
  if (watchlist.tickers.length === 0) {
    console.log('No tickers in watchlist.');
    return;
  }
  
  // Group by category
  const byCategory = {};
  watchlist.tickers.forEach(t => {
    const cat = t.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  });
  
  Object.entries(byCategory).forEach(([category, tickers]) => {
    console.log(`${category.toUpperCase()}:`);
    tickers.forEach(t => {
      console.log(`  $${t.ticker} → "${t.keyword}"`);
    });
    console.log('');
  });
  
  if (watchlist.lastChecked) {
    console.log(`Last checked: ${new Date(watchlist.lastChecked).toLocaleString()}`);
  }
}

function addTicker(ticker, keyword, category = 'other') {
  const watchlist = loadWatchlist();
  
  // Check if exists
  if (watchlist.tickers.some(t => t.ticker === ticker.toUpperCase())) {
    console.log(`❌ ${ticker} is already in watchlist`);
    return;
  }
  
  watchlist.tickers.push({
    ticker: ticker.toUpperCase(),
    keyword: keyword || ticker,
    category
  });
  
  saveWatchlist(watchlist);
  console.log(`✅ Added $${ticker.toUpperCase()} (${keyword}) to watchlist`);
}

function removeTicker(ticker) {
  const watchlist = loadWatchlist();
  const idx = watchlist.tickers.findIndex(t => t.ticker === ticker.toUpperCase());
  
  if (idx === -1) {
    console.log(`❌ ${ticker} not found in watchlist`);
    return;
  }
  
  const removed = watchlist.tickers.splice(idx, 1)[0];
  saveWatchlist(watchlist);
  console.log(`✅ Removed $${removed.ticker} from watchlist`);
}

async function checkWatchlist() {
  const XResearchIngestor = require('./src/ingest/x-research-ingestor');
  const SocialArbitragePoster = require('./src/alerts/discord-poster');
  
  const watchlist = loadWatchlist();
  
  if (watchlist.tickers.length === 0) {
    console.log('No tickers in watchlist. Add some first.');
    return;
  }
  
  console.log(`\n🔍 Checking ${watchlist.tickers.length} tickers...\n`);
  
  const ingestor = new XResearchIngestor();
  const poster = new SocialArbitragePoster(
    process.env.DISCORD_BOT_TOKEN,
    '1473265368272470047'
  );
  
  await poster.connect();
  
  let signalsFound = 0;
  
  for (const item of watchlist.tickers) {
    console.log(`Researching: ${item.keyword} ($${item.ticker})...`);
    
    try {
      const result = await ingestor.researchTopic(item.keyword, {
        hoursBack: '24h', // Shorter window for watchlist checks
        minLikes: 10,
        pages: 1,
        limit: 15
      });
      
      if (result.signalStrength >= 60 && result.metrics.totalMentions >= 10) {
        const signal = {
          keyword: item.keyword,
          ticker: item.ticker,
          confidence: result.signalStrength,
          sentiment: result.sentiment,
          signalType: result.signalType,
          metrics: result.metrics,
          topTweets: result.topTweets,
          timestamp: result.timestamp
        };
        
        await poster.postResearchSignal(signal);
        console.log(`  🚨 SIGNAL DETECTED (${result.signalStrength}/100)\n`);
        signalsFound++;
      } else {
        console.log(`  ✓ No signal (${result.signalStrength}/100)\n`);
      }
      
      // Rate limit between tickers
      await new Promise(r => setTimeout(r, 3000));
      
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}\n`);
    }
  }
  
  await poster.disconnect();
  
  watchlist.lastChecked = new Date().toISOString();
  saveWatchlist(watchlist);
  
  console.log(`\n✅ Watchlist check complete. ${signalsFound} signals found.`);
}

function resetWatchlist() {
  saveWatchlist({ tickers: DEFAULT_WATCHLIST, lastChecked: null });
  console.log('✅ Watchlist reset to defaults');
}

// Main
async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  // Load env
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  switch (cmd) {
    case 'list':
    case 'ls':
      listWatchlist();
      break;
    case 'add':
      if (!args[0]) {
        console.log('Usage: node watchlist.js add <ticker> <keyword>');
        process.exit(1);
      }
      addTicker(args[0], args[1] || args[0], args[2]);
      break;
    case 'remove':
    case 'rm':
      if (!args[0]) {
        console.log('Usage: node watchlist.js remove <ticker>');
        process.exit(1);
      }
      removeTicker(args[0]);
      break;
    case 'check':
      await checkWatchlist();
      break;
    case 'reset':
      resetWatchlist();
      break;
    case 'help':
    default:
      showHelp();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
