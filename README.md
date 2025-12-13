<div align="center">
  <img src="<img width="333" height="235" alt="image" src="https://github.com/user-attachments/assets/09db937a-ac2f-4114-b611-114b9f6aecd8" />" alt="Mugen Play Logo" width="120" height="120" />

  # MUGEN PLAY
  
  **The Ultimate Extension-Based Anime Platform**

  <p>
    <a href="https://github.com/Kapy2003/mugen-play/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/Kapy2003/mugen-play?style=for-the-badge&color=blue" alt="Contributors" />
    </a>
    <a href="https://github.com/Kapy2003/mugen-play/stargazers">
      <img src="https://img.shields.io/github/stars/Kapy2003/mugen-play?style=for-the-badge&color=yellow" alt="Stars" />
    </a>
    <a href="https://github.com/Kapy2003/mugen-play/issues">
      <img src="https://img.shields.io/github/issues/Kapy2003/mugen-play?style=for-the-badge&color=red" alt="Issues" />
    </a>
    <a href="https://github.com/Kapy2003/mugen-play/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
    </a>
  </p>

  <h3>
    <a href="#-features">Features</a> • 
    <a href="#-getting-started">Installation</a> • 
    <a href="#-extension-system">Extensions</a> • 
    <a href="#-tech-stack">Tech Stack</a>
  </h3>
</div>

---

## 📖 About

**Mugen Play** is a modern, privacy-focused web application for discovering and tracking anime. It leverages a powerful **Extension System** to decouple content providers from the UI, syncing seamlessly with **AniList**.

Built with **React 18** and **TailwindCSS**, it offers a "Netflix-like" cinematic experience without the ads, clutter, or tracking found on traditional streaming sites.

## 📸 Preview

<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Add+Your+App+Screenshot+Here" alt="Preview Placeholder" width="800" />
</div>

---

## ✨ Features

### 🎨 User Experience
- **Cinematic UI**: Dark-mode first, built with TailwindCSS for a premium feel.
- **Smart Player**: Auto-playing trailers, skip intro support, and theater mode.
- **Responsive**: Fully optimized for Desktop, Tablet, and Mobile devices.

### 🔌 Extension Architecture
- **Decoupled Sources**: The app does not host content. Users install "Source Extensions" to define where content comes from.
- **Community Store**: Browse and install extensions for various providers.
- **Auto-Search**: Automatically scrapes active extensions to find the best stream for your anime.

### 👤 AniList Integration
- **OAuth Login**: Secure login with your AniList account.
- **Library Sync**: View your "Watching", "Planning", and "Completed" lists.
- **Metadata**: Rich data (descriptions, banners, scores) provided directly by AniList API.

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Core** | [React 18](https://reactjs.org/) (Vite) |
| **Language** | [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (ES6+) |
| **Styling** | [TailwindCSS](https://tailwindcss.com/) + PostCSS |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **API** | [GraphQL](https://graphql.org/) (AniList) |
| **Linting** | ESLint |

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
* **Node.js** (v16 or higher)
* **npm** (comes with Node.js)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/Kapy2003/mugen-play.git](https://github.com/Kapy2003/mugen-play.git)
    cd mugen-play
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    * The app uses a default `CLIENT_ID` for AniList.
    * To use your own, create a [New Client on AniList](https://anilist.co/settings/developer) and update `src/App.jsx`.

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    > Open [http://localhost:5173](http://localhost:5173) in your browser.

5.  **Build for Production**
    ```bash
    npm run build
    ```

---

## 📂 Project Structure

```text
mugen-play/
├── public/              # Static assets (favicons, manifest)
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Main route views (Home, Player, Search)
│   ├── extensions/      # Extension definitions and logic
│   ├── hooks/           # Custom React hooks
│   ├── App.jsx          # Main application entry
│   └── main.jsx         # DOM rendering
├── eslint.config.js     # Linting configuration
├── tailwind.config.js   # TailwindCSS configuration
├── vite.config.js       # Vite bundler configuration
└── package.json         # Dependencies and scripts

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to set up the project, add new extensions, and submit pull requests.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
143. 
144. ## 🫡 Credits
145. 
146. Created and maintained by [Kapy2003](https://github.com/Kapy2003/).
147. 
148. Check out my other projects on [GitHub](https://github.com/Kapy2003/).
