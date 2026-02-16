const axios = require('axios');

/**
 * Himalayas Scraper
 * https://himalayas.app/
 * Remote job board with JSON API
 * API endpoint: https://himalayas.app/jobs/api
 * No API key required!
 */
class HimalayasScraper {
  constructor() {
    this.baseUrl = 'https://himalayas.app/jobs/api';
    this.source = 'himalayas';
  }

  async searchJobs(keywords = '', location = '', limit = 50) {
    try {
      console.log(`[Himalayas] Fetching remote jobs...`);
      
      // Build query params
      const params = {
        limit: Math.min(limit, 100)
      };
      
      // Add search offset if needed for pagination
      let allJobs = [];
      let offset = 0;
      const maxRequests = 3; // Limit to avoid too many requests
      
      for (let i = 0; i < maxRequests && allJobs.length < limit; i++) {
        params.offset = offset;
        
        try {
          const response = await axios.get(this.baseUrl, {
            params,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://himalayas.app/jobs'
            },
            timeout: 15000
          });
          
          if (response.data && Array.isArray(response.data.jobs)) {
            const jobs = this.normalizeJobs(response.data.jobs);
            allJobs = allJobs.concat(jobs);
            
            // Check if there are more jobs
            if (response.data.totalCount && allJobs.length >= response.data.totalCount) {
              break;
            }
            
            offset += params.limit;
          } else {
            break;
          }
        } catch (reqError) {
          console.error(`[Himalayas] Request error:`, reqError.message);
          break;
        }
        
        // Small delay between requests
        if (i < maxRequests - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Filter by keywords if provided
      if (keywords && allJobs.length > 0) {
        const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
        allJobs = allJobs.filter(job => {
          const searchText = `${job.title} ${job.company} ${job.tags} ${job.description || ''}`.toLowerCase();
          return keywordsLower.some(kw => searchText.includes(kw));
        });
      }
      
      // Filter by location if provided
      if (location && allJobs.length > 0) {
        const locationLower = location.toLowerCase();
        allJobs = allJobs.filter(job => {
          const jobLocation = (job.location || '').toLowerCase();
          return jobLocation.includes(locationLower);
        });
      }
      
      // Deduplicate by external_id
      const uniqueJobs = allJobs.filter((job, index, self) => 
        index === self.findIndex(j => j.external_id === job.external_id)
      );
      
      console.log(`[Himalayas] Found ${uniqueJobs.length} unique jobs`);
      return uniqueJobs.slice(0, limit);
      
    } catch (error) {
      console.error('[Himalayas] API error:', error.message);
      return [];
    }
  }

  normalizeJobs(results) {
    return results.map(job => {
      // Parse location restrictions
      let location = 'Remote';
      if (job.locationRestrictions && job.locationRestrictions.length > 0) {
        location = job.locationRestrictions.join(', ');
      }
      
      // Parse tags from categories
      let tags = '';
      if (job.categories && job.categories.length > 0) {
        tags = job.categories.join(',');
      }
      
      // Parse seniority level
      let seniority = '';
      if (job.seniority && job.seniority.length > 0) {
        seniority = job.seniority.join(', ');
        tags = tags ? `${tags},${seniority}` : seniority;
      }
      
      // Parse posted date (pubDate is Unix timestamp in seconds)
      let postedAt = new Date();
      try {
        if (job.pubDate) {
          // pubDate is in seconds, convert to milliseconds
          postedAt = new Date(job.pubDate * 1000);
        }
      } catch (e) {
        // Keep default date
      }
      
      // Parse salary
      let salaryMin = job.minSalary || null;
      let salaryMax = job.maxSalary || null;
      let salaryCurrency = job.currency || 'USD';
      
      return {
        external_id: `himalayas_${this.generateId(job.guid || job.applicationLink)}`,
        source: this.source,
        title: job.title || 'Unknown Position',
        company: job.companyName || 'Unknown Company',
        location: location,
        description: job.description || job.excerpt || '',
        url: job.applicationLink || job.guid || 'https://himalayas.app/jobs',
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        job_type: this.normalizeJobType(job.employmentType),
        remote: true, // Himalayas is exclusively remote jobs
        tags: tags,
        posted_at: postedAt
      };
    });
  }

  generateId(url) {
    if (!url) return Date.now();
    // Extract ID from URL or hash the URL
    const match = url.match(/\/jobs\/([^/]+)$/);
    if (match) {
      return match[1];
    }
    // Create a simple hash from URL
    return url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  }

  normalizeJobType(employmentType) {
    if (!employmentType) return 'full-time';
    const lower = employmentType.toLowerCase();
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('part')) return 'part-time';
    if (lower.includes('freelance')) return 'freelance';
    if (lower.includes('full')) return 'full-time';
    if (lower.includes('intern')) return 'internship';
    return lower;
  }
}

module.exports = HimalayasScraper;
