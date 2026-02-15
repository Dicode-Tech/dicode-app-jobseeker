const axios = require('axios');

/**
 * Arbeitnow Scraper
 * Free API alternative to GitHub Jobs
 * API Docs: https://www.arbeitnow.com/api/job-board-api
 * No API key required!
 */
class ArbeitnowScraper {
  constructor() {
    this.baseUrl = 'https://www.arbeitnow.com/api/job-board-api';
    this.source = 'arbeitnow';
  }

  async searchJobs(keywords = '', location = '', page = 1) {
    try {
      console.log(`[Arbeitnow] Searching: "${keywords}"...`);
      
      // Build query params
      const params = {
        page: page,
        sort_by: 'date'
      };
      
      if (keywords) params.query = keywords;
      if (location) params.location = location;

      const response = await axios.get(this.baseUrl, { 
        params,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'JobSeeker-App/1.0'
        }
      });

      if (!response.data || !response.data.data) {
        console.log('[Arbeitnow] No results');
        return [];
      }

      const jobs = response.data.data;
      console.log(`[Arbeitnow] Found ${jobs.length} jobs`);
      
      return this.normalizeJobs(jobs);
    } catch (error) {
      console.error('[Arbeitnow] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => ({
      external_id: `arbeitnow_${job.slug || job.id}`,
      source: this.source,
      title: job.title || 'Unknown Position',
      company: job.company_name || 'Unknown Company',
      location: job.location || 'Remote/Unknown',
      description: job.description || job.tags?.join(', ') || '',
      url: job.url || job.apply_url || `https://www.arbeitnow.com/jobs/${job.slug}`,
      salary_min: null, // Arbeitnow doesn't always provide salary
      salary_max: null,
      salary_currency: 'EUR', // Mostly European jobs
      job_type: job.job_types?.[0] || 'full-time',
      remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
      tags: job.tags?.join(',') || '',
      posted_at: new Date(job.created_at || Date.now())
    }));
  }
}

module.exports = ArbeitnowScraper;
