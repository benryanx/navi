# Clicky for Windows 🪟✦

> An AI buddy that lives on your screen, sees what you see, and guides your cursor to exactly where you need to go.

## How it works

1. **Hold** `Ctrl+Shift+Space` and speak your question
   - *"How do I add a filter in DaVinci Resolve?"*
   - *"Where do I set keyframes in After Effects?"*
   - *"How do I center this element in Figma?"*

2. **Release** — Clicky captures your screen and asks Gemma 4 (running locally via Ollama)

3. **Clicky flies** to the exact UI element, shows **"Here!"**, and explains what to do next — both in text and voice

4. **Click anywhere** or press `Esc` to dismiss

---

## Requirements

- Windows 10/11 (64-bit)
- Node.js v18+ → [nodejs.org](https://nodejs.org)
- Ollama → [ollama.com](https://ollama.com) *(installed automatically by setup)*
- ~4GB free disk space for the Gemma model
- Microphone

---

## Quick Setup

```powershell
# 1. Clone or download this folder, then:
cd clicky-win

# 2. Run the setup script (installs Ollama + Gemma automatically)
powershell -ExecutionPolicy Bypass -File setup.ps1

# 3. Start Clicky
npm start
```

### Manual setup (if you prefer)

```powershell
# Install Ollama from https://ollama.com/download
# Then:
ollama serve            # start the local AI server
ollama pull gemma3:4b   # download the vision model (~3GB)

npm install             # install Electron + deps
npm start               # launch Clicky
```

---

## Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+Space` (hold) | Start speaking |
| Release | Send + analyze screen |
| `Esc` | Dismiss |
| Click anywhere | Dismiss guidance |

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
         ↕ globalShortcut (hotkey)
         ↕ Web Speech API (voice → text)
         ↕ SpeechSynthesis (text → voice)
         ↕ fetch → localhost:11434

┌──────────────────────────────┐
│  Ollama (local AI server)    │
│  Model: gemma3:4b (vision)   │
│  Input:  screenshot + query  │
│  Output: {x, y, label, steps}│
└──────────────────────────────┘
```

---

## Project Structure

```
clicky-win/
├── src/
│   ├── main.js       # Electron main process
│   │                 # - transparent overlay window
│   │                 # - global hotkeys
│   │                 # - screen capture
│   │                 # - Ollama/Gemma API calls
│   ├── preload.js    # Secure bridge (main ↔ renderer)
│   └── overlay.html  # Full UI: buddy, bubble, voice, animation
├── assets/
│   └── icon.ico      # App icon (add your own)
├── setup.ps1         # One-click Windows setup script
├── package.json
└── README.md
```

---

## Building a distributable `.exe`

```powershell
npm run build
# Output: dist/Clicky Setup 1.0.0.exe
```

---

## Customising the AI model

In `src/main.js`, change:

```js
const VISION_MODEL = 'gemma3:4b';  // swap for any Ollama vision model
```

Other good options:
- `llava:7b` — LLaVA 7B (older but reliable)
- `moondream` — very fast, smaller
- `minicpm-v` — great accuracy

---

## Privacy

Everything runs **100% locally**. Your screen is never sent to any cloud service. Ollama runs on your machine, Gemma runs on your GPU/CPU.

---

## Troubleshooting

**Buddy doesn't appear**
→ Check that Electron launched (look in system tray / taskbar)

**"Ollama not detected" warning**
→ Run `ollama serve` in a terminal first

**Voice not working**
→ Check Windows microphone permissions for Electron

**Gemma gives wrong coordinates**
→ Try a larger model: `ollama pull gemma3:12b`

---

Made with ♥ for Windows
