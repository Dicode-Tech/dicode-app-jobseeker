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
    console.log(`[WeWorkRemotely] Starting job search...`);
    
    try {
      // First try RSS feed (more reliable, has dates and descriptions)
      const rssJobs = await this.fetchFromRSS(keywords);
      
      if (rssJobs.length > 0) {
        console.log(`[WeWorkRemotely] RSS returned ${rssJobs.length} jobs`);
        return rssJobs;
      }
      
      // Fall back to HTML scraping if RSS fails
      console.log(`[WeWorkRemotely] RSS empty, falling back to HTML scraping...`);
      return await this.fetchFromHTML(keywords, category);
      
    } catch (error) {
      console.error('[WeWorkRemotely] Error:', error.message);
      return [];
    }
  }

  async fetchFromRSS(keywords = '') {
    try {
      console.log(`[WeWorkRemotely] Fetching RSS feed...`);
      
      const response = await axios.get(this.rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 20000,
        maxRedirects: 5
      });

      console.log(`[WeWorkRemotely] RSS response: ${response.status}, length: ${response.data?.length || 0}`);

      const $ = cheerio.load(response.data, { xmlMode: true });
      const jobs = [];

      $('item').each((i, el) => {
        try {
          const $item = $(el);
          
          // Parse the title (format: "Company: Job Title")
          const titleText = $item.find('title').text().trim();
          const titleMatch = titleText.match(/^(.+?):\s*(.+)$/);
          
          let company, title;
          if (titleMatch) {
            company = titleMatch[1].trim();
            title = titleMatch[2].trim();
          } else {
            company = 'Unknown Company';
            title = titleText;
          }

          // Get description and clean it up
          let description = $item.find('description').text().trim();
          // Decode HTML entities
          description = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

          // Get job URL from guid or link
          let url = $item.find('guid').text().trim() || $item.find('link').text().trim();
          
          // Make sure URL is absolute
          if (url && !url.startsWith('http')) {
            url = `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
          }

          // Extract external ID from URL
          const urlMatch = url.match(/\/remote-jobs\/(.+)$/);
          const externalId = urlMatch ? urlMatch[1].replace(/\//g, '_') : `wwr_${Date.now()}_${i}`;

          // Parse publication date
          const pubDate = $item.find('pubDate').text().trim();
          const postedAt = pubDate ? new Date(pubDate) : new Date();

          // Get region/location
          const region = $item.find('region').text().trim() || 'Remote';
          
          // Get job type
          const jobType = $item.find('type').text().trim() || 'full-time';
          
          // Get category
          const jobCategory = $item.find('category').text().trim() || '';

          // Get skills/tags
          const skills = $item.find('skills').text().trim();
          const tags = skills ? skills.split(',').map(s => s.trim()).join(',') : '';

          // Filter by keywords if provided
          if (keywords) {
            const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
            const searchText = `${title} ${company} ${tags} ${jobCategory}`.toLowerCase();
            if (!keywordsLower.some(kw => searchText.includes(kw))) {
              return; // Skip this job
            }
          }

          jobs.push({
            external_id: `wwr_${externalId}`,
            source: this.source,
            title: title,
            company: company,
            location: region,
            description: description || `Remote position at ${company}. Posted on We Work Remotely.`,
            url: url,
            salary_min: null,
            salary_max: null,
            salary_currency: 'USD',
            job_type: this.normalizeJobType(jobType),
            remote: true,
            tags: tags,
            posted_at: postedAt
          });

        } catch (parseError) {
          console.error(`[WeWorkRemotely] RSS parse error for item ${i}:`, parseError.message);
        }
      });

      console.log(`[WeWorkRemotely] RSS parsed ${jobs.length} jobs`);
      return jobs;

    } catch (error) {
      console.error('[WeWorkRemotely] RSS fetch error:', error.message);
      return [];
    }
  }

  async fetchFromHTML(keywords = '', category = '') {
    try {
      console.log(`[WeWorkRemotely] Fetching HTML categories...`);

      // WWR organizes jobs by categories
      const categories = category ? [category] : ['programming', 'devops-sysadmin', 'design'];
      let allJobs = [];

      for (const cat of categories) {
        const url = `${this.baseUrl}/categories/${cat}`;
        console.log(`[WeWorkRemotely] Scraping category: ${cat}`);

        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Referer': 'https://weworkremotely.com/'
            },
            timeout: 15000,
            maxRedirects: 5,
            decompress: true
          });

          console.log(`[WeWorkRemotely] Response: ${response.status}, length: ${response.data?.length || 0}`);

          const $ = cheerio.load(response.data);
          const jobs = this.parseJobsFromHTML($, keywords, cat);

          console.log(`[WeWorkRemotely] Found ${jobs.length} jobs in ${cat}`);
          allJobs = allJobs.concat(jobs);

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (catError) {
          console.error(`[WeWorkRemotely] Error fetching ${cat}:`, catError.message);
        }
      }

      console.log(`[WeWorkRemotely] HTML scraping total: ${allJobs.length} jobs`);
      return allJobs;

    } catch (error) {
      console.error('[WeWorkRemotely] HTML fetch error:', error.message);
      return [];
    }
  }

  parseJobsFromHTML($, keywords, category) {
    const jobs = [];

    // Updated selectors for new WWR HTML structure
    $('section.jobs li').each((i, el) => {
      try {
        const $el = $(el);

        // Skip ads
        if ($el.hasClass('feature--ad')) return;

        // Extract title from new structure
        const title = $el.find('.new-listing__header__title').text().trim();
        
        // Extract company from new structure
        const company = $el.find('.new-listing__company-name').text().trim() || 'Unknown Company';

        // Get the job URL
        const linkEl = $el.find('a.listing-link--unlocked, a[href^="/remote-jobs/"]').first();
        const relativeUrl = linkEl.attr('href');

        if (!title) {
          console.log(`[WeWorkRemotely] Skipping job ${i}: no title found`);
          return;
        }

        // Build full URL
        const url = relativeUrl?.startsWith('http')
          ? relativeUrl
          : `${this.baseUrl}${relativeUrl}`;

        // Generate unique ID from URL
        let jobId;
        if (relativeUrl) {
          const match = relativeUrl.match(/\/remote-jobs\/(.+)$/);
          jobId = match ? match[1].replace(/\//g, '_') : relativeUrl.replace(/[^a-zA-Z0-9_-]/g, '_');
        } else {
          jobId = `${Date.now()}_${i}`;
        }

        // Get location
        const location = $el.find('.new-listing__company-headquarters').text().trim() || 'Remote';

        // Get region from category info
        const regionText = $el.find('.new-listing__region').text().trim();

        // Filter by keywords if provided
        if (keywords) {
          const keywordsLower = keywords.toLowerCase().split(/[\s,]+/);
          const searchText = `${title} ${company}`.toLowerCase();
          if (!keywordsLower.some(kw => searchText.includes(kw))) {
            return;
          }
        }

        // Extract tags from title
        const tags = this.extractTags(title);

        // Determine job type from title
        const titleLower = title.toLowerCase();
        let jobType = 'full-time';
        if (titleLower.includes('contract')) jobType = 'contract';
        else if (titleLower.includes('part-time')) jobType = 'part-time';
        else if (titleLower.includes('freelance')) jobType = 'freelance';

        jobs.push({
          external_id: `wwr_${jobId}`,
          source: this.source,
          title: title,
          company: company,
          location: location,
          description: `Remote position at ${company}. Posted on We Work Remotely in ${category}.`,
          url: url,
          salary_min: null,
          salary_max: null,
          salary_currency: 'USD',
          job_type: jobType,
          remote: true,
          tags: tags,
          posted_at: new Date() // HTML doesn't show dates
        });

      } catch (parseError) {
        console.error(`[WeWorkRemotely] HTML parse error:`, parseError.message);
      }
    });

    return jobs;
  }

  normalizeJobType(type) {
    if (!type) return 'full-time';
    const lower = type.toLowerCase();
    if (lower.includes('contract')) return 'contract';
    if (lower.includes('part-time')) return 'part-time';
    if (lower.includes('freelance')) return 'freelance';
    if (lower.includes('full-time')) return 'full-time';
    return lower;
  }

  extractTags(title) {
    const tags = [];
    if (!title) return '';
    
    const titleLower = title.toLowerCase();

    // Common tech keywords
    const techKeywords = [
      'javascript', 'python', 'react', 'node', 'typescript', 'go', 'golang',
      'ruby', 'rails', 'php', 'laravel', 'java', 'kotlin', 'swift',
      'aws', 'docker', 'kubernetes', 'devops', 'frontend', 'backend',
      'full-stack', 'fullstack', 'mobile', 'ios', 'android', 'web',
      'senior', 'lead', 'principal', 'staff', 'manager', 'director',
      'data', 'engineer', 'designer', 'marketing', 'sales', 'product'
    ];

    techKeywords.forEach(kw => {
      if (titleLower.includes(kw)) tags.push(kw);
    });

    return tags.join(',');
  }
}

module.exports = WeWorkRemotelyScraper;
