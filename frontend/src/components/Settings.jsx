import { useState, useEffect } from 'react';

function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">Failed to load profile</div>;

  return (
    <div className="settings">
      <h2>⚙️ Profile Settings</h2>
      
      <section className="setting-section">
        <h3>👤 Basic Info</h3>
        <div className="info-grid">
          <div><strong>Name:</strong> {profile.name}</div>
          <div><strong>Title:</strong> {profile.title}</div>
          <div><strong>Summary:</strong> {profile.summary}</div>
        </div>
      </section>

      <section className="setting-section">
        <h3>🎯 Target Positions</h3>
        <ul className="tag-list">
          {profile.targetTitles.map((title, i) => (
            <li key={i} className="tag">{title}</li>
          ))}
        </ul>
      </section>

      <section className="setting-section">
        <h3>📍 Location Preferences</h3>
        <div className="progress-bar">
          <span>Remote: {profile.locationPreference.remote}%</span>
          <div className="bar"><div style={{ width: `${profile.locationPreference.remote}%` }} /></div>
        </div>
        <div className="progress-bar">
          <span>Hybrid Spain: {profile.locationPreference.hybrid}%</span>
          <div className="bar"><div style={{ width: `${profile.locationPreference.hybrid}%` }} /></div>
        </div>
        <p><strong>Preferred cities:</strong> {profile.locationPreference.preferredCities.join(', ')}</p>
      </section>

      <section className="setting-section">
        <h3>💻 Technology Stack</h3>
        <div className="skills-grid">
          <div>
            <h4>Primary</h4>
            <ul className="tag-list">
              {profile.skills.primary.map((s, i) => (
                <li key={i} className="tag primary">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Secondary</h4>
            <ul className="tag-list">
              {profile.skills.secondary.map((s, i) => (
                <li key={i} className="tag secondary">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>DevOps</h4>
            <ul className="tag-list">
              {profile.skills.devops.map((s, i) => (
                <li key={i} className="tag devops">{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="setting-section">
        <h3>🏢 Company Stage Preference</h3>
        <div className="stage-preferences">
          {Object.entries(profile.companyStage).map(([stage, score]) => (
            <div key={stage} className="stage-item">
              <span>{stage}</span>
              <div className="score-bar">
                <div style={{ width: `${score}%` }} />
              </div>
              <span>{score}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="setting-section warning">
        <h3>⛔ Deal Breakers</h3>
        <ul>
          <li>❌ Equity-only positions (no salary)</li>
          <li>❌ Excluded technologies: {profile.dealBreakers.excludedTech.join(', ')}</li>
        </ul>
      </section>

      <p className="settings-note">
        To modify these settings, edit <code>backend/src/config/userProfile.js</code>
      </p>
    </div>
  );
}

export default Settings;