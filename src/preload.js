const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navi', {
  captureScreen:    ()              => ipcRenderer.invoke('capture-screen'),
  askGemma:         (q, img, w, h)  => ipcRenderer.invoke('ask-gemma', { question: q, screenshotB64: img, snapW: w, snapH: h }),
  transcribeAudio:  (b64)           => ipcRenderer.invoke('transcribe-audio', { audioBase64: b64 }),
  checkOllama:      ()              => ipcRenderer.invoke('check-ollama'),
  setInteractive:   (val)           => ipcRenderer.send('set-interactive', val),
  quitApp:          ()              => ipcRenderer.send('quit-app'),
  getConfig:        ()              => ipcRenderer.invoke('get-config'),
  saveConfig:       (cfg)           => ipcRenderer.invoke('save-config', cfg),
  speakSystem:      (text, lang)    => ipcRenderer.invoke('speak-system', { text, lang }),
  speakElevenLabs:  (text, key, id) => ipcRenderer.invoke('speak-elevenlabs', { text, apiKey: key, voiceId: id }),
  stopSystemSpeech: ()              => ipcRenderer.send('stop-system-speech'),

  onHotkeyToggle:   (cb) => ipcRenderer.on('hotkey-toggle',        () => cb()),
  onHotkeyDismiss:  (cb) => ipcRenderer.on('hotkey-dismiss',       () => cb()),
  onHotkeySettings: (cb) => ipcRenderer.on('hotkey-settings',      () => cb()),
  onTranscriberStatus: (cb) => ipcRenderer.on('transcriber-status', (_, s) => cb(s)),
});
