const { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, session } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { getLanguage, getTranscriberModel, getTranscriptionOptions, getTtsLang } = require('./language-options');

// ── Config ─────────────────────────────────────────────────────────────────
const OLLAMA_URL   = 'http://127.0.0.1:11434';
const VISION_MODEL = 'gemma4';

// ── Persistent settings ─────────────────────────────────────────────────────
function configPath() {
  return path.join(app.getPath('userData'), 'navi-config.json');
}
function defaultConfig() {
  return { tts: 'local', language: 'auto', elevenLabsKey: '', elevenLabsVoiceId: 'fS4RM86GDhM251CjumZM' };
}
function loadConfig() {
  try { return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(configPath(), 'utf8')) }; }
  catch { return defaultConfig(); }
}
function saveConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

ipcMain.handle('get-config', ()      => loadConfig());
ipcMain.handle('save-config', (_, c) => { saveConfig(c); return true; });

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────
let currentSpeechProcess = null;

function stopSystemSpeech() {
  if (!currentSpeechProcess || currentSpeechProcess.killed) return;
  currentSpeechProcess.kill();
  currentSpeechProcess = null;
}

ipcMain.handle('speak-system', async (_, { text, lang }) => {
  try {
    stopSystemSpeech();

    const script = `
Add-Type -AssemblyName System.Speech
$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($env:NAVI_TTS_TEXT_B64))
$lang = $env:NAVI_TTS_LANG
$prefix = ($lang -split '-')[0]
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | Where-Object { $_.Enabled }
$voice = $voices | Where-Object { $_.VoiceInfo.Culture.Name -eq $lang } | Select-Object -First 1
if (-not $voice) { $voice = $voices | Where-Object { $_.VoiceInfo.Culture.Name -like "$prefix-*" } | Select-Object -First 1 }
if (-not $voice -and $prefix -ne 'en') { $voice = $voices | Where-Object { $_.VoiceInfo.Culture.Name -like "en-*" } | Select-Object -First 1 }
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Rate = 0
$synth.Speak($text)
`;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        NAVI_TTS_TEXT_B64: Buffer.from(text, 'utf8').toString('base64'),
        NAVI_TTS_LANG: lang || 'en-US',
      },
    });

    currentSpeechProcess = child;
    child.once('exit', () => {
      if (currentSpeechProcess === child) currentSpeechProcess = null;
    });
    child.once('error', () => {
      if (currentSpeechProcess === child) currentSpeechProcess = null;
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('stop-system-speech', () => stopSystemSpeech());

ipcMain.handle('speak-elevenlabs', async (_, { text, apiKey, voiceId }) => {
  try {
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${await resp.text()}`);
    const buf = await resp.arrayBuffer();
    return { success: true, audio: Buffer.from(buf).toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Whisper pipeline (lazy-loaded on first transcription) ──────────────────
const _transcribers = new Map();

async function getTranscriber(win, language = loadConfig().language) {
  const model = getTranscriberModel(language || 'auto');
  if (_transcribers.has(model)) return _transcribers.get(model);

  win.webContents.send('transcriber-status', 'loading');
  const { pipeline, env } = await import('@xenova/transformers');
  env.backends.onnx.wasm.numThreads = 1;
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    model
  );
  _transcribers.set(model, transcriber);
  win.webContents.send('transcriber-status', 'ready');
  return transcriber;
}

// ── Windows ────────────────────────────────────────────────────────────────
let overlayWin = null;
let setupWin   = null;
const isDev = process.argv.includes('--dev');

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWin = new BrowserWindow({
    width, height, x: 0, y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlayWin.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWin.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-interactive', (_, val) => {
    overlayWin.setIgnoreMouseEvents(!val, { forward: true });
    if (val) {
      overlayWin.setFocusable(true);
      overlayWin.focus();
    } else {
      overlayWin.setFocusable(false);
    }
  });

  if (isDev) overlayWin.webContents.openDevTools({ mode: 'detach' });

  // Pre-warm the Whisper model in the background after window loads
  overlayWin.webContents.once('did-finish-load', () => {
    getTranscriber(overlayWin, loadConfig().language).catch(err =>
      console.error('Whisper preload failed:', err)
    );
  });
}

// ── Global hotkeys ──────────────────────────────────────────────────────────
function registerHotkeys() {
  globalShortcut.register('CommandOrControl+F', () => {
    overlayWin.webContents.send('hotkey-toggle');
  });
  globalShortcut.register('Escape', () => {
    overlayWin.webContents.send('hotkey-dismiss');
  });
  globalShortcut.register('CommandOrControl+N', () => {
    overlayWin.webContents.send('hotkey-settings');
  });
}

// ── Screen capture ──────────────────────────────────────────────────────────
const SNAP_W = 1280;
const SNAP_H = 720;

ipcMain.handle('capture-screen', async () => {
  try {
    // Hide overlay so it doesn't appear in the screenshot
    overlayWin.hide();
    await new Promise(r => setTimeout(r, 120));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: SNAP_W, height: SNAP_H },
    });

    overlayWin.show();

    if (!sources.length) throw new Error('No screen sources found');
    const b64 = sources[0].thumbnail.toJPEG(90).toString('base64');
    return { success: true, base64: b64, snapW: SNAP_W, snapH: SNAP_H };
  } catch (err) {
    overlayWin.show();
    return { success: false, error: err.message };
  }
});

// Decode 16-bit PCM WAV buffer → Float32Array (no AudioContext needed)
function decodeWAV(buf) {
  const view       = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const sampleRate = view.getUint32(24, true);
  const numSamples = (buf.byteLength - 44) / 2;
  const float32    = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    float32[i] = view.getInt16(44 + i * 2, true) / 32768;
  }
  return { float32, sampleRate };
}

// ── Whisper transcription ───────────────────────────────────────────────────
ipcMain.handle('transcribe-audio', async (_, { audioBase64 }) => {
  try {
    const wavBuf = Buffer.from(audioBase64, 'base64');
    const { float32, sampleRate } = decodeWAV(wavBuf);
    const language = loadConfig().language || 'auto';

    const transcriber = await getTranscriber(overlayWin, language);
    const result = await transcriber(float32, getTranscriptionOptions(language, sampleRate));
    const text = (result.text || '').trim();

    // Filter Whisper hallucination tokens (noise, silence, music, etc.)
    const isHallucination = /^\[.*\]$|^\(.*\)$|^(?:\s*)$/.test(text);
    if (isHallucination) return { success: false, error: 'no speech detected — try speaking closer to the mic' };

    return { success: true, text };
  } catch (err) {
    console.error('Transcription error:', err);
    return { success: false, error: err.message };
  }
});

// ── Vision routing ───────────────────────────────────────────────────────────
ipcMain.handle('ask-gemma', async (_, { question, screenshotB64, snapW, snapH }) => {
  const config   = loadConfig();
  const provider = config.visionProvider || 'ollama';
  const prompt   = buildPrompt(question, snapW || SNAP_W, snapH || SNAP_H, responseLanguageName(config.language, question));
  try {
    let text;
    if      (provider === 'gemini')    text = await askGemini(prompt, screenshotB64, config.geminiKey);
    else if (provider === 'openai')    text = await askOpenAI(prompt, screenshotB64, config.openaiKey);
    else if (provider === 'anthropic') text = await askAnthropic(prompt, screenshotB64, config.anthropicKey);
    else                               text = await askOllama(prompt, screenshotB64);

    if (!text) throw new Error('Model returned an empty response. Check your API key or model setup.');
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (!match) return { success: true, raw: text, parsed: null };
    return { success: true, raw: text, parsed: JSON.parse(match[1]) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

async function askOllama(prompt, base64) {
  const model = loadConfig().ollamaModel || VISION_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, images: [base64], stream: false, options: { temperature: 0.2 } }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const text = data.response || '';
  if (!text) throw new Error(`Empty response from Ollama. Is "${model}" pulled? Run: ollama pull ${model}`);
  return text;
}

async function askGemini(prompt, base64, apiKey) {
  if (!apiKey) throw new Error('Gemini API key not set — open Settings (Ctrl+N).');
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function askOpenAI(prompt, base64, apiKey) {
  if (!apiKey) throw new Error('OpenAI API key not set — open Settings (Ctrl+N).');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ]}],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

async function askAnthropic(prompt, base64, apiKey) {
  if (!apiKey) throw new Error('Anthropic API key not set — open Settings (Ctrl+N).');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: prompt },
      ]}],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

function responseLanguageName(setting, question) {
  if (setting && setting !== 'auto') return getLanguage(setting).label;

  const inferred = getTtsLang('auto', question, 'en-US').split('-')[0];
  return getLanguage(inferred).label;
}

function buildPrompt(question, snapW, snapH, responseLanguage) {
  return `You are Navi, an AI screen assistant. The screenshot is exactly ${snapW}x${snapH} pixels. The user asked: "${question}"

Look at the screenshot carefully. Find the EXACT UI element that best answers the question and respond ONLY with this JSON:
\`\`\`json
{
  "targetX": 245,
  "targetY": 38,
  "label": "Send button",
  "explanation": "Click the blue Send button in the top-left corner of the compose window.",
  "steps": [
    "Click the Send button"
  ]
}
\`\`\`
Rules:
- targetX/targetY are PIXEL coordinates (integers) within the ${snapW}x${snapH} image — point to the CENTER of the element
- label, explanation, and steps must be written in ${responseLanguage || 'the same language as the user question'}
- label is a short name for the element (max 5 words)
- explanation is 1-2 sentences
- steps are 1-4 sequential actions needed
- Respond ONLY with the JSON block, nothing else`;
}

// ── Ollama status ───────────────────────────────────────────────────────────
ipcMain.handle('check-ollama', async () => {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return { running: false };
    const data    = await resp.json();
    const models  = (data.models || []).map(m => m.name);
    const hasGemma = models.some(m => m.startsWith('gemma4') || m.startsWith('gemma3'));
    return { running: true, hasGemma, models };
  } catch {
    return { running: false };
  }
});

// ── App lifecycle ───────────────────────────────────────────────────────────
function createSetupWindow() {
  setupWin = new BrowserWindow({
    width: 560, height: 580,
    resizable: false,
    center: true,
    frame: false,
    backgroundColor: '#111111',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  setupWin.loadFile(path.join(__dirname, 'setup.html'));
  setupWin.on('closed', () => { setupWin = null; });
}

ipcMain.on('setup-complete', () => {
  if (setupWin) { setupWin.close(); setupWin = null; }
  createOverlay();
  registerHotkeys();
});

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_, permission, cb) => {
    cb(permission === 'microphone' || permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_, permission) => {
    return permission === 'microphone' || permission === 'media';
  });

  // Show setup screen if Ollama or model isn't ready; otherwise go straight to overlay
  const status = await checkOllamaStatus();
  if (!status.running || !status.hasGemma) {
    createSetupWindow();
  } else {
    createOverlay();
    registerHotkeys();
  }
});

async function checkOllamaStatus() {
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return { running: false };
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name);
    const hasGemma = models.some(m => m.startsWith('gemma4') || m.startsWith('gemma3'));
    return { running: true, hasGemma, models };
  } catch { return { running: false }; }
}

ipcMain.on('quit-app', () => app.quit());

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
