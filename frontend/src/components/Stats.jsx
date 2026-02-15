import { useState, useEffect } from 'react';
import { TrendingUp, Briefcase, Star, CheckCircle } from 'lucide-react';

function Stats() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchLogs()]).finally(() => setLoading(false));
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchLogs = async () => {
    // This would be a separate endpoint in a full implementation
    setLogs([]);
  };

  if (loading) return <div className="loading">Loading stats...</div>;

  return (
    <div className="stats-page">
      <h2>📊 Dashboard</h2>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Briefcase /></div>
            <div className="stat-value">{stats.total_jobs}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
          
          <div className="stat-card highlight">
            <div className="stat-icon"><TrendingUp /></div>
            <div className="stat-value">{stats.high_matches}</div>
            <div className="stat-label">High Matches (80%+)</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon"><Star /></div>
            <div className="stat-value">{stats.favorited}</div>
            <div className="stat-label">Favorited</div>
          </div>
          
          <div className="stat-card success">
            <div className="stat-icon"><CheckCircle /></div>
            <div className="stat-value">{stats.applied}</div>
            <div className="stat-label">Applied</div>
          </div>
        </div>
      )}

      {stats && (
        <div className="stats-breakdown">
          <h3>📈 Conversion Rate</h3>
          <div className="progress-section">
            <div className="progress-bar-large">
              <span>Application Rate</span>
              <div className="bar">
                <div 
                  className="fill" 
                  style={{ width: `${(stats.applied / stats.total_jobs * 100) || 0}%` }} 
                />
              </div>
              <span>{((stats.applied / stats.total_jobs) * 100).toFixed(1)}%</span>
            </div>
            
            <div className="progress-bar-large">
              <span>Favorited Rate</span>
              <div className="bar">
                <div 
                  className="fill yellow" 
                  style={{ width: `${(stats.favorited / stats.total_jobs * 100) || 0}%` }} 
                />
              </div>
              <span>{((stats.favorited / stats.total_jobs) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="last-update">
        Last update: {stats?.last_update ? new Date(stats.last_update).toLocaleString() : 'Never'}
      </div>
    </div>
  );
}

export default Stats;