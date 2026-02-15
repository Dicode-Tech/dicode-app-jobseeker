import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, ExternalLink, Building2, Calendar } from 'lucide-react';

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      setJob(data);
      setNotes(data.notes || '');
    } catch (err) {
      console.error('Failed to fetch job:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchJob();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const toggleFavorite = async () => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorited: !job.favorited })
      });
      fetchJob();
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
  };

  const saveNotes = async () => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!job) return <div className="error">Job not found</div>;

  const reasons = JSON.parse(job.match_reasons || '[]');

  return (
    <div className="job-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} /> Back
      </button>

      <div className="job-detail-header">
        <div className="job-title-section">
          <h1>{job.title}</h1>
          <div className="job-company-large">
            <Building2 size={20} />
            {job.company}
          </div>
        </div>
        <button 
          className={`favorite-btn-large ${job.favorited ? 'active' : ''}`}
          onClick={toggleFavorite}
        >
          <Star fill={job.favorited ? '#fbbf24' : 'none'} size={24} />
        </button>
      </div>

      <div className="job-detail-meta">
        <span className="meta-item">
          <MapPin size={16} />
          {job.location}
          {job.remote && <span className="remote-tag">Remote</span>}
        </span>
        <span className="meta-item">
          <Calendar size={16} />
          Posted: {new Date(job.posted_at).toLocaleDateString()}
        </span>
        <span className="meta-item source-tag">
          Source: {job.source}
        </span>
      </div>

      <div className="match-score-section">
        <div className="score-display">
          <span className="score-number">{job.match_score || 0}</span>
          <span className="score-label">% Match</span>
        </div>
        <div className="match-reasons-detail">
          <h3>Why this matches:</h3>
          <ul>
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="application-actions">
        <h3>Application Status</h3>
        <div className="status-buttons">
          {['new', 'viewed', 'applied', 'rejected', 'offer'].map(status => (
            <button
              key={status}
              className={`status-btn ${job.status === status ? 'active' : ''}`}
              onClick={() => updateStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="apply-now-btn"
        >
          Apply Now <ExternalLink size={16} />
        </a>
      </div>

      <div className="notes-section">
        <h3>Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your notes about this position..."
          className="notes-textarea"
        />
        <button onClick={saveNotes} className="btn-secondary">
          Save Notes
        </button>
      </div>

      <div className="job-description">
        <h3>Job Description</h3>
        <div className="description-content" dangerouslySetInnerHTML={{ __html: job.description }} />
      </div>
    </div>
  );
}

export default JobDetail;