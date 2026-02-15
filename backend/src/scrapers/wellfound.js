const axios = require('axios');

/**
 * Wellfound (formerly AngelList) Scraper
 * Jobs API - No key required for basic search
 */
class WellfoundScraper {
  constructor() {
    this.baseUrl = 'https://wellfound.com/api/jobs';
    this.graphqlUrl = 'https://wellfound.com/api/graphql';
    this.source = 'wellfound';
  }

  async searchJobs(keywords = '', location = '') {
    try {
      console.log(`[Wellfound] Searching for: "${keywords}"...`);
      
      // Wellfound uses GraphQL, but we can use their job board search
      // For MVP, we'll fetch from their public job board API
      const searchUrl = `https://wellfound.com/jobs`;
      
      // Note: Wellfound is harder to scrape without auth
      // For now, return empty and we'll add proper auth later
      console.log('[Wellfound] Note: Wellfound requires authentication for API access');
      console.log('[Wellfound] Consider using their job board directly or LinkedIn integration');
      
      return [];
    } catch (error) {
      console.error('[Wellfound] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => ({
      external_id: `wellfound_${job.id}`,
      source: this.source,
      title: job.title || 'Unknown Position',
      company: job.company?.name || 'Unknown Company',
      location: job.locations?.map(l => l.name).join(', ') || 'Unknown',
      description: job.description || '',
      url: job.apply_url || `https://wellfound.com/jobs/${job.id}`,
      salary_min: job.compensation?.min,
      salary_max: job.compensation?.max,
      salary_currency: job.compensation?.currency || 'USD',
      job_type: job.job_type || 'full-time',
      remote: job.locations?.some(l => l.name.toLowerCase().includes('remote')) || false,
      tags: job.tags?.join(',') || '',
      posted_at: new Date(job.published_at || Date.now())
    }));
  }
}

module.exports = WellfoundScraper;
