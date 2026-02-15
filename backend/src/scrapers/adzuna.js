const axios = require('axios');

const ADZUNA_API_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

class AdzunaScraper {
  constructor() {
    this.baseUrl = 'https://api.adzuna.com/v1/api/jobs';
    this.country = 'es'; // Spain
  }

  async searchJobs(keywords, location = '', page = 1) {
    console.log(`[Adzuna] Searching: "${keywords}" in "${location}"`);
    console.log(`[Adzuna] Credentials: ID=${ADZUNA_API_ID ? 'SET' : 'MISSING'}, KEY=${ADZUNA_API_KEY ? 'SET' : 'MISSING'}`);
    
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

      console.log(`[Adzuna] Calling URL: ${url}`);
      const response = await axios.get(url, { params });
      console.log(`[Adzuna] Found ${response.data.results?.length || 0} jobs`);
      return this.normalizeJobs(response.data.results);
    } catch (error) {
      console.error('[Adzuna] API error:', error.message);
      console.error('[Adzuna] Error details:', error.response?.data || 'No response data');
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => {
      // Adzuna usa 'created', no 'created_at'
      const postedDate = job.created || job.created_at || job.date || new Date().toISOString();
      
      return {
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
        job_type: job.contract_type || job.contract_time,
        remote: job.title?.toLowerCase().includes('remote') || 
                job.description?.toLowerCase().includes('remote'),
        tags: job.category?.tag || job.category?.label || '',
        posted_at: new Date(postedDate)
      };
    });
  }
}

module.exports = AdzunaScraper;