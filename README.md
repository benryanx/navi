# Navi ✦

> An AI buddy that lives on your screen, sees what you see, and guides your cursor to exactly where you need to go.

*Inspired by Clicky (macOS) — built from the ground up for Windows.*

## How it works

1. **Press** `Ctrl+F` and speak your question
   - *"How do I add a filter in DaVinci Resolve?"*
   - *"Where do I set keyframes in After Effects?"*
   - *"How do I center this element in Figma?"*

2. **Press again** — Navi captures your screen and asks Gemma 4 (running locally via Ollama)

3. **Navi flies** to the exact UI element, shows **"Here!"**, and explains what to do next — both in text and voice

4. **Click anywhere** or press `Esc` to dismiss

---

## Requirements

- Windows 10/11 (64-bit)
- [Ollama](https://ollama.com) with `gemma4` model pulled
- Microphone

---

## Quick Setup

```powershell
# 1. Install Ollama from https://ollama.com/download
# 2. Pull the vision model
ollama pull gemma4

# 3. Clone this repo and install deps
npm install

# 4. Start Navi
npm start
```

---

## Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+F` | Toggle listen / send |
| `Ctrl+N` | Open settings |
| `Esc` | Dismiss guidance |

---

## Settings

Press `Ctrl+N` to open the settings panel:
- **Voice**: Local (browser TTS) or ElevenLabs
- **ElevenLabs API Key** + **Voice ID** for premium voice

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Your Screen (any app)                       │
│                                              │
│   ┌──────────────────────────────────────┐  │
│   │  Electron Overlay (transparent win)  │  │
│   │                                      │  │
│   │  • Buddy ✦ (follows cursor)          │  │
│   │  • "Here!" callout                   │  │
│   │  • Step-by-step bubble               │  │
│   │  • Status bar                        │  │
│   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         ↕ desktopCapturer (screenshot)
         ↕ globalShortcut (Ctrl+F)
         ↕ @xenova/transformers Whisper (voice → text)
         ↕ SpeechSynthesis / ElevenLabs (text → voice)
         ↕ fetch → localhost:11434

┌──────────────────────────────┐
│  Ollama (local AI server)    │
│  Model: gemma4 (vision)      │
│  Input:  screenshot + query  │
│  Output: {x, y, label, steps}│
└──────────────────────────────┘
```

---

## Project Structure

```
navi/
├── src/
│   ├── main.js       # Electron main process
│   ├── preload.js    # Secure bridge (main ↔ renderer)
│   ├── overlay.html  # Full UI: buddy, bubble, voice, animation
│   └── setup.html    # First-run setup wizard
├── docs/
│   └── index.html    # GitHub Pages landing page
├── package.json
└── README.md
```

---

## Building a distributable `.exe`

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"; npm run build
# Output: dist/Navi Setup 1.0.0.exe
```

---

## Privacy

Everything runs **100% locally**. Your screen, voice, and questions never leave your machine. Ollama and Whisper run entirely on your GPU/CPU.

---

Made with ♥ for Windows
