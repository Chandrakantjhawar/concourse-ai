import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { OpsResponse } from '../api/client';

interface Props {
  stadiumId: string;
}

const ROLES = [
  'Gate Steward — Gate A',
  'Gate Steward — Gate C',
  'Concourse Lead — North',
  'Concourse Lead — South',
  'Transit Marshal — Shuttle Plaza',
  'Accessibility Coordinator',
  'Security Checkpoint Lead',
  'Fan Experience Host',
];

/**
 * VolunteerDigest Component
 * Provides operational staff with AI-generated shift digests and SOP-grounded Q&A.
 * 
 * @param {Props} props - The component props containing the active stadium ID.
 */
export function VolunteerDigest({ stadiumId }: Props) {
  const [role, setRole] = useState(ROLES[0]!);
  const [digest, setDigest] = useState<OpsResponse | null>(null);
  const [qaResponse, setQaResponse] = useState<OpsResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [loadingQa, setLoadingQa] = useState(false);

  const loadDigest = useCallback(async () => {
    setLoadingDigest(true);
    setDigest(null);
    try {
      const data = await api.getOpsDigest(stadiumId, role);
      setDigest(data);
    } catch (err) {
      console.error('Digest error:', err);
    } finally {
      setLoadingDigest(false);
    }
  }, [stadiumId, role]);

  const askQuestion = async () => {
    if (!question.trim() || loadingQa) return;
    setLoadingQa(true);
    setQaResponse(null);
    try {
      const data = await api.askOps(stadiumId, role, question);
      setQaResponse(data);
      setQuestion('');
    } catch (err) {
      console.error('Q&A error:', err);
    } finally {
      setLoadingQa(false);
    }
  };

  return (
    <section aria-label="Volunteer Operations Digest">
      <div className="section-header">
        <h2 className="section-title">🦺 Volunteer Ops Digest</h2>
      </div>

      {/* Role Picker */}
      <div className="card" style={{ marginBlockEnd: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: 1, minWidth: '240px' }}>
            <label htmlFor="role-select" className="input-label">Your Role</label>
            <select
              id="role-select"
              className="input select"
              value={role}
              onChange={(e) => { setRole(e.target.value); setDigest(null); }}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={loadDigest}
            disabled={loadingDigest}
            id="load-digest-btn"
          >
            {loadingDigest ? (
              <span className="loading-dots"><span /><span /><span /></span>
            ) : (
              '📋 Load Shift Digest'
            )}
          </button>
        </div>
      </div>

      {/* Shift Digest */}
      {digest && (
        <article className="card" style={{ marginBlockEnd: 'var(--space-lg)' }}>
          <div className="card-header">
            <h3 className="card-title">Shift Digest for {role}</h3>
            <span className={`badge ${digest._source !== 'fallback' ? 'badge-live' : 'badge-fallback'}`}>
              {digest._source !== 'fallback' ? `✨ ${digest._source.toUpperCase()}` : '⚡ Fallback'}
            </span>
          </div>

          {digest.escalate && (
            <div className="emergency-banner" role="alert" style={{ marginBlockEnd: 'var(--space-md)' }}>
              <span>⚠️ Escalation recommended — radio your zone supervisor</span>
            </div>
          )}

          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
            {digest.answer}
          </div>

          {digest.grounded_in_sop_ids.length > 0 && (
            <div style={{ marginBlockStart: 'var(--space-md)' }}>
              {digest.grounded_in_sop_ids.map(id => (
                <span key={id} className="sop-ground">
                  📄 Grounded in: {id}
                </span>
              ))}
            </div>
          )}
        </article>
      )}

      {/* Q&A Section */}
      <div className="card">
        <h3 className="card-title" style={{ marginBlockEnd: 'var(--space-md)' }}>
          💬 Ask a Question
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockEnd: 'var(--space-md)' }}>
          Ask any operational question — answers are grounded in SOP procedures only.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <label htmlFor="ops-question" className="sr-only">Your question</label>
          <input
            id="ops-question"
            className="input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            placeholder="e.g., 'What do I do if I find a lost child?'"
            disabled={loadingQa}
            aria-label="Operations question input"
          />
          <button
            className="btn btn-primary"
            onClick={askQuestion}
            disabled={loadingQa || !question.trim()}
            aria-label="Ask question"
          >
            Ask
          </button>
        </div>

        {qaResponse && (
          <div style={{ marginBlockStart: 'var(--space-md)' }}>
            {qaResponse.escalate && (
              <div className="emergency-banner" role="alert" style={{ marginBlockEnd: 'var(--space-sm)' }}>
                <span>⚠️ Escalation required — follow the SOP procedure below</span>
              </div>
            )}

            <div className="card" style={{ background: 'var(--bg-secondary)' }}>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
                {qaResponse.answer}
              </p>

              {qaResponse.grounded_in_sop_ids.length > 0 && (
                <div style={{ marginBlockStart: 'var(--space-sm)', display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  {qaResponse.grounded_in_sop_ids.map(id => (
                    <span key={id} className="sop-ground">📄 {id}</span>
                  ))}
                </div>
              )}

              <div style={{ marginBlockStart: 'var(--space-sm)' }}>
                <span className={`badge ${qaResponse._source !== 'fallback' ? 'badge-live' : 'badge-fallback'}`}>
                  {qaResponse._source !== 'fallback' ? `✨ AI (${qaResponse._source.toUpperCase()})` : '⚡ Fallback'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
