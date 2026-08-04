# YearGlass Sanctuary — A Living Digital Sanctuary

YearGlass is a slow, living digital sanctuary. A persistent micro-ecosystem companion framed within a cozy evening workspace where users nurture plants, observe procedural growth, interact with Pip the ladybug, and unwind with responsive atmosphere and time cycles.

---

## 🌿 Core Features & Systems

- **Procedural Living Ecosystem**: Nurture moss, fern, orchid, and vine species through growth stages, flowering blooms, and soil moisture care.
- **Creature Companion (Pip AI)**: A finite state machine for Pip the ladybug, featuring wandering, resting, curiosity, and gesture tap reactions.
- **5-Layer Depth WebGL2 Engine**: Curved glass dome refraction, tone-mapped specular highlights, rim lighting, dynamic light vectors, and tap shimmer pulses with Canvas 2D fallback.
- **Ambient Web Audio Soundscape**: Fully procedural Web Audio API bed generating rain, synthetic birdsong, harmonic hum, and shimmer arpeggios with gesture unlock and browser compatibility.
- **IndexedDB Event Memory**: Persistent journal, milestone logs, offline catch-up progression, and sanctuary state saving.
- **Responsive Mobile Viewport**: Dynamic aspect ratio framing using `--dvh`/`--svh` units to eliminate dark letterboxing across mobile and desktop devices.

---

## 🛠️ Development & Production Commands

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run TypeScript linter & type check
npm run lint

# Run unit & simulation test suite
npm run test

# Production build for static hosting (GitHub Pages)
npm run build
```

---

## 📦 Project Structure

```
yearglass-sanctuary/
├── src/
│   ├── audio/          # Procedural Web Audio API engine
│   ├── engine/         # Subsystem orchestrators & render pipelines
│   ├── entities/       # Creature & plant state models
│   ├── graphics/       # Canvas & asset composition helpers
│   ├── rendering/      # WebGL2 glass shaders, camera, scene layers
│   ├── simulation/     # Master tick, growth, Pip AI, memory engine
│   ├── storage/        # IndexedDB SaveEngine persistence
│   ├── ui/             # High-contrast HUD, modals, dialogues, toasts
│   ├── world/          # Environment, weather, time-of-day cycles
│   └── main.ts         # Standalone entry point
├── test/               # Standalone test suite
├── index.html          # HTML entry with critical inline styles
├── vite.config.ts      # Vite & PWA build configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies (Pixi.js, GSAP, Howler, Vite)
```

---

## 📄 License

MIT License © 2026 YearGlass Sanctuary Team
