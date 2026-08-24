# Mugen Play

Mugen Play is a modern, modular web application designed for browsing, discovering, and streaming anime. Built with React 19 and TailwindCSS, the project delivers a fast, distraction-free viewing experience with dedicated ergonomics for both desktop and mobile viewports.

Rather than bundling hardcoded streaming sites, Mugen Play uses an extension-driven architecture. The core interface interfaces with AniList for rich metadata, trending shelves, and rankings, while delegating video playback to independent source extensions that can be added, hot-swapped, or customized at any time.

---

## Why Mugen Play?

Traditional anime websites are often overwhelmed with intrusive advertisements, broken redirects, and inconsistent user interfaces. Mugen Play was built on four key principles:

- **Decoupled Architecture**: UI views, metadata discovery, and stream resolvers operate independently.
- **Continuous 120fps Miniplayer**: Minimizing or resizing the video player never interrupts or reloads video playback, avoiding stream drops and rate limits.
- **Precision Viewport Calibration**: Built-in viewport offset and zoom calibration to automatically crop unwanted headers from embed streams.
- **Platform-Specific UX**: Dedicated mobile gestures (4-corner magnetic dock snap, pull-to-minimize, touch swipe carousels) and dedicated desktop ergonomics (collapsible episode sidebars, keyboard navigation, resizable sidebars).

---

## Key Features

### Modular Architecture
- **Dedicated View Isolation**: Desktop layouts and mobile touch layouts are cleanly separated into dedicated components (`src/components/desktop/` and `src/components/mobile/`).
- **Tab Views**: Clean, focused views for `Home`, `Browse`, `Favorites`, `Extensions`, and `Settings`.

### 120fps Hardware-Accelerated Miniplayer
- **Non-Passive Touch Listeners**: Miniplayer dragging runs directly on the GPU compositor thread with 0 React re-renders, delivering smooth 120Hz tracking.
- **4-Corner Magnetic Snapping**: Releasing the miniplayer automatically snaps it to the nearest dock corner with momentum.
- **Swipe-to-Dismiss**: Swiping the miniplayer horizontally off-screen cleanly closes playback.

### Extension System & Resolvers
- **AniList Core Engine**: Real-time trending charts, seasonal archives, full-text catalog search, and genre/format filters.
- **Dynamic Stream Resolvers**: Integrated algorithmic resolvers map AniList anime and episode numbers to live stream endpoints across supported providers (such as HiAnime and AnimePahe).
- **Hot-Swapping**: Switch active streaming sources directly from the playback header without losing your current timestamp or episode position.
- **Custom Source Manager**: Add, edit, test, and toggle custom stream providers at any time.

### Settings, Cache & Developer Tools
- **Theme Switcher**: Instant transition between Dark Mode and Light Mode with custom scrollbars and backdrop filters.
- **Storage & Cache Management**:
  - *Clear Temporary Cache*: Wipes cached images and session data without touching favorites or watch history.
  - *Delete All Data & Reset*: Nuclear wipe option with modal confirmation to restore the app to its fresh install state.
- **Developer Debugger Overlay**: Unlockable debug mode (secret tap or passcode `mugen`) providing active stream URL inspection, vertical offset sliders, and zoom presets.

---

## Tech Stack

- **Framework**: React 19, Vite
- **Styling**: TailwindCSS 4, PostCSS
- **Icons**: Lucide React
- **Streaming Engine**: HLS.js, Native HTML5 Video, Sandboxed Embed Adapters
- **Data & Caching**: SWR, LocalStorage, AniList GraphQL API
- **Quality & Testing**: Custom Node.js Stream Resolver Test Suite

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Kapy2003/mugen-play.git
   cd mugen-play
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser (or your network IP on mobile).

4. Run the test suite:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## Project Structure

```text
mugen-play/
├── public/                 # Static assets, logos, and web icons
├── src/
│   ├── components/
│   │   ├── desktop/        # 🖥️ Desktop Playback Layout (Episode sidebar)
│   │   │   └── DesktopPlayerView.jsx
│   │   ├── mobile/         # 📱 Mobile Playback & Gestures (Miniplayer drag, stacked episodes)
│   │   │   ├── MiniPlayerOverlay.jsx
│   │   │   └── MobilePlayerView.jsx
│   │   ├── views/          # 📑 Tab Views
│   │   │   ├── HomeView.jsx
│   │   │   ├── BrowseView.jsx
│   │   │   ├── FavoritesView.jsx
│   │   │   └── SettingsView.jsx
│   │   ├── anime/          # Anime cards, detail modals, and episode grids
│   │   ├── common/         # Scroll lists, source selectors, toast notifications
│   │   ├── extensions/     # Extension store and custom source dialogs
│   │   ├── home/           # Hero carousel and featured anime shelves
│   │   ├── layout/         # Responsive sidebar and navigation
│   │   └── player/         # Video player, direct play
│   ├── data/               # Default extension configurations and constants
│   ├── extensions/         # AniList metadata source adapter
│   ├── lib/                # URL resolvers, formatters, repo manager, health checker
│   │   ├── formatters.js
│   │   ├── AnimeUrlResolver.js
│   │   ├── ExtensionRepoManager.js
│   │   └── ExtensionHealthChecker.js
│   ├── App.jsx             # Root application orchestrator
│   ├── index.css           # Global typography and Tailwind styles
│   └── main.jsx            # React root initialization
├── test-suite.js           # Automated stream resolver and extension test suite
├── package.json            # Project dependencies, scripts, and metadata
└── vite.config.js          # Vite build configuration
```

---

## Contributing

Contributions are welcome. If you would like to add a new extension resolver, improve documentation, or fix an issue:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit your changes (`git commit -m "Add new feature"`).
4. Push to your branch (`git push origin feature/new-feature`).
5. Open a Pull Request.

Please ensure all tests pass (`npm test`) before opening a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Author

Created and maintained by [Kapy2003](https://github.com/Kapy2003/).
