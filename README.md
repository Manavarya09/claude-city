# Code City

[![License: MIT](https://img.shields.io/github/license/Manavarya09/code-city?color=0a0a0a)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Manavarya09/code-city?style=flat&color=0a0a0a)](https://github.com/Manavarya09/code-city/stargazers)
[![Issues](https://img.shields.io/github/issues/Manavarya09/code-city?color=0a0a0a)](https://github.com/Manavarya09/code-city/issues)
[![Last commit](https://img.shields.io/github/last-commit/Manavarya09/code-city?color=0a0a0a)](https://github.com/Manavarya09/code-city/commits/main)


**Turn any GitHub repo into a 3D city.**

Paste a repo URL → watch it transform into a navigable 3D cityscape with buildings, districts, fires, and walking characters. 100% client-side, no backend, no signups.

**[Try it live →](https://claude-city.vercel.app)**

---

## How It Works

| Code | City |
|------|------|
| Files | Buildings (height = lines of code) |
| Folders | Districts with labels |
| Languages | Building colors (blue = TypeScript, yellow = JS...) |
| Dependencies | Roads connecting buildings |
| Bug-fix commits | Fires on buildings |
| Recent changes | Glowing buildings |
| Contributors | Walking characters |

Paste any public GitHub repo and the city builds itself using the GitHub API — no cloning, no backend, no API keys needed.

---

## Quick Start

### Use the website
Go to **[claude-city.vercel.app](https://claude-city.vercel.app)** and paste a repo.

### Run locally
```bash
git clone https://github.com/Manavarya09/code-city.git
cd claude-city
npx serve app
```
Open `http://localhost:3000`

### Direct links
```
https://claude-city.vercel.app?repo=facebook/react
https://claude-city.vercel.app?repo=vercel/next.js
```

---

## Controls

| Action | Control |
|--------|---------|
| Rotate | Drag |
| Zoom | Scroll |
| Pan | Right-click drag |
| Inspect | Hover building |
| Focus | Click building |
| Reset | Press R |
| Rocket | 🚀 button |

---

## Tech Stack

- **Three.js** — 3D rendering (CDN, zero build step)
- **GitHub REST API** — Fetches file tree, contributors, languages, commits
- **Vercel** — Hosting (static site)
- **Zero dependencies** — No npm install, no build, no backend

---

## Contributing

This project needs help! Here's what I want to build but can't do alone:

### High Priority
- [ ] **Better building shapes** — Not just boxes. Cylinders, L-shapes, pyramids for variety
- [ ] **Day/night toggle** — Switch between sunset and midnight cyberpunk mode
- [ ] **Time travel slider** — See how the city grew over commit history
- [ ] **Click building → open file** — Link buildings to GitHub file URLs

### Medium Priority
- [ ] **Performance for huge repos** — Linux kernel, chromium (10K+ files)
- [ ] **Shareable screenshots** — One-click export to PNG/video
- [ ] **Mobile support** — Touch controls, responsive layout
- [ ] **Private repos** — OAuth flow for GitHub token
- [ ] **Minimap** — Small 2D overview in corner

### Would Be Insane
- [ ] **Multiplayer** — See other people's cursors flying around
- [ ] **VR mode** — Walk through your codebase in WebXR
- [ ] **Sound** — Lo-fi beats + ambient city sounds
- [ ] **Terrain** — Hills and rivers based on code complexity
- [ ] **Weather** — Rain when tests fail, sunshine when CI passes

### How to Contribute
1. Fork the repo
2. Pick an issue or idea from above
3. `npx serve app` to run locally
4. Open a PR

No build step. No npm install. Just edit the JS files in `app/` and refresh.

---

## Architecture

```
app/
├── index.html      # Landing page + Three.js app entry
├── city.js         # Building generation, treemap layout
├── agents.js       # Walking character sprites
├── effects.js      # Fire, sparkles, rockets, atmosphere
├── controls.js     # Camera, UI overlay, tooltips
└── github-api.js   # GitHub API client (no backend needed)
```

Everything runs in the browser. The GitHub API is called directly from the client. No server, no database, no auth (for public repos).

---

## Supported Input Formats

All of these work:
- `facebook/react`
- `https://github.com/facebook/react`
- `https://github.com/facebook/react.git`
- `github.com/facebook/react/`

---

## Rate Limits

GitHub API allows 60 requests/hour without auth. For heavier usage, add a personal access token:
1. Create token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Open browser console → `localStorage.setItem('gh_token', 'your_token_here')`
3. Rate limit increases to 5000/hour

---

## License

MIT — See [LICENSE](LICENSE)

---

**See your code. Like never before.**
