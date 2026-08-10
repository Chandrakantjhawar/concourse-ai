import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { CrowdBriefing } from '../api/client';

interface Props {
  stadiumId: string;
}

// Pre-built "simulate a spike" payload for demo
const SPIKE_PAYLOAD = [
  { zone_id: 'metlife-zone-a', current_count: 8200, trend_last_10min: 'rising',
    nearby_incidents: [{ type: 'medical', severity: 'moderate', time: 'now' }] },
  { zone_id: 'metlife-zone-b', current_count: 8800, trend_last_10min: 'rising',
    nearby_incidents: [] },
  { zone_id: 'metlife-zone-c', current_count: 2100, trend_last_10min: 'falling',
    nearby_incidents: [] },
  { zone_id: 'metlife-zone-g', current_count: 11500, trend_last_10min: 'rising',
    nearby_incidents: [{ type: 'crowd_pressure', severity: 'critical', time: 'now' }] },
];

/**
 * Get CSS class based on zone status
 * @param {string} status - The zone status (critical, watch, normal)
 * @returns {string} CSS class name
 */
function getStatusClass(status: string): string {
  if (status === 'critical') return 'status-critical';
  if (status === 'watch') return 'status-watch';
  return 'status-normal';
}



/**
 * Get CSS color variable based on sustainability usage status
 * @param {string} status - Usage status
 * @returns {string} CSS color variable string
 */
function getStatusColor(status: string): string {
  if (status === 'critical') return 'var(--status-critical)';
  if (status === 'elevated') return 'var(--status-watch)';
  return 'var(--status-normal)';
}

/**
 * CrowdPulseDashboard Component
 * Renders the operations command center for stadium staff.
 * Allows simulating crowd telemetry spikes and generating AI-powered briefings.
 * 
 * @param {Props} props - The component props containing the active stadium ID.
 */
export function CrowdPulseDashboard({ stadiumId }: Props) {
  const [briefing, setBriefing] = useState<CrowdBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [spikeApplied, setSpikeApplied] = useState(false);

  const generateBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCrowdBriefing(stadiumId);
      setBriefing(data);
    } catch (err) {
      console.error('Briefing error:', err);
    } finally {
      setLoading(false);
    }
  }, [stadiumId]);

  const simulateSpike = async () => {
    try {
      await api.postTelemetry(stadiumId, SPIKE_PAYLOAD);
      setSpikeApplied(true);
      // Auto-generate briefing after spike
      await generateBriefing();
    } catch (err) {
      console.error('Spike error:', err);
    }
  };

  return (
    <section aria-label="Operations Command Center">
      <div className="section-header">
        <h2 className="section-title">📊 Operations Command Center</h2>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={simulateSpike}
            disabled={loading}
            id="simulate-spike-btn"
          >
            ⚡ Simulate a Spike
          </button>
          <button
            className="btn btn-primary"
            onClick={generateBriefing}
            disabled={loading}
            id="generate-briefing-btn"
          >
            {loading ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              '🤖 Generate AI Briefing'
            )}
          </button>
        </div>
      </div>

      {spikeApplied && (
        <div className="card" style={{
          marginBlockEnd: 'var(--space-md)',
          borderColor: 'var(--accent-amber)',
          background: 'var(--accent-amber-glow)',
        }}>
          <p style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            ⚡ Spike applied — zone telemetry updated with simulated crowd pressure scenario
          </p>
        </div>
      )}

      {/* AI Briefing Summary */}
      {briefing && (
        <>
          <article className="card" style={{
            marginBlockEnd: 'var(--space-lg)',
            borderColor: 'var(--accent-blue)',
            borderWidth: '2px',
          }}>
            <div className="card-header">
              <h3 className="card-title">AI Briefing</h3>
              <span className={`badge ${briefing._source !== 'fallback' ? 'badge-live' : 'badge-fallback'}`}>
                {briefing._source !== 'fallback' ? `✨ ${briefing._source.toUpperCase()}` : '⚡ Fallback'}
              </span>
            </div>
            <p style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              lineHeight: 1.4,
              marginBlockEnd: 'var(--space-md)',
            }}>
              {briefing.summary}
            </p>

            {/* Recommended Actions */}
            {briefing.recommended_actions.length > 0 && (
              <div>
                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockEnd: 'var(--space-sm)' }}>
                  Recommended Actions
                </h4>
                {briefing.recommended_actions.map((action, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-sm)',
                    marginBlockEnd: 'var(--space-sm)',
                    paddingInlineStart: 'var(--space-sm)',
                  }}>
                    <span className={`badge ${action.priority === 1 ? 'badge-critical' : action.priority === 2 ? 'badge-watch' : 'badge-normal'}`}>
                      P{action.priority}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{action.action}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        Zone: {action.target_zone} · {action.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          {/* Zone Heatmap */}
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBlockEnd: 'var(--space-md)' }}>
            Zone Status
          </h3>
          <div className="heatmap-grid" style={{ marginBlockEnd: 'var(--space-lg)' }}>
            {briefing.zones.map(zone => (
              <div key={zone.zone_id} className={`zone-card card ${getStatusClass(zone.status)}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="zone-name">{zone.zone_id}</span>
                  <span className={`badge badge-${zone.status === 'critical' ? 'critical' : zone.status === 'watch' ? 'watch' : 'normal'}`}>
                    {zone.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 'var(--space-xs)' }}>
                  {zone.one_line_reason}
                </p>
              </div>
            ))}
          </div>

          {/* Sustainability Dashboard */}
          {briefing.sustainability && (
            <>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBlockEnd: 'var(--space-md)' }}>
                🌱 Sustainability Metrics
              </h3>
              <div className="gauges-row">
                <div className="card gauge-card">
                  <div className="gauge-value" style={{ color: briefing.sustainability.waste_diversion_rate_pct >= 60 ? 'var(--status-normal)' : 'var(--status-watch)' }}>
                    {briefing.sustainability.waste_diversion_rate_pct}%
                  </div>
                  <div className="gauge-label">Waste Diversion Rate</div>
                </div>
                <div className="card gauge-card">
                  <div className="gauge-value" style={{ color: getStatusColor(briefing.sustainability.energy_usage_status) }}>
                    {briefing.sustainability.energy_usage_status === 'normal' ? '✓' : briefing.sustainability.energy_usage_status === 'elevated' ? '⚠' : '✗'}
                  </div>
                  <div className="gauge-label">Energy: {briefing.sustainability.energy_usage_status}</div>
                </div>
                <div className="card gauge-card">
                  <div className="gauge-value" style={{ color: getStatusColor(briefing.sustainability.water_usage_status) }}>
                    {briefing.sustainability.water_usage_status === 'normal' ? '✓' : briefing.sustainability.water_usage_status === 'elevated' ? '⚠' : '✗'}
                  </div>
                  <div className="gauge-label">Water: {briefing.sustainability.water_usage_status}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!briefing && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <p style={{ fontSize: 'var(--text-lg)', marginBlockEnd: 'var(--space-sm)' }}>📊</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Click "Generate AI Briefing" to analyze current zone telemetry,
            or "Simulate a Spike" for a dramatic demo scenario.
          </p>
        </div>
      )}
    </section>
  );
}
