// X/Twitter Data Ingestion
// Fetches mention counts and sentiment for tracked keywords

class XIngestor {
  constructor(bearerToken) {
    this.bearerToken = bearerToken;
    this.baseUrl = 'https://api.twitter.com/2';
  }

  async fetchMentions(keyword, hoursBack = 24) {
    // Search recent tweets for keyword
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    
    const query = `${keyword} -is:retweet lang:en`;
    const url = new URL(`${this.baseUrl}/tweets/counts/recent`);
    url.searchParams.append('query', query);
    url.searchParams.append('granularity', 'hour');
    url.searchParams.append('start_time', startTime);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseCounts(data);
  }

  parseCounts(data) {
    const buckets = data.data || [];
    const total = buckets.reduce((sum, b) => sum + b.tweet_count, 0);
    
    return {
      total,
      buckets: buckets.map(b => ({
        time: b.start,
        count: b.tweet_count
      }))
    };
  }

  // Fetch sentiment sample (manual scoring for now)
  async fetchSentimentSample(keyword, maxResults = 10) {
    const url = new URL(`${this.baseUrl}/tweets/search/recent`);
    url.searchParams.append('query', `${keyword} -is:retweet lang:en`);
    url.searchParams.append('max_results', maxResults.toString());
    url.searchParams.append('tweet.fields', 'public_metrics,created_at');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map(t => ({
      text: t.text,
      likes: t.public_metrics?.like_count || 0,
      time: t.created_at
    }));
  }

  // Batch fetch all tracked keywords
  async batchFetch(keywords) {
    const results = {};
    
    for (const keyword of keywords) {
      try {
        const mentions = await this.fetchMentions(keyword, 24);
        results[keyword] = {
          current: mentions.total,
          hourly: mentions.buckets
        };
        
        // Rate limit safety
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Failed to fetch ${keyword}:`, err.message);
        results[keyword] = { current: 0, hourly: [] };
      }
    }
    
    return results;
  }
}

module.exports = XIngestor;
