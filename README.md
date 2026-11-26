# Folio — Line-by-Line Mathematics

A minimal, warm-toned mathematics workbook for working through Algebra through College Math and Probability & Statistics line by line on mobile and desktop.

## Live Site & Direct Android APK (GitHub Pages)

Once deployed, the app and its installable Android APK are served automatically from your repository's default GitHub Pages URL:

- **Web App (PWA):** **[https://\<your-username\>.github.io/\<your-repo-name\>/](https://your-username.github.io/your-repo-name/)**
- **Direct Android APK:** **[https://\<your-username\>.github.io/\<your-repo-name\>/folio.apk](https://your-username.github.io/your-repo-name/folio.apk)**

*(Replace `<your-username>` and `<your-repo-name>` with your GitHub username and repository name—for example, `https://your-username.github.io/folio/` and `https://your-username.github.io/folio/folio.apk`.)*

## Installing on Android

There are two built-in ways to install Folio directly from your deployed GitHub Pages site:

1. **Install the native `.apk` (`folio.apk`)**:
   - Open your deployed GitHub Pages URL on Android and tap **Install** in the top navigation bar, then tap **Download folio.apk** (or open `<your-pages-url>/folio.apk` directly).
   - Tap the downloaded `folio.apk` file and allow installing from your browser when prompted.
   - The APK bundles the full app locally inside an Android WebView so it launches from your app drawer and works offline.
2. **Install as a PWA / WebAPK**:
   - Tap **Install** → **Install Web App** (or Chrome menu → **Install app**) to install Folio directly through Chrome with offline Service Worker caching.

## Deploying to GitHub Pages

This repository is preconfigured to build both the PWA and `folio.apk` automatically via GitHub Actions (`.github/workflows/deploy.yml`).

1. Push this repository to GitHub on the `main` branch.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push any commit to `main` (or open **Actions → Deploy to GitHub Pages (with Android APK) → Run workflow**).

### Optional: Custom Release Signing Key for `folio.apk`

Out of the box, the workflow builds a debug-signed `folio.apk` that installs directly on Android with zero setup. If you want a custom release-signed APK (so future updates overwrite smoothly with your own key), add these four repository secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64` — Base64-encoded `.jks` / `.keystore` file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

### How automatic base paths work

`vite.config.ts` automatically detects `GITHUB_REPOSITORY` during GitHub Actions builds and sets Vite's `base` and PWA manifest `start_url` / `scope` to `/<your-repo-name>/` (or `/` for a user site named `<your-username>.github.io`).

## Local Development

```bash
npm install
npm run dev
```

Available scripts:

- `npm run dev` — Start the local Vite development server on port `3000`.
- `npm run build` — Build the production PWA bundle into `dist/`.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Run TypeScript type checking (`tsc --noEmit`).
