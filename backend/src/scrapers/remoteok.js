const axios = require('axios');

/**
 * RemoteOK Scraper
 * API Docs: https://remoteok.com/api
 * No API key required!
 */
class RemoteOKScraper {
  constructor() {
    this.baseUrl = 'https://remoteok.com/api';
    this.source = 'remoteok';
  }

  async searchJobs(keywords = '', location = '', tags = []) {
    try {
      console.log(`[RemoteOK] Fetching remote jobs...`);
      
      // RemoteOK API returns all jobs, we filter by keywords/tags client-side
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Node.js jobseeker bot)'
        }
      });

      if (!Array.isArray(response.data)) {
        console.log('[RemoteOK] Invalid response format');
        return [];
      }

      // Filter jobs by keywords if provided
      let jobs = response.data.filter(job => job.id); // Filter out legal/ads entries
      
      if (keywords) {
        const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
        jobs = jobs.filter(job => {
          const text = `${job.position || ''} ${job.description || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
          return keywordsLower.some(kw => text.includes(kw));
        });
      }

      // Filter by tags if provided
      if (tags && tags.length > 0) {
        jobs = jobs.filter(job => {
          const jobTags = job.tags?.map(t => t.toLowerCase()) || [];
          return tags.some(tag => jobTags.includes(tag.toLowerCase()));
        });
      }

      console.log(`[RemoteOK] Found ${jobs.length} matching jobs`);
      return this.normalizeJobs(jobs);
    } catch (error) {
      console.error('[RemoteOK] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => ({
      external_id: `remoteok_${job.id}`,
      source: this.source,
      title: job.position || job.title || 'Unknown Position',
      company: job.company || 'Unknown Company',
      location: 'Remote',
      description: job.description || job.about || '',
      url: job.apply_url || job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      salary_min: this.parseSalary(job.salary_min),
      salary_max: this.parseSalary(job.salary_max),
      salary_currency: 'USD', // RemoteOK usually shows USD
      job_type: 'remote',
      remote: true,
      tags: job.tags?.join(',') || '',
      posted_at: new Date(job.date || Date.now())
    }));
  }

  parseSalary(salary) {
    if (!salary) return null;
    // Remove non-numeric chars except decimal
    const num = parseInt(String(salary).replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? null : num;
  }
}

module.exports = RemoteOKScraper;
