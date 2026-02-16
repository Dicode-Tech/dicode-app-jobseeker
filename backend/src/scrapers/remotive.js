const axios = require('axios');

/**
 * Remotive Scraper
 * https://remotive.com/
 * Remote job board with public JSON API
 * API Docs: https://remotive.com/api-documentation
 * No API key required!
 */
class RemotiveScraper {
  constructor() {
    this.baseUrl = 'https://remotive.com/api/remote-jobs';
    this.source = 'remotive';
  }

  async searchJobs(keywords = '', location = '', limit = 50) {
    try {
      console.log(`[Remotive] Fetching remote jobs...`);
      
      // Build query params
      const params = {
        limit: Math.min(limit, 100) // API limit is 100
      };
      
      // Add search parameter if keywords provided
      if (keywords) {
        params.search = keywords;
      }
      
      // Add category filter for common tech categories
      const techCategories = [
        'software-development',
        'devops-sysadmin',
        'data',
        'engineering'
      ];
      
      let allJobs = [];
      
      // If no specific keywords, fetch from multiple tech categories
      if (!keywords) {
        for (const category of techCategories.slice(0, 2)) {
          try {
            const catParams = { ...params, category };
            const response = await axios.get(this.baseUrl, {
              params: catParams,
              headers: {
                'User-Agent': 'JobSeeker-App/1.0',
                'Accept': 'application/json'
              },
              timeout: 15000
            });
            
            if (response.data && Array.isArray(response.data.jobs)) {
              const jobs = this.normalizeJobs(response.data.jobs);
              allJobs = allJobs.concat(jobs);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (catError) {
            console.error(`[Remotive] Error fetching category ${category}:`, catError.message);
          }
        }
      } else {
        // Direct search with keywords
        const response = await axios.get(this.baseUrl, {
          params,
          headers: {
            'User-Agent': 'JobSeeker-App/1.0',
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        
        if (response.data && Array.isArray(response.data.jobs)) {
          allJobs = this.normalizeJobs(response.data.jobs);
        }
      }
      
      // Filter by keywords if provided (client-side filtering)
      if (keywords && allJobs.length > 0) {
        const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
        allJobs = allJobs.filter(job => {
          const searchText = `${job.title} ${job.company} ${job.tags} ${job.description || ''}`.toLowerCase();
          return keywordsLower.some(kw => searchText.includes(kw));
        });
      }
      
      // Deduplicate by external_id
      const uniqueJobs = allJobs.filter((job, index, self) => 
        index === self.findIndex(j => j.external_id === job.external_id)
      );
      
      console.log(`[Remotive] Found ${uniqueJobs.length} unique jobs`);
      return uniqueJobs.slice(0, limit);
      
    } catch (error) {
      console.error('[Remotive] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => {
      // Parse salary if available
      let salaryMin = null;
      let salaryMax = null;
      let salaryCurrency = 'USD';
      
      if (job.salary) {
        const salaryMatch = job.salary.match(/\$?([\d,]+)(?:k)?\s*-\s*\$?([\d,]+)(?:k)?/i);
        if (salaryMatch) {
          salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
          salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
          
          // Handle 'k' suffix (e.g., $100k -> 100000)
          if (job.salary.toLowerCase().includes('k')) {
            if (salaryMin < 10000) salaryMin *= 1000;
            if (salaryMax < 10000) salaryMax *= 1000;
          }
        }
      }
      
      // Parse location
      const location = job.candidate_required_location || 'Remote';
      
      // Determine if remote
      const isRemote = location.toLowerCase().includes('remote') || 
                       location.toLowerCase().includes('worldwide') ||
                       location.toLowerCase().includes('anywhere');
      
      // Parse tags
      const tags = Array.isArray(job.tags) ? job.tags.join(',') : (job.tags || '');
      
      // Parse posted date
      let postedAt = new Date();
      try {
        if (job.publication_date) {
          postedAt = new Date(job.publication_date);
        }
      } catch (e) {
        // Keep default date
      }
      
      return {
        external_id: `remotive_${job.id}`,
        source: this.source,
        title: job.title || 'Unknown Position',
        company: job.company_name || 'Unknown Company',
        location: location,
        description: job.description || job.excerpt || '',
        url: job.url || `https://remotive.com/remote-jobs/${job.id}`,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        job_type: this.normalizeJobType(job.job_type),
        remote: isRemote,
        tags: tags,
        posted_at: postedAt
      };
    });
  }

  normalizeJobType(jobType) {
    if (!jobType) return 'full-time';
    const lower = jobType.toLowerCase();
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('part_time') || lower.includes('part-time')) return 'part-time';
    if (lower.includes('freelance')) return 'freelance';
    if (lower.includes('full_time') || lower.includes('full-time')) return 'full-time';
    return lower;
  }
}

module.exports = RemotiveScraper;
