import { useState } from 'react';
import { api } from '../api/client';
import type { TransitResponse } from '../api/client';

interface Props {
  stadiumId: string;
}

const ORIGIN_AREAS: Record<string, string[]> = {
  metlife: ['Manhattan', 'Hoboken', 'Newark', 'Jersey City', 'Secaucus', 'Brooklyn'],
  azteca: ['Centro Histórico', 'Reforma', 'Polanco', 'Coyoacán', 'Santa Fe', 'Xochimilco'],
  att: ['Dallas CBD', 'Fort Worth', 'Irving', 'Grand Prairie', 'Frisco', 'Plano'],
};

/**
 * TransitAdvisor Component
 * Recommends the best transit option for fans based on their origin area.
 * Evaluates shuttle lines, parking, and sustainability metrics.
 * 
 * @param {Props} props - The component props containing the active stadium ID.
 */
export function TransitAdvisor({ stadiumId }: Props) {
  const [originArea, setOriginArea] = useState('');
  const [recommendation, setRecommendation] = useState<TransitResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const areas = ORIGIN_AREAS[stadiumId] ?? ['Downtown', 'Airport', 'Suburbs'];

  const getRecommendation = async () => {
    if (!originArea || loading) return;
    setLoading(true);
    try {
      const data = await api.getTransitRecommendation(stadiumId, originArea);
      setRecommendation(data);
    } catch (err) {
      console.error('Transit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Transit and Sustainability Advisor">
      <div className="section-header">
        <h2 className="section-title">🚌 Transit & Sustainability</h2>
      </div>

      {/* Origin Picker */}
      <div className="card" style={{ marginBlockEnd: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
            <label htmlFor="origin-select" className="input-label">Where are you coming from?</label>
            <select
              id="origin-select"
              className="input select"
              value={originArea}
              onChange={(e) => { setOriginArea(e.target.value); setRecommendation(null); }}
            >
              <option value="">Select your area...</option>
              {areas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={getRecommendation}
            disabled={loading || !originArea}
            id="get-transit-btn"
          >
            {loading ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              '🗺️ Get Recommendation'
            )}
          </button>
        </div>
      </div>

      {/* Recommendation Card */}
      {recommendation && (
        <article>
          <div className="card transit-card" style={{ marginBlockEnd: 'var(--space-md)' }}>
            <div className="card-header">
              <h3 className="card-title">Best Option</h3>
              <span className={`badge ${recommendation._source === 'gemini' ? 'badge-live' : 'badge-fallback'}`}>
                {recommendation._source === 'gemini' ? '✨ AI' : '⚡ Fallback'}
              </span>
            </div>
            <p style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--accent-green)',
              marginBlockEnd: 'var(--space-sm)',
            }}>
              {recommendation.recommended_option}
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {recommendation.reason}
            </p>
          </div>

          {/* Alternative Options */}
          {recommendation.alt_options.length > 0 && (
            <div className="card" style={{ marginBlockEnd: 'var(--space-md)' }}>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBlockEnd: 'var(--space-sm)' }}>
                Alternative Options
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {recommendation.alt_options.map((opt, i) => (
                  <li key={i} style={{
                    padding: 'var(--space-xs) 0',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                    borderBlockEnd: i < recommendation.alt_options.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    • {opt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Green Recap */}
          <div className="green-recap" role="complementary" aria-label="Sustainability note">
            <span aria-hidden="true">🌱</span>
            <p>{recommendation.sustainability_note}</p>
          </div>
        </article>
      )}

      {!recommendation && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <p style={{ fontSize: 'var(--text-lg)', marginBlockEnd: 'var(--space-sm)' }}>🚌</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Select your origin area to get a personalized transit recommendation
            with sustainability insights.
          </p>
        </div>
      )}
    </section>
  );
}
