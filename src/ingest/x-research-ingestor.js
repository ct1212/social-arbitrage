// X Research Ingestor
// Uses x-research skill for deep social signal detection
// Chris Camillo-style: find cultural phenomena before earnings

const { execSync } = require('child_process');
const path = require('path');

class XResearchIngestor {
  constructor() {
    this.skillPath = '/home/agent/.openclaw/skills/x-research';
  }

  // Deep research on a ticker/keyword
  async researchTopic(topic, options = {}) {
    const { 
      hoursBack = '7d',
      minLikes = 10,
      pages = 2,
      limit = 20
    } = options;

    console.log(`🔍 Deep research: "${topic}"`);
    
    const results = {
      topic,
      timestamp: new Date().toISOString(),
      queries: [],
      findings: []
    };

    // Query 1: Core product/brand mentions
    const coreQuery = `"${topic}" -is:retweet lang:en`;
    results.queries.push({ type: 'core', query: coreQuery });
    results.findings.push(await this.runSearch(coreQuery, { 
      since: hoursBack, 
      minLikes,
      pages,
      limit 
    }));

    // Query 2: Sentiment indicators (love/hate/bug/issue)
    const sentimentQuery = `"${topic}" (love OR hate OR broken OR bug OR issue OR amazing OR terrible) -is:retweet lang:en`;
    results.queries.push({ type: 'sentiment', query: sentimentQuery });
    results.findings.push(await this.runSearch(sentimentQuery, { 
      since: hoursBack,
      minLikes: 5,
      pages: 1,
      limit: 15
    }));

    // Query 3: Purchase intent (bought, buying, ordered)
    const intentQuery = `"${topic}" (bought OR buying OR ordered OR purchased OR tried) -is:retweet lang:en`;
    results.queries.push({ type: 'intent', query: intentQuery });
    results.findings.push(await this.runSearch(intentQuery, {
      since: hoursBack,
      minLikes: 3,
      pages: 1,
      limit: 15
    }));

    // Query 4: Expert/dev chatter (from tech accounts)
    const expertQuery = `"${topic}" (url:github.com OR dev OR developer OR engineer) -is:retweet lang:en`;
    results.queries.push({ type: 'expert', query: expertQuery });
    results.findings.push(await this.runSearch(expertQuery, {
      since: hoursBack,
      minLikes: 10,
      pages: 1,
      limit: 10
    }));

    return this.synthesizeFindings(results);
  }

  async runSearch(query, options) {
    const { since, minLikes, pages, limit } = options;
    
    try {
      const cmd = [
        'bun run x-search.ts search',
        `"${query}"`,
        `--since ${since}`,
        `--min-likes ${minLikes}`,
        `--pages ${pages}`,
        `--limit ${limit}`,
        '--sort likes',
        '--markdown'
      ].join(' ');

      const output = execSync(cmd, {
        cwd: this.skillPath,
        encoding: 'utf8',
        timeout: 60000
      });

      return this.parseSearchOutput(output);
    } catch (err) {
      console.error(`Search failed for "${query}":`, err.message);
      return { query, tweets: [], error: err.message };
    }
  }

  parseSearchOutput(output) {
    // Parse the markdown output from x-search
    const tweets = [];
    const lines = output.split('\n');
    
    let currentTweet = null;
    
    for (const line of lines) {
      // Match tweet header: "@username: "
      const userMatch = line.match(/^@(\w+):\s*(.+)$/);
      if (userMatch) {
        if (currentTweet) tweets.push(currentTweet);
        currentTweet = {
          username: userMatch[1],
          text: userMatch[2],
          likes: 0,
          url: ''
        };
      }
      
      // Match likes: "❤️ 42 likes"
      const likesMatch = line.match(/❤️\s*(\d+)\s*likes?/);
      if (likesMatch && currentTweet) {
        currentTweet.likes = parseInt(likesMatch[1]);
      }
      
      // Match URL: "[Tweet](url)"
      const urlMatch = line.match(/\[Tweet\]\((https:\/\/[^)]+)\)/);
      if (urlMatch && currentTweet) {
        currentTweet.url = urlMatch[1];
      }
    }
    
    if (currentTweet) tweets.push(currentTweet);
    
    return { tweets, raw: output };
  }

  synthesizeFindings(results) {
    const allTweets = results.findings.flatMap(f => f.tweets || []);
    
    // Calculate signal strength
    const totalMentions = allTweets.length;
    const avgEngagement = allTweets.reduce((sum, t) => sum + (t.likes || 0), 0) / (totalMentions || 1);
    const highEngagement = allTweets.filter(t => (t.likes || 0) >= 50).length;
    
    // Detect sentiment
    const positiveWords = ['love', 'amazing', 'great', 'best', 'awesome', 'bullish'];
    const negativeWords = ['hate', 'terrible', 'broken', 'bug', 'issue', 'awful', 'bearish'];
    
    let positive = 0;
    let negative = 0;
    
    for (const tweet of allTweets) {
      const text = (tweet.text || '').toLowerCase();
      if (positiveWords.some(w => text.includes(w))) positive++;
      if (negativeWords.some(w => text.includes(w))) negative++;
    }
    
    const sentiment = positive > negative ? 'positive' : 
                      negative > positive ? 'negative' : 'neutral';
    
    // Determine signal type
    let signalType = 'mention_spike';
    if (results.findings.some(f => f.query?.includes('bought OR buying'))) {
      signalType = 'purchase_intent';
    }
    if (highEngagement > 5) {
      signalType = 'viral_moment';
    }
    
    return {
      topic: results.topic,
      timestamp: results.timestamp,
      signalStrength: this.calculateSignalStrength(totalMentions, avgEngagement, highEngagement),
      sentiment,
      signalType,
      metrics: {
        totalMentions,
        avgEngagement: Math.round(avgEngagement),
        highEngagementTweets: highEngagement,
        positiveSignals: positive,
        negativeSignals: negative
      },
      topTweets: allTweets
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5),
      researchQueries: results.queries
    };
  }

  calculateSignalStrength(mentions, avgEngagement, highEngagement) {
    // Score 0-100
    let score = 0;
    
    // Mention volume (0-40)
    if (mentions >= 50) score += 40;
    else if (mentions >= 20) score += 30;
    else if (mentions >= 10) score += 20;
    else if (mentions >= 5) score += 10;
    
    // Engagement quality (0-40)
    if (avgEngagement >= 100) score += 40;
    else if (avgEngagement >= 50) score += 30;
    else if (avgEngagement >= 20) score += 20;
    else if (avgEngagement >= 10) score += 10;
    
    // Viral indicators (0-20)
    if (highEngagement >= 10) score += 20;
    else if (highEngagement >= 5) score += 15;
    else if (highEngagement >= 2) score += 10;
    
    return score;
  }

  // Batch research multiple tickers
  async batchResearch(topics) {
    const results = [];
    
    for (const topic of topics) {
      try {
        const result = await this.researchTopic(topic);
        results.push(result);
        
        // Rate limit safety between topics
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`Failed to research ${topic}:`, err.message);
      }
    }
    
    return results;
  }

  // Watchlist check for heartbeat integration
  async checkWatchlist() {
    try {
      const cmd = 'bun run x-search.ts watchlist check --markdown';
      const output = execSync(cmd, {
        cwd: this.skillPath,
        encoding: 'utf8',
        timeout: 60000
      });
      
      return this.parseWatchlistOutput(output);
    } catch (err) {
      console.error('Watchlist check failed:', err.message);
      return [];
    }
  }

  parseWatchlistOutput(output) {
    // Parse watchlist check results
    const alerts = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('posted') || line.includes('tweeted')) {
        alerts.push(line.trim());
      }
    }
    
    return alerts;
  }
}

module.exports = XResearchIngestor;
