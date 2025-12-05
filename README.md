# Mugen Play

<div align="center">
  <!-- <img src="https://anilist.co/img/icons/android-chrome-512x512.png" alt="Mugen Play Logo" width="100" height="100" /> -->
  <h1>Mugen Play</h1>
  <p><strong>The Ultimate Extension-Based Anime Platform</strong></p>
</div>

Mugen Play is a modern, privacy-focused, and beautiful web application for discovering and tracking anime. It leverages a powerful **Extension System** to let users define their own content sources while syncing seamlessly with **AniList**.

## ✨ Features

- **🎨 Modern Data-Rich UI**: built with TailwindCSS for a premium "Netflix-like" experience.
- **🔌 Extension Architecture**: Decoupled content providers. Comes with built-in AniList metadata provider.
- **👤 AniList Integration**: 
  - Login with your AniList account.
  - Sync your Watch History (Coming Soon).
  - Browse your Personalized Trending list.
- **🚫 Ad-Free Experience**: Designed for clean consumption locally.
- **📱 Responsive**: Fully optimized for Desktop, Tablet, and Mobile.
- **🍿 Smart Player**: Auto-playing trailers with delayed start, minimize/maximize player modes.

## 🛠️ Tech Stack

- **Framework**: React 18 (Vite)
- **Styling**: TailwindCSS + Lucide Icons
- **State Management**: React Hooks + LocalStorage Persistence
- **API**: GraphQL (AniList)

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/mugen-play.git
    cd mugen-play
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## ⚙️ Configuration

### AniList Authentication
The app uses a public/dev Client ID by default. To use your own:
1.  Go to [AniList Developer Settings](https://anilist.co/settings/developer).
2.  Create a new Client.
3.  Open `src/App.jsx`.
4.  Replace the `CLIENT_ID` constant with your new ID.

## 🧩 Extension System

Mugen Play uses a standardized `ExtensionSDK`.
- **Source Extensions**: Provide metadata (e.g., AniList).
- **Custom Extensions**: Can be added via the "Extensions" tab to provide video sources.

