const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ENGLISH_MODEL,
  MULTILINGUAL_MODEL,
  getTranscriberModel,
  getTranscriptionOptions,
  getTtsLang,
  pickVoice,
} = require('../src/language-options');

test('uses multilingual Whisper for auto language mode', () => {
  assert.equal(getTranscriberModel('auto'), MULTILINGUAL_MODEL);
  assert.deepEqual(getTranscriptionOptions('auto', 16000), { sampling_rate: 16000 });
});

test('keeps English on the English-only Whisper model', () => {
  assert.equal(getTranscriberModel('en'), ENGLISH_MODEL);
  assert.deepEqual(getTranscriptionOptions('en', 16000), {
    sampling_rate: 16000,
    language: 'english',
    task: 'transcribe',
  });
});

test('forces non-English languages through multilingual Whisper', () => {
  assert.equal(getTranscriberModel('es'), MULTILINGUAL_MODEL);
  assert.deepEqual(getTranscriptionOptions('es', 16000), {
    sampling_rate: 16000,
    language: 'spanish',
    task: 'transcribe',
  });
});

test('infers a Spanish TTS language from Spanish text in auto mode', () => {
  assert.equal(getTtsLang('auto', 'Como abro la configuracion?', 'en-US'), 'es-ES');
});

test('defaults auto TTS to English when text has no non-English signals', () => {
  assert.equal(getTtsLang('auto', 'Click the blue Send button.', 'es-AR'), 'en-US');
});

test('prefers voices matching the requested language', () => {
  const voices = [
    { name: 'Microsoft Zira', lang: 'en-US' },
    { name: 'Microsoft Helena', lang: 'es-ES' },
  ];

  assert.equal(pickVoice(voices, 'es-ES'), voices[1]);
});
