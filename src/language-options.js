(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.NaviLanguageOptions = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ENGLISH_MODEL = 'Xenova/whisper-base.en';
  const MULTILINGUAL_MODEL = 'Xenova/whisper-base';

  const LANGUAGES = [
    { value: 'auto', label: 'Auto', ttsLang: '', whisperLanguage: null, model: MULTILINGUAL_MODEL },
    { value: 'en', label: 'English', ttsLang: 'en-US', whisperLanguage: 'english', model: ENGLISH_MODEL },
    { value: 'es', label: 'Spanish', ttsLang: 'es-ES', whisperLanguage: 'spanish', model: MULTILINGUAL_MODEL },
    { value: 'fr', label: 'French', ttsLang: 'fr-FR', whisperLanguage: 'french', model: MULTILINGUAL_MODEL },
    { value: 'de', label: 'German', ttsLang: 'de-DE', whisperLanguage: 'german', model: MULTILINGUAL_MODEL },
    { value: 'it', label: 'Italian', ttsLang: 'it-IT', whisperLanguage: 'italian', model: MULTILINGUAL_MODEL },
    { value: 'pt', label: 'Portuguese', ttsLang: 'pt-BR', whisperLanguage: 'portuguese', model: MULTILINGUAL_MODEL },
    { value: 'nl', label: 'Dutch', ttsLang: 'nl-NL', whisperLanguage: 'dutch', model: MULTILINGUAL_MODEL },
    { value: 'pl', label: 'Polish', ttsLang: 'pl-PL', whisperLanguage: 'polish', model: MULTILINGUAL_MODEL },
    { value: 'tr', label: 'Turkish', ttsLang: 'tr-TR', whisperLanguage: 'turkish', model: MULTILINGUAL_MODEL },
    { value: 'ru', label: 'Russian', ttsLang: 'ru-RU', whisperLanguage: 'russian', model: MULTILINGUAL_MODEL },
    { value: 'uk', label: 'Ukrainian', ttsLang: 'uk-UA', whisperLanguage: 'ukrainian', model: MULTILINGUAL_MODEL },
    { value: 'ar', label: 'Arabic', ttsLang: 'ar-SA', whisperLanguage: 'arabic', model: MULTILINGUAL_MODEL },
    { value: 'hi', label: 'Hindi', ttsLang: 'hi-IN', whisperLanguage: 'hindi', model: MULTILINGUAL_MODEL },
    { value: 'zh', label: 'Chinese', ttsLang: 'zh-CN', whisperLanguage: 'chinese', model: MULTILINGUAL_MODEL },
    { value: 'ja', label: 'Japanese', ttsLang: 'ja-JP', whisperLanguage: 'japanese', model: MULTILINGUAL_MODEL },
    { value: 'ko', label: 'Korean', ttsLang: 'ko-KR', whisperLanguage: 'korean', model: MULTILINGUAL_MODEL },
  ];

  function getLanguage(value) {
    return LANGUAGES.find(language => language.value === value) || LANGUAGES[0];
  }

  function getTranscriberModel(value) {
    return getLanguage(value).model;
  }

  function getTranscriptionOptions(value, sampleRate) {
    const language = getLanguage(value);
    const options = { sampling_rate: sampleRate };

    if (language.value !== 'auto' && language.whisperLanguage) {
      options.language = language.whisperLanguage;
      options.task = 'transcribe';
    }

    return options;
  }

  function inferTtsLang(text) {
    const value = text || '';

    if (/[¿¡ñáéíóúü]/i.test(value) || /\b(el|la|los|las|que|como|donde|para|por|con|una|este|esta)\b/i.test(value)) return 'es-ES';
    if (/[àâçéèêëîïôûùüÿœ]/i.test(value) || /\b(le|la|les|des|pour|avec|bonjour)\b/i.test(value)) return 'fr-FR';
    if (/[äöüß]/i.test(value) || /\b(der|die|das|und|mit|nicht)\b/i.test(value)) return 'de-DE';
    if (/[ãõ]/i.test(value) || /\b(voc[eê]|para|com|uma|como)\b/i.test(value)) return 'pt-BR';
    if (/[а-яё]/i.test(value)) return 'ru-RU';
    if (/[\u0600-\u06FF]/.test(value)) return 'ar-SA';
    if (/[\u0900-\u097F]/.test(value)) return 'hi-IN';
    if (/[\u3040-\u30FF]/.test(value)) return 'ja-JP';
    if (/[\uAC00-\uD7AF]/.test(value)) return 'ko-KR';
    if (/[\u4E00-\u9FFF]/.test(value)) return 'zh-CN';

    return 'en-US';
  }

  function getTtsLang(value, text, fallbackLang) {
    const language = getLanguage(value);
    if (language.value === 'auto') return inferTtsLang(text);
    return language.ttsLang || fallbackLang || 'en-US';
  }

  function pickVoice(voices, targetLang) {
    if (!Array.isArray(voices) || !voices.length) return null;

    const normalizedLang = (targetLang || '').toLowerCase();
    const languagePrefix = normalizedLang.split('-')[0];
    return (
      voices.find(voice => (voice.lang || '').toLowerCase() === normalizedLang) ||
      voices.find(voice => (voice.lang || '').toLowerCase().startsWith(languagePrefix + '-')) ||
      voices.find(voice => /natural|google/i.test(voice.name || '') && (voice.lang || '').toLowerCase().startsWith(languagePrefix + '-')) ||
      voices.find(voice => /natural|google|zira/i.test(voice.name || '')) ||
      voices[0]
    );
  }

  return {
    ENGLISH_MODEL,
    MULTILINGUAL_MODEL,
    LANGUAGES,
    getLanguage,
    getTranscriberModel,
    getTranscriptionOptions,
    getTtsLang,
    inferTtsLang,
    pickVoice,
  };
});
