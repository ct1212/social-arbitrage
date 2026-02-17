// Social Arbitrage Engine
// Detects momentum shifts in social data

class ArbitrageEngine {
  constructor() {
    this.watchlist = new Map(); // keyword -> trend data
    this.tickers = new Map();   // keyword -> ticker mapping
    this.baseline = new Map();  // historical baselines
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
      'chatgpt': 'MSFT', // Microsoft owns OpenAI partnership
      'copilot': 'MSFT',
      'fortnite': 'EA', // Epic Games private, but gaming exposure
    };
  }

  // Calculate momentum score from mention data
  calculateMomentum(current, baseline) {
    if (!baseline || baseline === 0) return 0;
    
    const velocity = (current - baseline) / baseline; // % change
    const acceleration = this.calculateAcceleration(velocity);
    
    // Momentum = velocity + acceleration weighting
    return (velocity * 0.6) + (acceleration * 0.4);
  }

  calculateAcceleration(currentVelocity) {
    // Compare to previous velocity reading
    // Simplified - would need history
    return currentVelocity > 0.2 ? currentVelocity * 0.5 : 0;
  }

  // Detect emerging trends
  detectEmergingTrends(mentionsData) {
    const signals = [];
    const tickers = this.getTickerMapping();

    for (const [keyword, data] of Object.entries(mentionsData)) {
      const momentum = this.calculateMomentum(data.current, data.baseline);
      
      if (momentum > 0.5) { // 50% increase threshold
        signals.push({
          type: 'EMERGING_TREND',
          keyword,
          ticker: tickers[keyword] || null,
          momentum,
          mentions: data.current,
          confidence: this.scoreConfidence(momentum, data),
          timestamp: new Date().toISOString(),
          thesis: this.generateThesis(keyword, momentum, data)
        });
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  scoreConfidence(momentum, data) {
    // Higher confidence if:
    // - Strong momentum (>100%)
    // - High absolute mention volume
    // - Sustained over multiple checks
    
    let score = Math.min(momentum * 50, 50); // Momentum up to 50 pts
    score += Math.min(data.current / 100, 30); // Volume up to 30 pts
    score += data.sustained ? 20 : 0; // Sustained bonus
    
    return Math.min(score, 100);
  }

  generateThesis(keyword, momentum, data) {
    const templates = [
      `${keyword} mentions up ${(momentum * 100).toFixed(0)}% vs baseline. Social velocity suggests early consumer adoption curve.`,
      `Viral momentum detected for ${keyword}. Crowd interest accelerating ahead of potential earnings surprise.`,
      `${keyword} trending across social channels. Cultural penetration likely underreported in traditional metrics.`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Weekly swing trade scoring
  scoreSwingOpportunity(signal) {
    const scores = {
      entry: signal.confidence > 70 ? 'STRONG' : signal.confidence > 50 ? 'MODERATE' : 'WEAK',
      timeframe: '1-2 weeks',
      catalyst: 'Social momentum → Earnings/PR',
      riskLevel: signal.momentum > 2 ? 'HIGH' : 'MEDIUM',
    };
    
    return scores;
  }
}

module.exports = ArbitrageEngine;
