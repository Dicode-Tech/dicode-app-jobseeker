const Fuse = require('fuse.js');
const userProfile = require('../config/userProfile');

/**
 * Calculate match score (0-100) between a job and user profile
 */
function calculateMatchScore(job) {
  let score = 0;
  const reasons = [];

  // 1. Title match (max 30 points)
  const titleScore = scoreTitleMatch(job.title);
  score += titleScore.points;
  if (titleScore.reason) reasons.push(titleScore.reason);

  // 2. Skills match (max 25 points)
  const skillsScore = scoreSkillsMatch(job);
  score += skillsScore.points;
  if (skillsScore.reason) reasons.push(skillsScore.reason);

  // 3. Location match (max 20 points)
  const locationScore = scoreLocationMatch(job);
  score += locationScore.points;
  if (locationScore.reason) reasons.push(locationScore.reason);

  // 4. Stack/Technology match (max 15 points)
  const techScore = scoreTechMatch(job);
  score += techScore.points;
  if (techScore.reason) reasons.push(techScore.reason);

  // 5. Deal breakers check (penalty)
  const dealBreaker = checkDealBreakers(job);
  if (dealBreaker.violated) {
    return { score: 0, reasons: [`❌ Deal breaker: ${dealBreaker.reason}`] };
  }

  // Cap at 100
  score = Math.min(100, Math.round(score));

  return { score, reasons };
}

function scoreTitleMatch(jobTitle) {
  if (!jobTitle) return { points: 0, reason: null };
  const title = String(jobTitle).toLowerCase();
  const targetTitles = userProfile.targetTitles.map(t => t.toLowerCase());
  
  // Exact match
  for (const target of targetTitles) {
    if (title.includes(target)) {
      return { points: 30, reason: `✅ Exact title match: ${target}` };
    }
  }
  
  // Partial match
  const keywords = ['head', 'vp', 'cto', 'engineering', 'product', 'principal', 'staff', 'director', 'lead'];
  let matches = 0;
  for (const kw of keywords) {
    if (title.includes(kw)) matches++;
  }
  
  if (matches >= 2) {
    return { points: 20, reason: `⚠️ Partial title match (${matches} keywords)` };
  } else if (matches === 1) {
    return { points: 10, reason: `⚠️ Weak title match` };
  }
  
  return { points: 0, reason: null };
}

function scoreSkillsMatch(job) {
  const description = (job.description || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const tags = (job.tags || '').toLowerCase();
  const text = `${title} ${description} ${tags}`;
  
  let matches = 0;
  const allSkills = [
    ...userProfile.skills.primary,
    ...userProfile.skills.secondary,
    ...userProfile.skills.devops
  ];
  
  const matchedSkills = [];
  for (const skill of allSkills) {
    if (text.includes(skill.toLowerCase())) {
      matches++;
      matchedSkills.push(skill);
    }
  }
  
  if (matches >= 5) {
    return { points: 25, reason: `✅ Strong skills match (${matches}): ${matchedSkills.slice(0, 5).join(', ')}` };
  } else if (matches >= 3) {
    return { points: 15, reason: `✅ Good skills match (${matches})` };
  } else if (matches >= 1) {
    return { points: 5, reason: `⚠️ Weak skills match (${matches})` };
  }
  
  return { points: 0, reason: null };
}

function scoreLocationMatch(job) {
  const location = (job.location || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  
  // Remote/hybrid keywords
  const remoteKeywords = ['remote', 'híbrido', 'hybrid', 'home office', 'teletrabajo'];
  const isRemote = remoteKeywords.some(kw => 
    location.includes(kw) || description.includes(kw)
  );
  
  if (isRemote) {
    return { points: 20, reason: '✅ Remote/hybrid position' };
  }
  
  // Spain match
  if (location.includes('españa') || location.includes('spain') || location.includes('valencia')) {
    return { points: 15, reason: '✅ Spain-based position' };
  }
  
  // Europe match
  const europeCountries = ['alemania', 'germany', 'francia', 'france', 'portugal', 'italia', 'italy', 'uk', 'netherlands'];
  if (europeCountries.some(c => location.includes(c))) {
    return { points: 10, reason: '✅ Europe-based position' };
  }
  
  return { points: 0, reason: '⚠️ Location unclear' };
}

function scoreTechMatch(job) {
  // Same as skills but focused on primary stack
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  
  let matches = 0;
  for (const tech of userProfile.skills.primary) {
    if (text.includes(tech.toLowerCase())) matches++;
  }
  
  if (matches >= 3) {
    return { points: 15, reason: `✅ Primary stack match (${matches})` };
  } else if (matches >= 2) {
    return { points: 10, reason: `✅ Good tech match (${matches})` };
  } else if (matches >= 1) {
    return { points: 5, reason: `⚠️ Some tech overlap` };
  }
  
  return { points: 0, reason: null };
}

function checkDealBreakers(job) {
  const description = (job.description || '').toLowerCase();
  
  // Check for equity-only indicators
  if (userProfile.dealBreakers.equityOnly) {
    const equityOnlyKeywords = [
      'equity only',
      'solo equity',
      'sin sueldo',
      'sin salario',
      'unpaid',
      'volunteer',
      'no salary'
    ];
    
    for (const kw of equityOnlyKeywords) {
      if (description.includes(kw)) {
        return { violated: true, reason: 'Equity-only position (no salary)' };
      }
    }
  }
  
  // Check for excluded tech
  for (const tech of userProfile.dealBreakers.excludedTech) {
    if (description.includes(tech.toLowerCase())) {
      return { violated: true, reason: `Uses excluded tech: ${tech}` };
    }
  }
  
  return { violated: false, reason: null };
}

module.exports = { calculateMatchScore };