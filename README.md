# AE Agent

Local After Effects copilot. You type what you want in Arabic or English; a local LLM (Ollama at `http://localhost:11434`) turns it into JSON operations; ExtendScript runs those operations inside the active composition. Nothing is sent to the cloud.

Two UIs:

1. **CEP HTML panel** (recommended) — `cep/com.aeagent.panel` — Window > Extensions > AE Agent
2. **ScriptUI fallback** — `scripts/AE-Motion-Agent.jsx`

## What it can do

The model does **not** run raw ExtendScript. It can only call the host catalog. That catalog now covers most day-to-day AE work:

- Camera: create, set, dolly, pan, orbit, dolly zoom, look at selected
- Layers: text, solid, null, shape, adjustment, light, camera; rename, hide, 3D, parent, duplicate, fade
- Properties: set or animate position, scale, rotation, opacity, anchor
- Effects: Gaussian Blur, Fill, Tint, Glow, Drop Shadow, and other built-in match names
- Text: content, size, fill, stroke, justification
- Expressions: `wiggle` and other property expressions (dangerous calls are blocked)
- Comp: markers, duration, frame rate, background, precompose
- Easing: Ease In / Out / In-Out, Auto Bezier, Linear, Hold, Cinematic

Ask in chat, for example:

- `أنشئ عنوان أبيض واعمل له فييد إن`
- `Add blur 25 to the selected layer and fade it in`
- `Make the selected layer 3D and orbit the camera around it`

If Ollama is down, `js/parser.js` still handles common phrases.

## Architecture

```text
Chat panel (index.html)
  -> js/llm.js          Ollama / OpenAI-compatible chat + short history
  -> js/parser.js       Offline fallback
  -> js/host-bridge.js  CSInterface.evalScript
  -> jsx/host.jsx       Dispatcher
       -> scene.jsx     Layers, text, effects, props, comps
       -> camera.jsx    Camera moves
       -> easing.jsx    Keyframe easing
       -> utils.jsx     Math + helpers
```

Full operation list: `prompts/system.txt`

## Install from ZXP (recommended)

The installer package is `dist/AE-Agent-1.0.0.zxp`.

This ZXP is unsigned (local/dev). After Effects will not load it until PlayerDebugMode is enabled (step 2 below).

### Option A — Anastasiy Extension Manager / ZXPInstaller

1. Download [Anastasiy’s Extension Manager](https://install.anastasiy.com) or ZXPInstaller.
2. Drop `dist/AE-Agent-1.0.0.zxp` onto the installer.
3. Enable PlayerDebugMode (see below) and restart After Effects.
4. Window > Extensions > AE Agent

### Option B — unpack next to other CEP panels

A `.zxp` file is a zip. Unzip it into:

- macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.aeagent.panel`
- Windows: `%APPDATA%\Adobe\CEP\extensions\com.aeagent.panel`

The unzipped folder must contain `CSXS/manifest.xml` at its root.

Rebuild the package after code changes:

```bash
bash install/build-zxp.sh
```

Output: `dist/AE-Agent-1.0.0.zxp`

## Install the CEP panel (copy folder)

### 1. Copy the extension

**macOS**

```bash
bash install/install-mac.sh
```

**Windows** (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File install\install-win.ps1
```

Manual copy if you prefer:

- macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.aeagent.panel`
- Windows: `%APPDATA%\Adobe\CEP\extensions\com.aeagent.panel`

Copy the folder `cep/com.aeagent.panel` to that path.

### 2. Allow unsigned panels

Adobe blocks unsigned HTML panels. Set PlayerDebugMode (see `install/enable-cep-debug.md`).

macOS:

```bash
defaults write com.adobe.CSXS.9 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

Windows PowerShell:

```powershell
9,10,11,12 | ForEach-Object {
  $p = "HKCU:\Software\Adobe\CSXS.$_"
  New-Item -Path $p -Force | Out-Null
  New-ItemProperty -Path $p -Name PlayerDebugMode -Value "1" -PropertyType String -Force | Out-Null
}
```

Restart After Effects.

### 3. Open the panel

Window > Extensions > AE Agent

If it is missing, confirm the folder name is `com.aeagent.panel` and that `CSXS/manifest.xml` exists.

## Install the ScriptUI fallback

File > Scripts > Run Script File... > `scripts/AE-Motion-Agent.jsx`

To show it in the Scripts menu, copy `scripts/AE-Motion-Agent.jsx` into:

- macOS: `/Applications/Adobe After Effects <version>/Scripts/`
- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\`

Keep the repo layout so the script can load `cep/com.aeagent.panel/jsx/*.jsx`. Enable File > Scripts > Allow Scripts To Write Files And Access Network.

## Local LLM (Ollama)

1. Install Ollama from https://ollama.com
2. Pull a model:

```bash
ollama pull llama3.1
```

3. Confirm it answers locally:

```bash
curl http://localhost:11434/api/tags
```

4. Click **Test connection**. The panel lists models already on your machine and picks a coder model (qwen / deepseek). You do not need llama3.1.

OpenAI-compatible local servers (LM Studio, llama.cpp) work if you switch API to OpenAI-compatible and point Endpoint at that server (the client calls `/v1/chat/completions`).

If the model is down, the panel still runs: `js/parser.js` maps common Arabic/English phrases to the same JSON operations.

## Try it

1. New composition, 1920x1080, 5 seconds.
2. Add a 3D text or shape layer.
3. Open AE Agent.
4. In chat, try:

- `أنشئ عنوان أبيض واعمل له فييد إن`
- `Add gaussian blur 25 to the selected layer`
- `Make the selected layer 3D and orbit the camera around it`
- `اجعل حركة الكاميرا هذه ناعمة وبطيئة في النهاية`

5. Undo is grouped as "AE Motion Agent".

## CEP debug

`cep/com.aeagent.panel/.debug` opens remote debugging on port **8088**.

Chrome: `http://localhost:8088`

## Layout

```text
cep/com.aeagent.panel/
  CSXS/manifest.xml
  index.html
  css/panel.css
  js/CSInterface.js
  js/app.js
  js/llm.js
  js/parser.js
  js/catalog.js
  js/host-bridge.js
  jsx/host.jsx
  jsx/scene.jsx
  jsx/camera.jsx
  jsx/easing.jsx
  jsx/utils.jsx
  jsx/json2.jsx
scripts/AE-Motion-Agent.jsx
prompts/system.txt
install/
```

## Notes

- Requires After Effects 2019+ (CEP 9 / AEFT 16).
- Camera moves need a 3D camera and usually a 3D layer.
- Dolly Zoom keeps subject scale by pairing position and zoom keyframes.
- The host refuses unknown `op` values. The LLM cannot run arbitrary ExtendScript.
- This is not a full AE replacement: third-party plugin UIs, Render Queue farms, and unsupported match names are out of scope. Ask in chat; if the catalog cannot do it, the agent says so instead of inventing code.
