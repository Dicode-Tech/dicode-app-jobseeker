const axios = require('axios');
const cheerio = require('cheerio');

/**
 * We Work Remotely Scraper
 * https://weworkremotely.com/
 * Popular remote job board - RSS and HTML scraping
 */
class WeWorkRemotelyScraper {
  constructor() {
    this.baseUrl = 'https://weworkremotely.com';
    this.rssUrl = 'https://weworkremotely.com/remote-jobs.rss';
    this.source = 'weworkremotely';
  }

  async searchJobs(keywords = '', location = '', category = '') {
    try {
      console.log(`[WeWorkRemotely] Fetching remote jobs...`);
      
      // WWR organizes jobs by categories
      // Categories: programming, design, devops, marketing, etc.
      const categories = category ? [category] : ['programming', 'devops-sysadmin', 'design'];
      
      let allJobs = [];
      
      for (const cat of categories) {
        const url = `${this.baseUrl}/categories/${cat}`;
        console.log(`[WeWorkRemotely] Scraping category: ${cat}`);
        
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 10000
          });
          
          const $ = cheerio.load(response.data);
          const jobs = this.parseJobs($, keywords);
          
          console.log(`[WeWorkRemotely] Found ${jobs.length} jobs in ${cat}`);
          allJobs = allJobs.concat(jobs);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (catError) {
          console.error(`[WeWorkRemotely] Error fetching ${cat}:`, catError.message);
        }
      }
      
      // Filter by keywords if provided
      if (keywords) {
        const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
        allJobs = allJobs.filter(job => {
          const text = `${job.title} ${job.company} ${job.tags}`.toLowerCase();
          return keywordsLower.some(kw => text.includes(kw));
        });
      }
      
      console.log(`[WeWorkRemotely] Total matching jobs: ${allJobs.length}`);
      return allJobs;
      
    } catch (error) {
      console.error('[WeWorkRemotely] Error:', error.message);
      return [];
    }
  }

  parseJobs($, keywords) {
    const jobs = [];
    
    // WWR HTML structure: job listings in sections
    $('section.jobs li').each((i, el) => {
      try {
        const $el = $(el);
        
        // Check if it's a featured job (skip the "Featured" header)
        if ($el.hasClass('feature')) return;
        
        const titleEl = $el.find('.title');
        const companyEl = $el.find('.company');
        const linkEl = $el.find('a');
        
        const title = titleEl.text().trim();
        const company = companyEl.text().trim();
        const relativeUrl = linkEl.attr('href');
        
        if (!title || !company) return;
        
        // Build full URL
        const url = relativeUrl?.startsWith('http') 
          ? relativeUrl 
          : `${this.baseUrl}${relativeUrl}`;
        
        // Generate unique ID from URL
        const jobId = relativeUrl 
          ? relativeUrl.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
          : `wwr_${Date.now()}_${i}`;
        
        // Try to extract job type from title or tags
        const titleLower = title.toLowerCase();
        const isRemote = true; // All WWR jobs are remote
        let jobType = 'full-time';
        
        if (titleLower.includes('contract')) jobType = 'contract';
        else if (titleLower.includes('part-time')) jobType = 'part-time';
        else if (titleLower.includes('freelance')) jobType = 'freelance';
        
        jobs.push({
          external_id: `wwr_${jobId}`,
          source: this.source,
          title: title,
          company: company,
          location: 'Remote',
          description: `Remote position at ${company}. Posted on We Work Remotely.`,
          url: url,
          salary_min: null,
          salary_max: null,
          salary_currency: 'USD',
          job_type: jobType,
          remote: true,
          tags: this.extractTags(title),
          posted_at: new Date() // WWR doesn't show dates in list view
        });
        
      } catch (parseError) {
        console.error('[WeWorkRemotely] Parse error:', parseError.message);
      }
    });
    
    return jobs;
  }

  extractTags(title) {
    const tags = [];
    const titleLower = title.toLowerCase();
    
    // Common tech keywords
    const techKeywords = [
      'javascript', 'python', 'react', 'node', 'typescript', 'go', 'golang',
      'ruby', 'rails', 'php', 'laravel', 'java', 'kotlin', 'swift',
      'aws', 'docker', 'kubernetes', 'devops', 'frontend', 'backend',
      'full-stack', 'fullstack', 'mobile', 'ios', 'android', 'web',
      'senior', 'lead', 'principal', 'staff', 'manager', 'director'
    ];
    
    techKeywords.forEach(kw => {
      if (titleLower.includes(kw)) tags.push(kw);
    });
    
    return tags.join(',');
  }
}

module.exports = WeWorkRemotelyScraper;
