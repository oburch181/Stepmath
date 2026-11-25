# Folio — Line-by-Line Mathematics

A minimal, warm-toned mathematics workbook for working through Algebra through College Math and Probability & Statistics line by line on mobile and desktop.

## Live Site (GitHub Pages)

Once deployed, the app is served automatically at your repository's default GitHub Pages URL:

**[https://\<your-username\>.github.io/\<your-repo-name\>/](https://your-username.github.io/your-repo-name/)**

*(Replace `<your-username>` and `<your-repo-name>` with your GitHub username and repository name—for example, `https://your-username.github.io/folio/`.)*

## Deploying to GitHub Pages

This repository is preconfigured to build and publish automatically via GitHub Actions (`.github/workflows/deploy.yml`).

1. Push this repository to GitHub on the `main` branch.
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push any commit to `main` (or open **Actions → Deploy to GitHub Pages → Run workflow**).

### How automatic base paths work

`vite.config.ts` automatically detects `GITHUB_REPOSITORY` during GitHub Actions builds and sets Vite's `base` to `/<your-repo-name>/` (or `/` if the repository is a user site named `<your-username>.github.io`). No manual URL editing is required in the build config.

If you want to preview a subpath build locally, pass `VITE_BASE_PATH`:

```bash
VITE_BASE_PATH=/your-repo-name/ npm run build
```

## Local Development

```bash
npm install
npm run dev
```

Available scripts:

- `npm run dev` — Start the local Vite development server on port `3000`.
- `npm run build` — Build the production static bundle into `dist/`.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Run TypeScript type checking (`tsc --noEmit`).
