const axios = require('axios');

const ADZUNA_API_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

class AdzunaScraper {
  constructor() {
    this.baseUrl = 'https://api.adzuna.com/v1/api/jobs';
    this.country = 'es'; // Spain
  }

  async searchJobs(keywords, location = '', page = 1) {
    if (!ADZUNA_API_ID || !ADZUNA_API_KEY) {
      console.warn('Adzuna API credentials not configured');
      return [];
    }

    try {
      const url = `${this.baseUrl}/${this.country}/search/${page}`;
      const params = {
        app_id: ADZUNA_API_ID,
        app_key: ADZUNA_API_KEY,
        what: keywords,
        where: location,
        max_days_old: 7,
        sort_by: 'date',
        results_per_page: 50
      };

      const response = await axios.get(url, { params });
      return this.normalizeJobs(response.data.results);
    } catch (error) {
      console.error('Adzuna API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => ({
      external_id: `adzuna_${job.id}`,
      source: 'adzuna',
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || '',
      description: job.description,
      url: job.redirect_url,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
      job_type: job.contract_time,
      remote: job.title.toLowerCase().includes('remote') || 
              job.description.toLowerCase().includes('remote'),
      tags: job.category?.tag || '',
      posted_at: new Date(job.created_at)
    }));
  }
}

module.exports = AdzunaScraper;