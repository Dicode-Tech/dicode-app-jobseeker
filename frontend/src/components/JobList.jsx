import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, DollarSign, ExternalLink, Filter } from 'lucide-react';

function JobList() {
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    minScore: 0,
    status: 'all',
    favorited: false,
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  useEffect(() => {
    fetchJobs();
    fetchTotal();
  }, [filters, offset]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minScore: filters.minScore,
        status: filters.status,
        limit: LIMIT,
        offset: offset
      });
      if (filters.favorited) params.set('favorited', 'true');
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotal = async () => {
    try {
      const res = await fetch('/api/jobs/count');
      const data = await res.json();
      setTotalJobs(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch total:', err);
    }
  };

  const loadMore = () => {
    setOffset(prev => prev + LIMIT);
  };

  const loadPrevious = () => {
    setOffset(prev => Math.max(0, prev - LIMIT));
  };

  const toggleFavorite = async (id, current) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorited: !current })
      });
      fetchJobs();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="job-list">
      <div className="filters">
        <div className="filter-group">
          <Filter size={16} />
          <select 
            value={filters.minScore} 
            onChange={(e) => setFilters({...filters, minScore: e.target.value})}
          >
            <option value={0}>All Scores</option>
            <option value={40}>Score 40+</option>
            <option value={60}>Score 60+</option>
            <option value={80}>Score 80+ (High)</option>
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="viewed">Viewed</option>
            <option value="applied">Applied</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <label className="filter-checkbox">
          <input 
            type="checkbox" 
            checked={filters.favorited}
            onChange={(e) => setFilters({...filters, favorited: e.target.checked})}
          />
          Favorites Only
        </label>

        <input
          type="text"
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading jobs...</div>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job.id} className={`job-card ${job.favorited ? 'favorited' : ''}`}>
              <div className="job-header">
                <div className="job-title-row">
                  <h3 className="job-title">
                    <Link to={`/job/${job.id}`}>{job.title}</Link>
                  </h3>
                  <button 
                    className="favorite-btn"
                    onClick={() => toggleFavorite(job.id, job.favorited)}
                  >
                    <Star fill={job.favorited ? '#fbbf24' : 'none'} size={20} />
                  </button>
                </div>
                <div className="job-company">{job.company}</div>
              </div>

              <div className="job-meta">
                <span className="job-location">
                  <MapPin size={14} />
                  {job.location}
                </span>
                {job.remote && <span className="remote-badge">🌍 Remote</span>}
              </div>

              <div className="job-score" style={{ color: getScoreColor(job.match_score || 0) }}>
                <div className="score-circle">
                  <span className="score-value">{job.match_score ?? 0}</span>
                  <span className="score-label">match</span>
                </div>
                {job.match_reasons && (
                  <div className="match-reasons">
                    {(() => {
                      try {
                        const reasons = JSON.parse(job.match_reasons);
                        return reasons.slice(0, 2).map((r, i) => (
                          <span key={i} className="reason-tag">{r}</span>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>

              <div className="job-footer">
                <span className="job-source">via {job.source}</span>
                <span className="job-date">{new Date(job.posted_at).toLocaleDateString()}</span>
                <a 
                  href={job.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="apply-link"
                >
                  Apply <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="empty-state">
          <p>No jobs found matching your criteria.</p>
          <button onClick={fetchJobs} className="btn-primary">Refresh Jobs</button>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {offset + 1}-{Math.min(offset + jobs.length, totalJobs)} of {totalJobs} jobs
          </div>
          <div className="pagination-buttons">
            <button 
              onClick={loadPrevious} 
              disabled={offset === 0}
              className="btn-secondary"
            >
              ← Previous
            </button>
            <button 
              onClick={loadMore} 
              disabled={offset + LIMIT >= totalJobs}
              className="btn-secondary"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobList;