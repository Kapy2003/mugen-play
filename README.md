# Mugen Play

Mugen Play is a modern, modular web application designed for browsing, discovering, and streaming anime. Built from the ground up with React 19 and TailwindCSS, the project focuses on delivering a fast, distraction-free viewing experience across both desktop and mobile devices.

Rather than bundling hardcoded streaming sites, Mugen Play uses an extension-driven architecture. The core interface acts as a clean client that interfaces with AniList for rich metadata and rankings, while delegating video playback to independent source extensions that can be added, switched, or customized at any time.

---

## Why Mugen Play?

Traditional anime websites are often overwhelmed with intrusive advertisements, broken redirects, and inconsistent user interfaces. Mugen Play was built with a simple philosophy:

- **Decoupled Architecture**: UI, catalog data, and streaming endpoints are completely isolated.
- **Continuous Playback**: Minimizing or resizing the video player never interrupts or restarts playback, preventing stream drops and rate limits.
- **Viewport Calibration**: Embedded web players often carry oversized headers. Mugen Play includes built-in viewport calibration to crop headers and scale video feeds perfectly to the screen.
- **Mobile First**: Full touch gesture support, responsive bottom-stacked episode navigation, and a lightweight footprint designed for phones and tablets.

---

## Key Features

### Modular Extension System
- **AniList Core Engine**: Serves as the primary metadata provider for real-time trending anime, seasonal charts, search, and accurate episode counts.
- **Dynamic Stream Resolvers**: Integrated resolvers automatically convert anime metadata into direct playable streams across supported providers (such as HiAnime and AnimePahe).
- **Live Source Switching**: Switch between different streaming providers directly from the player toolbar without losing episode progress.
- **Extension Store**: Install curated extensions or permanently add your own custom stream endpoints via the extension manager.

### Video Player & Viewport Controls
- **Zero-Reload State Transitions**: The player canvas remains continuously mounted in the DOM, allowing seamless transitions between full screen and the floating corner miniplayer.
- **Smart Crop & Zoom Presets**:
  - Desktop Full Player: `-72px` vertical offset / `100%` scale
  - Mobile Full Player: `-62px` vertical offset / `100%` scale
  - Desktop Miniplayer: `-50px` vertical offset / `100%` scale
  - Mobile Miniplayer: `-62px` vertical offset / `92%` scale
- **Developer Toolbar**: Built-in developer tools allow real-time adjustments to horizontal shift, vertical offset, and zoom levels.

### Responsive Design & Navigation
- **Back-to-Browse Behavior**: Clicking the Back button automatically minimizes the player to the corner, allowing you to browse catalogs while continuing to watch.
- **Mobile Episode Drawer**: On mobile screens, episode lists and pagination are stacked cleanly below the video player and synopsis.
- **Touch Gesture Support**: Native horizontal scrolling with momentum on mobile touchscreens.
- **Dark & Light Themes**: Instant theme toggling directly from the navigation bar.

---

## Tech Stack

- **Framework**: React 19, Vite
- **Styling**: TailwindCSS 4, PostCSS
- **Icons**: Lucide React
- **Streaming Engine**: HLS.js, Native HTML5 Video, Sandboxed Embed Adapters
- **Data & Caching**: SWR, LocalStorage
- **Quality & Testing**: ESLint 9, Custom Node.js Stream Resolver Test Suite

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
   Open `http://localhost:5173` in your browser.

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
│   │   ├── anime/          # Anime cards, detail modals, and episode grids
│   │   ├── common/         # Scroll lists, source selectors, toast notifications
│   │   ├── extensions/     # Extension store and custom source dialogs
│   │   ├── home/           # Hero carousel and featured anime shelves
│   │   ├── layout/         # Responsive sidebar and navigation
│   │   └── player/         # Video player, miniplayer overlay, direct play
│   ├── data/               # Default extension configurations and constants
│   ├── extensions/         # AniList metadata source adapter
│   ├── lib/                # URL resolvers, extension repo manager, health checker
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

Please ensure all tests pass (`npm test`) and the linter reports no errors (`npm run lint`) before opening a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Author

Created and maintained by [Kapy2003](https://github.com/Kapy2003/).
