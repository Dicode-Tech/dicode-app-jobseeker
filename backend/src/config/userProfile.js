// User profile configuration for job matching
// Update this file to adjust your preferences

const userProfile = {
  // Identity
  name: "Duilio Izzi",
  title: "Head of Engineering",
  summary: "Technical leader with expertise in cloud infrastructure, DevOps, and full-stack development. Experienced in scaling engineering teams and architecting robust systems.",

  // Target positions (in order of preference)
  targetTitles: [
    "Head of Engineering",
    "VP of Engineering",
    "Chief Technology Officer",
    "CTO",
    "VP of Product",
    "Chief Product Officer",
    "Director of Engineering",
    "Staff Engineer",
    "Principal Engineer"
  ],

  // Seniority levels
  seniority: ["Senior", "Staff", "VP", "C-Level", "Director"],

  // Location preferences (in order)
  locationPreference: {
    remote: 100,      // 100% open to remote
    hybrid: 80,       // Hybrid in Spain
    onsite: 50,       // Only Valencia for on-site
    allowedCountries: ["Spain", "Europe"],
    preferredCities: ["Valencia", "Madrid", "Barcelona"]
  },

  // Technology stack
  skills: {
    primary: [
      "Go",
      "Python",
      "Kubernetes",
      "AWS",
      "Docker",
      "Terraform",
      "Linux"
    ],
    secondary: [
      "JavaScript",
      "Node.js",
      "TypeScript",
      "React",
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "Git"
    ],
    devops: [
      "CI/CD",
      "GitHub Actions",
      "Jenkins",
      "Monitoring",
      "Observability",
      "Security"
    ]
  },

  // Industry preferences (no strong preference, but ranked)
  industries: {
    preferred: ["Fintech", "HealthTech", "SaaS", "AI/ML", "DevTools", "Cloud"],
    neutral: ["E-commerce", "EdTech", "Marketplace"],
    avoid: []
  },

  // Company stage preferences
  companyStage: {
    seed: 70,        // Early but funded
    seriesA: 90,     // Sweet spot
    seriesB: 85,
    seriesC: 80,
    growth: 70,
    corporate: 50    // Lower priority
  },

  // Deal breakers
  dealBreakers: {
    // Avoid equity-only positions (want salary compensation)
    equityOnly: true,
    
    // Minimum team size (avoid solo-founder seeking CTO)
    minTeamSize: 3,
    
    // Excluded company types
    excludedTypes: ["agency", "consulting", "body-shop"],
    
    // Excluded technologies (legacy stacks you don't want)
    excludedTech: ["PHP", "WordPress", "jQuery", ".NET Framework"]
  },

  // Salary expectations (null = no strict requirement)
  salary: {
    min: null,
    max: null,
    currency: "EUR",
    negotiable: true
  }
};

module.exports = userProfile;
