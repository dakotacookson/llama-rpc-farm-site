# Llama RPC Farm — project site

The static marketing site for [Llama RPC Farm](https://github.com/dakotacookson/Llama-RPC-Farm).

- No backend, no build step, no framework.
- Plain `index.html`, `styles.css`, and `main.js`.
- Animated dot-matrix backdrop, responsive layout, theme studio, farm + peer-agent downloads (Linux x64/arm64 incl. Raspberry Pi), and CLI showcase.
- Downloads resolve from the latest GitHub release at runtime and refresh every 10 minutes; the `main-latest` pointer release is ignored so asset-less releases never win.
- Farm and agent one-line installers support Linux/macOS and Windows PowerShell.
- `docs.html` pulls Markdown directly from the main branch and renders it in the site’s own reading layout.
- Hosted with GitHub Pages from the repository root.

## Local preview

```bash
python3 -m http.server 8080
```

Open <http://127.0.0.1:8080>.

## Deploy

Every push to `main` deploys through `.github/workflows/pages.yml`.
For a fork, enable **Settings → Pages → Source: GitHub Actions**.
