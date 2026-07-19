// ──────────────────────────────────────────────────────────
// Concourse AI — Fan Concierge Fallback
// Deterministic, honest response when Gemini is unavailable
// ──────────────────────────────────────────────────────────

import type { ConciergeResponse, SupportedLanguage } from '../types/index.js';

const FALLBACK_MESSAGES: Record<SupportedLanguage, string> = {
  en: 'AI assistant is temporarily unavailable. Nearest info point is at the main concourse. Please ask any steward for help.',
  es: 'El asistente de IA no está disponible temporalmente. El punto de información más cercano está en el vestíbulo principal. Por favor, consulte a cualquier asistente.',
  fr: "L'assistant IA est temporairement indisponible. Le point d'information le plus proche se trouve dans le hall principal. Veuillez demander à un steward.",
  pt: 'O assistente de IA está temporariamente indisponível. O ponto de informação mais próximo está no saguão principal. Consulte qualquer comissário.',
  ar: 'مساعد الذكاء الاصطناعي غير متاح مؤقتًا. أقرب نقطة معلومات في الرواق الرئيسي. يرجى سؤال أي مضيف للمساعدة.',
};

export function conciergeFallback(languageHint?: string): ConciergeResponse {
  const lang = (languageHint ?? 'en') as SupportedLanguage;
  const message = FALLBACK_MESSAGES[lang] ?? FALLBACK_MESSAGES.en;

  return {
    reply_text: message,
    detected_language: lang,
    emergency: false,
    escalation_reason: null,
    text_direction: lang === 'ar' ? 'rtl' : 'ltr',
  };
}
