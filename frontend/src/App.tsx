import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './api/client';
import type { Stadium, HealthResponse } from './api/client';
import { FanConcierge } from './components/FanConcierge';
import { CrowdPulseDashboard } from './components/CrowdPulseDashboard';
import { VolunteerDigest } from './components/VolunteerDigest';
import { TransitAdvisor } from './components/TransitAdvisor';

type Tab = 'fan' | 'ops' | 'volunteer' | 'transit';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'fan', label: 'Fan Concierge', icon: '🎫' },
  { id: 'ops', label: 'Ops Center', icon: '📊' },
  { id: 'volunteer', label: 'Volunteer', icon: '🦺' },
  { id: 'transit', label: 'Transit', icon: '🚌' },
];

function App() {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('fan');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stadiums on mount
  useEffect(() => {
    api.getStadiums()
      .then((data) => {
        setStadiums(data);
        if (data.length > 0 && data[0]) {
          setSelectedStadium(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Health check polling
  const checkHealth = useCallback(() => {
    api.getHealth().then(setHealth).catch(() => {
      setHealth({ status: 'degraded', gemini_reachable: false, timestamp: new Date().toISOString(), model: 'unknown' });
    });
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const currentStadium = stadiums.find(s => s.id === selectedStadium);

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Skip Navigation Link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="app-header" role="banner">
        <div className="header-inner">
          <div className="app-logo">
            <div>
              <div className="app-logo-text">⚽ Concourse AI</div>
              <div className="app-logo-sub">FIFA World Cup 2026 Co-Pilot</div>
            </div>
          </div>

          {/* Stadium Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ minWidth: '260px' }}>
              <label htmlFor="stadium-select" className="sr-only">Select Stadium</label>
              <select
                id="stadium-select"
                className="input select"
                value={selectedStadium}
                onChange={(e) => setSelectedStadium(e.target.value)}
                aria-label="Select a stadium"
              >
                {stadiums.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* AI Status Badge */}
            {health && (
              <div
                className={`badge ${health.gemini_reachable ? 'badge-live' : 'badge-fallback'}`}
                role="status"
                aria-live="polite"
              >
                <span style={{ fontSize: '8px' }}>●</span>
                AI: {health.gemini_reachable ? 'Live' : 'Fallback'}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Module navigation">
            <ul className="nav-tabs" role="tablist">
              {TABS.map(tab => (
                <li key={tab.id} role="presentation">
                  <button
                    role="tab"
                    className="nav-tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    id={`tab-${tab.id}`}
                    aria-controls={`panel-${tab.id}`}
                  >
                    <span aria-hidden="true">{tab.icon}</span>
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main">
        <h1 className="sr-only">
          Concourse AI — {TABS.find(t => t.id === activeTab)?.label}
        </h1>

        {currentStadium && (
          <div style={{ marginBlockEnd: 'var(--space-md)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              📍 {currentStadium.name} · {currentStadium.city} · {currentStadium.match_context}
            </p>
          </div>
        )}

        {/* Tab Panels */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'fan' && selectedStadium && (
            <FanConcierge stadiumId={selectedStadium} />
          )}
          {activeTab === 'ops' && selectedStadium && (
            <CrowdPulseDashboard stadiumId={selectedStadium} />
          )}
          {activeTab === 'volunteer' && selectedStadium && (
            <VolunteerDigest stadiumId={selectedStadium} />
          )}
          {activeTab === 'transit' && selectedStadium && (
            <TransitAdvisor stadiumId={selectedStadium} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: 'var(--space-md)',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)',
        borderBlockStart: '1px solid var(--border-subtle)',
      }}>
        <p>Concourse AI — Built for Google PromptWars with Gemini 3.5 Flash</p>
        <p style={{ marginBlockStart: 'var(--space-xs)' }}>
          All SOP data is fictional/illustrative. Not affiliated with FIFA.
        </p>
      </footer>
    </div>
  );
}

export default App;
