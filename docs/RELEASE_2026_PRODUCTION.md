# LunaGuard production-ready UI release

This release keeps the existing planner, recovery engine, timeline, digital twin,
data sources, authentication, and IBM Granite integrations while strengthening the
customer-facing experience.

## Reliability fixes

- Pins React and React DOM to 18.2.0 with Next.js 14.2.35 to avoid mixed runtime behavior.
- Uses browser-native numeric timer refs in the Digital Twin page.
- Uses explicit React effect cleanup functions for auth, login, globe animation,
  Copilot audio/microphone state, and mission timers.
- Removes fixed Docker container names so multiple LunaGuard folders do not conflict.

## Product experience

- Persistent animated cosmic background with moving stars, planets, nebula and orbit accents.
- Global copyright footer on every normal application page and login screen.
- Short creator About page for Asma Ahmed Syrotikin.
- Configurable LinkedIn and GitHub links through public environment variables.
- More readable default typography and larger planner labels.
- Production-facing language in the application UI.

## 3D lunar globe

- Drag to rotate.
- Mouse-wheel zoom.
- Auto-rotation toggle.
- Double-click/reset control.
- Toggleable topography, relief, polar illumination, grid and site layers.
- Procedural maria/crater shading and directional illumination for a more lunar appearance.
- Clear disclosure that generated globe pixels are visualization proxies rather than raw NASA imagery.

## AI Mission Copilot

- IBM watsonx.ai / Granite remains the primary generative runtime when configured.
- NASA and Canadian Space Agency source grounding remains visible in responses.
- Voice input/output with two selectable profiles: Luna and Atlas.
- IBM Watson Speech-to-Text and Text-to-Speech are used when server credentials are configured.
- Browser speech recognition/synthesis provide a graceful fallback where supported.
- An optional IBM Bob MCP bridge exposes read-only LunaGuard health, AI, source, and Copilot tools to Bob during development.
