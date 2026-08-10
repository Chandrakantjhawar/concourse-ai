import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import type { ConciergeResponse, AISource } from '../api/client';

interface Props {
  stadiumId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  language?: string;
  direction?: 'ltr' | 'rtl';
  emergency?: boolean;
  escalation_reason?: string | null;
  source?: AISource;
}

const ACCESSIBILITY_MODES = [
  { value: 'none', label: 'None', icon: '👤' },
  { value: 'wheelchair', label: 'Wheelchair', icon: '♿' },
  { value: 'low_vision', label: 'Low Vision', icon: '👁️' },
  { value: 'deaf_hard_of_hearing', label: 'Deaf / HoH', icon: '🦻' },
  { value: 'cognitive_support', label: 'Cognitive', icon: '🧩' },
];

const LANGUAGE_PRESETS = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
];

/**
 * FanConcierge Component
 * Provides a multilingual chat interface for fans to ask venue-specific questions.
 * Connects to the `/api/concierge/chat` endpoint to retrieve RAG-augmented answers.
 * 
 * @param {Props} props - The component props containing the active stadium ID.
 */
export function FanConcierge({ stadiumId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [accessMode, setAccessMode] = useState('none');
  const [langHint, setLangHint] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  // RTL switching based on last AI response
  useEffect(() => {
    const lastAi = [...messages].reverse().find(m => m.role === 'ai');
    if (lastAi?.direction) {
      document.documentElement.setAttribute('dir', lastAi.direction);
      document.documentElement.setAttribute('lang', lastAi.language ?? 'en');
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response: ConciergeResponse = await api.chatConcierge(
        stadiumId, text, accessMode, langHint,
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: response.reply_text,
        language: response.detected_language,
        direction: response.text_direction,
        emergency: response.emergency,
        escalation_reason: response.escalation_reason,
        source: response._source,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[FanConcierge] Chat error:', err);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: 'Something went wrong. Please try again or ask a steward for help.',
        source: 'fallback',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const latestEmergency = [...messages].reverse().find(m => m.emergency);

  return (
    <section aria-label="Fan Concierge Chat">
      <div className="section-header">
        <h2 className="section-title">🎫 Fan Concierge</h2>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          {LANGUAGE_PRESETS.map(l => (
            <button
              key={l.code}
              className={`btn btn-sm ${langHint === l.code ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLangHint(langHint === l.code ? undefined : l.code)}
              title={`Set language hint: ${l.name}`}
              aria-pressed={langHint === l.code}
              data-testid={`lang-${l.code}`}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Accessibility Mode Toggle */}
      <div className="card" style={{ marginBlockEnd: 'var(--space-md)' }}>
        <p className="input-label" style={{ marginBlockEnd: 'var(--space-sm)' }}>
          Accessibility Mode
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {ACCESSIBILITY_MODES.map(mode => (
            <button
              key={mode.value}
              className={`btn btn-sm ${accessMode === mode.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setAccessMode(mode.value)}
              aria-pressed={accessMode === mode.value}
              id={`access-mode-${mode.value}`}
            >
              <span aria-hidden="true">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Banner */}
      {latestEmergency && (
        <div className="emergency-banner" role="alert" aria-live="assertive">
          <span aria-hidden="true">🚨</span>
          <span>EMERGENCY ESCALATED — {latestEmergency.escalation_reason ?? 'Alert sent to nearest steward'}</span>
        </div>
      )}

      {/* Chat Feed */}
      <div className="card" style={{ padding: 0, marginBlockEnd: 'var(--space-md)' }}>
        <div
          ref={feedRef}
          className="chat-feed"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 'var(--text-lg)', marginBlockEnd: 'var(--space-sm)' }}>👋</p>
              <p>Ask anything about the stadium — wayfinding, accessibility, services.</p>
              <p style={{ fontSize: 'var(--text-sm)', marginBlockStart: 'var(--space-xs)' }}>
                Try asking in Spanish, French, Portuguese, or Arabic!
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}
              dir={msg.role === 'ai' ? msg.direction : undefined}
            >
              <p>{msg.text}</p>
              {msg.role === 'ai' && (
                <div className="chat-lang-badge">
                  {msg.language && <span>🌐 {msg.language}</span>}
                  {msg.source && <span> · {msg.source !== 'fallback' ? `✨ AI (${msg.source.toUpperCase()})` : '⚡ Fallback'}</span>}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble chat-bubble-ai">
              <div className="loading-dots"><span /><span /><span /></div>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <label htmlFor="chat-input" className="sr-only">Type your message</label>
        <input
          ref={inputRef}
          id="chat-input"
          className="input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the stadium... (e.g., '¿Dónde está la entrada accesible?')"
          disabled={loading}
          autoComplete="off"
          aria-label="Chat message input"
        />
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </section>
  );
}
