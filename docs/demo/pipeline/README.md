# Demo video pipeline

Rebuilds `docs/demo/reproai-demo.mp4` from the live app. Edit with HyperFrames (HTML timeline → MP4).

Needs: a **production build** (`npx next build && npx next start -p 3123`, so pages load fast), the scoring service on port 8000, `DEMO_LOGIN_ENABLED="true"`, system Chromium, ffmpeg, Node 22+, and `npm i playwright-core` in a scratch folder.

1. **Record** `EMAIL_HTML=file://<work>/email.html node record.mjs <work>/clips3` (render the email first: `node email-page.mts <work>/email.html`) — each scene captured with the Chrome screencast (1.2× density, real-time pacing, drawn cursor, eased scrolling) and converted to 30 fps MP4. Capture starts once the page has loaded.
2. **Voice** `python3 tts.py ../reproai-demo-script.md ../../../.env.local <work>/audio jessica eleven_v3` — one clip per `> ` paragraph (ElevenLabs key read from the env file, never printed). `voice_samples.py` makes short samples for choosing a voice. Then trim silences and normalise each clip (`loudnorm=I=-16`).
3. **Compose** `python3 compose_story.py ../reproai-demo-script.md <work>/clips3 <work>/audio <work>/hf` (three acts: phone scenes with a chapter panel, a phone-to-desktop handover animation, desktop scenes with chapter chips; beats split at the markers in `clips3/marks.json`) — writes a HyperFrames `index.html`: screens in a rounded frame with a slow push-in, ~0.8 s flowing transitions between sections, animated cards, sentence captions, the "synthetic demo data" label. Per-clip start offsets live in `PLAN`.
4. **Render** in `<work>/hf`: `npx hyperframes lint`, `npx hyperframes snapshot --at 10,40,80`, `npx hyperframes render --output final.mp4 --quality high --fps 30`; then re-encode with `loudnorm=I=-16` for sharing.

Recording writes to the shared database: three Health Connect readings for Reem (`externalId` starting `demo-video-hc-`), a released assessment and a follow-up for Reem, copilot and assistant chats; the privacy switch is turned on and back. Delete them afterwards. The devices scene exposes `navigator.bluetooth` in the headless browser so the real Bluetooth panel renders; no connection or reading is simulated.
