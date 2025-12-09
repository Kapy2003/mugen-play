# Contributing to Mugen Play

First off, thanks for taking the time to contribute! 🎉

Mugen Play is an open-source project, and we love receiving contributions from our community — whether it's a bug fix, new feature, or a new extension source.

## 🛠️ Development Setup

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone [https://github.com/your-username/mugen-play.git](https://github.com/your-username/mugen-play.git)
    cd mugen-play
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Create a branch** for your edits:
    ```bash
    git checkout -b feature/amazing-feature
    ```
5.  **Start the development server**:
    ```bash
    npm run dev
    ```

## 🔌 Adding New Extensions

Mugen Play relies on a decoupled extension system. If you want to add a new anime source:

1.  Navigate to `src/extensions/`.
2.  Create a new folder for your source (e.g., `src/extensions/MyNewSource/`).
3.  Ensure your source implements the standard interface (search, getInfo, getSources).
4.  **Test your extension** thoroughly to ensure it scrapes data correctly.

## 🎨 Style Guidelines

* **JavaScript**: We use modern ES6+ syntax.
* **React**: Use Functional Components and Hooks. Avoid Class components.
* **Styling**: Use TailwindCSS utility classes. Avoid inline styles where possible.
* **Linting**: Please run `npm run lint` before committing to ensure your code is clean.

## 📥 Submitting a Pull Request (PR)

1.  **Commit your changes** with a clear message:
    ```bash
    git commit -m "feat: add new GogoAnime extension source"
    ```
2.  **Push to your fork**:
    ```bash
    git push origin feature/amazing-feature
    ```
3.  **Open a Pull Request** against the `main` branch of the upstream repository.
4.  Describe your changes clearly in the PR description.

## 🐞 Reporting Bugs

If you find a bug, please create an Issue on GitHub. Include:
* Steps to reproduce.
* Expected behavior vs. actual behavior.
* Screenshots (if applicable).

Thank you for helping make Mugen Play better!
