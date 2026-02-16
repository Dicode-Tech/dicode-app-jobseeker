const axios = require('axios');

/**
 * Working Nomads Scraper
 * https://www.workingnomads.com/
 * Remote job board with JSON API
 * API endpoint: https://www.workingnomads.com/api/exposed_jobs/
 * No API key required!
 */
class WorkingNomadsScraper {
  constructor() {
    this.baseUrl = 'https://www.workingnomads.com/api/exposed_jobs/';
    this.source = 'workingnomads';
  }

  async searchJobs(keywords = '', location = '', limit = 50) {
    try {
      console.log(`[WorkingNomads] Fetching remote jobs...`);
      
      // Fetch jobs from API
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 20000
      });
      
      if (!Array.isArray(response.data)) {
        console.log('[WorkingNomads] Invalid response format');
        return [];
      }
      
      let jobs = this.normalizeJobs(response.data);
      
      // Filter by keywords if provided
      if (keywords && jobs.length > 0) {
        const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
        jobs = jobs.filter(job => {
          const searchText = `${job.title} ${job.company} ${job.tags} ${job.description || ''}`.toLowerCase();
          return keywordsLower.some(kw => searchText.includes(kw));
        });
      }
      
      // Filter by location if provided
      if (location && jobs.length > 0) {
        const locationLower = location.toLowerCase();
        jobs = jobs.filter(job => {
          const jobLocation = (job.location || '').toLowerCase();
          return jobLocation.includes(locationLower);
        });
      }
      
      // Sort by posted date (newest first)
      jobs.sort((a, b) => b.posted_at - a.posted_at);
      
      console.log(`[WorkingNomads] Found ${jobs.length} jobs`);
      return jobs.slice(0, limit);
      
    } catch (error) {
      console.error('[WorkingNomads] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => {
      // Parse location
      const location = job.location || 'Remote';
      
      // Parse tags
      let tags = job.tags || '';
      if (job.category_name && !tags.includes(job.category_name)) {
        tags = tags ? `${tags},${job.category_name}` : job.category_name;
      }
      
      // Parse posted date
      let postedAt = new Date();
      try {
        if (job.pub_date) {
          postedAt = new Date(job.pub_date);
        }
      } catch (e) {
        // Keep default date
      }
      
      // Generate unique ID from URL
      const jobId = this.extractIdFromUrl(job.url);
      
      return {
        external_id: `workingnomads_${jobId}`,
        source: this.source,
        title: job.title || 'Unknown Position',
        company: job.company_name || 'Unknown Company',
        location: location,
        description: job.description || '',
        url: job.url || 'https://www.workingnomads.com/jobs',
        salary_min: null, // Working Nomads doesn't consistently provide salary
        salary_max: null,
        salary_currency: 'USD',
        job_type: 'remote', // All jobs on Working Nomads are remote
        remote: true,
        tags: tags,
        posted_at: postedAt
      };
    });
  }

  extractIdFromUrl(url) {
    if (!url) return Date.now();
    
    // Try to extract ID from URL pattern like: /job/go/123456/
    const match = url.match(/\/job\/go\/(\d+)/);
    if (match) {
      return match[1];
    }
    
    // Fallback: create hash from URL
    return url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  }
}

module.exports = WorkingNomadsScraper;
