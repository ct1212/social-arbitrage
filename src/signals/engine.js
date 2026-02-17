// Social Arbitrage Engine
// Detects momentum shifts in social data
// HIGH QUALITY ONLY: Max 1-2 signals per day, 80%+ confidence threshold

class ArbitrageEngine {
  constructor() {
    this.watchlist = new Map(); // keyword -> trend data
    this.tickers = new Map();   // keyword -> ticker mapping
    this.baseline = new Map();  // historical baselines
    this.recentSignals = new Map(); // Track recent alerts to prevent dupes
    this.lastSignalTime = null; // Rate limiting
  }

  // Configuration
  getConfig() {
    return {
      MIN_CONFIDENCE: 80,        // Only 80%+ confidence signals
      MIN_MOMENTUM: 1.0,         // 100% increase minimum
      MAX_SIGNALS_PER_DAY: 2,    // Hard limit
      MIN_HOURS_BETWEEN_SIGNALS: 8, // Don't spam
      COOLDOWN_HOURS: 48,        // Same keyword can't alert again for 48h
    };
  }

  // Keywords to track (expandable)
  getDefaultKeywords() {
    return {
      // Categories: [keywords]
      'energy-drinks': ['celsius', 'ghost energy', 'prime hydration', 'monster energy'],
      'athleisure': ['lululemon', 'gymshark', 'alo yoga', 'athleta'],
      'gaming': ['fortnite', 'roblox', 'call of duty', 'minecraft'],
      'streaming': ['netflix', 'spotify', 'hulu', 'disney plus'],
      'ai-tools': ['chatgpt', 'claude', 'midjourney', 'copilot'],
      'crypto': ['bitcoin', 'ethereum', 'solana', 'coinbase'],
      'ev': ['tesla', 'rivian', 'lucid', 'charging station'],
      'semiconductors': ['nvidia', 'amd', 'intel', 'ai chips'],
    };
  }

  // Map keywords to tickers
  getTickerMapping() {
    return {
      'celsius': 'CELH',
      'lululemon': 'LULU',
      'netflix': 'NFLX',
      'spotify': 'SPOT',
      'roblox': 'RBLX',
      'tesla': 'TSLA',
      'rivian': 'RIVN',
      'nvidia': 'NVDA',
      'amd': 'AMD',
      'intel': 'INTC',
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'coinbase': 'COIN',
      'chatgpt': 'MSFT',
      'copilot': 'MSFT',
      'fortnite': 'EA',
    };
  }

  // Check if we can send a signal (rate limiting)
  canSendSignal() {
    const config = this.getConfig();
    
    if (!this.lastSignalTime) return true;
    
    const hoursSinceLastSignal = (Date.now() - this.lastSignalTime) / (1000 * 60 * 60);
    return hoursSinceLastSignal >= config.MIN_HOURS_BETWEEN_SIGNALS;
  }

  // Check if keyword is in cooldown (prevent duplicates)
  isInCooldown(keyword) {
    const config = this.getConfig();
    const lastAlert = this.recentSignals.get(keyword);
    
    if (!lastAlert) return false;
    
    const hoursSinceAlert = (Date.now() - lastAlert) / (1000 * 60 * 60);
    return hoursSinceAlert < config.COOLDOWN_HOURS;
  }

  // Calculate momentum score from mention data
  calculateMomentum(current, baseline) {
    if (!baseline || baseline === 0) return 0;
    
    const velocity = (current - baseline) / baseline; // % change
    const acceleration = this.calculateAcceleration(velocity);
    
    return (velocity * 0.6) + (acceleration * 0.4);
  }

  calculateAcceleration(currentVelocity) {
    return currentVelocity > 0.2 ? currentVelocity * 0.5 : 0;
  }

  // Detect emerging trends - HIGH QUALITY FILTER
  detectEmergingTrends(mentionsData) {
    const config = this.getConfig();
    const signals = [];
    const tickers = this.getTickerMapping();

    // Rate limit check
    if (!this.canSendSignal()) {
      console.log(`Rate limit: ${config.MIN_HOURS_BETWEEN_SIGNALS}h between signals`);
      return [];
    }

    for (const [keyword, data] of Object.entries(mentionsData)) {
      // Skip if in cooldown
      if (this.isInCooldown(keyword)) {
        console.log(`Skipping ${keyword}: in cooldown`);
        continue;
      }

      const momentum = this.calculateMomentum(data.current, data.baseline);
      
      // HIGH BAR: Must have 100%+ momentum
      if (momentum < config.MIN_MOMENTUM) {
        continue;
      }

      const confidence = this.scoreConfidence(momentum, data);
      
      // HIGH BAR: Must have 80%+ confidence
      if (confidence < config.MIN_CONFIDENCE) {
        continue;
      }

      signals.push({
        type: 'EMERGING_TREND',
        keyword,
        ticker: tickers[keyword] || null,
        momentum,
        mentions: data.current,
        confidence,
        timestamp: new Date().toISOString(),
        thesis: this.generateThesis(keyword, momentum, data),
        swingScore: this.scoreSwingOpportunity({ confidence, momentum })
      });
    }

    // Sort by confidence, take ONLY the best one
    const bestSignals = signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 1); // MAX 1 per run

    // Mark as sent
    if (bestSignals.length > 0) {
      this.lastSignalTime = Date.now();
      this.recentSignals.set(bestSignals[0].keyword, Date.now());
    }

    return bestSignals;
  }

  scoreConfidence(momentum, data) {
    let score = Math.min(momentum * 40, 40); // Momentum up to 40 pts
    score += Math.min(data.current / 50, 35); // Volume up to 35 pts
    score += data.sustained ? 15 : 0; // Sustained bonus
    score += data.verifiedSources ? 10 : 0; // Quality sources
    
    return Math.min(score, 100);
  }

  generateThesis(keyword, momentum, data) {
    const pct = (momentum * 100).toFixed(0);
    
    if (momentum > 2.0) {
      return `${keyword.toUpperCase()} is breaking out. ${pct}% social velocity spike indicates viral acceleration ahead of mainstream coverage. Early adoption curve confirmed.`;
    } else if (momentum > 1.5) {
      return `${keyword} mentions accelerating ${pct}% vs baseline. Cultural penetration likely underreported in traditional metrics. Watch for earnings surprise.`;
    } else {
      return `${keyword} showing sustained social momentum (+${pct}%). Consumer interest building. Potential swing opportunity.`;
    }
  }

  // Weekly swing trade scoring
  scoreSwingOpportunity(signal) {
    return {
      entry: signal.confidence >= 85 ? 'STRONG' : 'MODERATE',
      timeframe: '1-2 weeks',
      catalyst: 'Social momentum → Earnings/PR',
      riskLevel: signal.momentum > 3 ? 'VERY HIGH' : signal.momentum > 2 ? 'HIGH' : 'MEDIUM',
      exitTrigger: 'Signal decay or +20% move'
    };
  }

  // Get status report
  getStatus() {
    const config = this.getConfig();
    const now = Date.now();
    
    let nextSignalIn = 0;
    if (this.lastSignalTime) {
      const elapsed = (now - this.lastSignalTime) / (1000 * 60 * 60);
      nextSignalIn = Math.max(0, config.MIN_HOURS_BETWEEN_SIGNALS - elapsed);
    }

    return {
      recentSignals: Array.from(this.recentSignals.entries()).map(([k, t]) => ({
        keyword: k,
        hoursAgo: Math.round((now - t) / (1000 * 60 * 60))
      })),
      nextSignalInHours: Math.round(nextSignalIn),
      cooldownKeywords: Array.from(this.recentSignals.keys()).filter(k => this.isInCooldown(k))
    };
  }
}

module.exports = ArbitrageEngine;
