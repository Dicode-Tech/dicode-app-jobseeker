import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import Settings from './components/Settings';
import Stats from './components/Stats';
import './App.css';
import './pagination.css';

function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async () => {
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Scraping completed!\nFound: ${data.jobs_found} jobs\nAdded: ${data.added}\nUpdated: ${data.updated}`);
      } else if (data.error) {
        alert('❌ Error: ' + data.error);
      } else {
        alert('⚠️ Unexpected response from server');
      }
      fetchStats();
    } catch (err) {
      alert('❌ Scraping failed: ' + err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Job Seeker</h1>
        <nav>
          <Link to="/">Jobs</Link>
          <Link to="/stats">Stats</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <button onClick={triggerScrape} className="btn-primary">
          🔄 Refresh Jobs
        </button>
      </header>

      {!loading && stats && (
        <div className="stats-bar">
          <span>📋 {stats.total_jobs} jobs</span>
          <span>⭐ {stats.high_matches} high matches</span>
          <span>❤️ {stats.favorited} favorited</span>
          <span>✅ {stats.applied} applied</span>
        </div>
      )}

      <main className="main">
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;