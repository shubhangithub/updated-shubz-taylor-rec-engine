# The Shubz-Taylor Recommendation Engine

> Every song you love is a coordinate in a space you haven't mapped yet.

[Live Demo](https://shubz-taylor-recommendation-engine.vercel.app) · [Research Papers](#research) · [Contributing](CONTRIBUTING.md)

## What Is This

This is a music recommendation engine built around one of the most studied and obsessed-over catalogs in modern music: Taylor Swift's. But it is not a Taylor Swift fan project. It is a serious attempt to answer a deceptively hard question: *why do two songs feel the same?*

To find out, we built six independent ML engines — each implementing a real, published research technique — and pointed them at 801 songs across 46 artists. A Sentence-BERT transformer reads lyrics as meaning. A Variational Autoencoder compresses 384 dimensions of feeling into 16. A Node2Vec graph walker discovers connections no playlist algorithm would surface. A Neural Collaborative Filter learns taste the way Netflix learned movies. A Hybrid Ensemble combines the five embedding engines with weighted rank aggregation and consensus boosts. And a Contrastive SSL model, trained with the same NT-Xent loss that taught machines to see, learns what makes two songs similar without ever being told.

The result is a 3D constellation of Taylor Swift's universe — every song a star, every connection a thread of light — with Whisper-synced karaoke, hand-written editorial bridges connecting Taylor to 53 other artists, and four data science investigations that read like magazine features. It started as a school project. It became something we couldn't stop building.

## The Six Engines

| Engine | Technique | Paper | What It Finds |
|--------|-----------|-------|---------------|
| **Transformer Lyrics** | Sentence-BERT embeddings (384-d) | Reimers & Gurevych, 2019 | Songs that mean the same thing, even in different words |
| **VAE Latent Space** | Variational Autoencoder (384 -> 16-d) | Kingma & Welling, 2013 | The hidden structure beneath lyrical similarity |
| **Graph Node2Vec** | Biased random walks on song graphs (64-d) | Grover & Leskovec, 2016 (KDD) | Neighbors you would never think to visit |
| **Neural Collaborative** | Neural Collaborative Filtering (48-d) | He et al., 2017 (WWW) | What listeners with your taste also love |
| **Hybrid Ensemble** | Weighted rank aggregation | Burke, 2002 | Consensus across the five embedding engines |
| **Contrastive SSL** | SimCLR-style self-supervised learning (64-d) | Spijkervet & Burgoyne, 2021 (ISMIR) | Similarity learned without labels |

All six are real implementations. Every embedding is pre-computed and stored as numpy arrays. Runtime queries take less than 10 milliseconds.

## Quick Start

```bash
git clone https://github.com/shubhangithub/updated-shubz-taylor-rec-engine.git
cd shubz-taylor-rec-engine
chmod +x setup.sh && ./setup.sh
```

The setup script will create a Python virtual environment, install dependencies, and prompt you for Spotify API credentials ([get them here](https://developer.spotify.com/dashboard)).

Then run both servers:

```bash
# Terminal 1 — Backend (port 8000)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and step through the vault door.

## Architecture

**Frontend**: Next.js 15.5, React 19, TypeScript, Tailwind, Framer Motion, React Three Fiber 9 (Three.js), Recharts
**Backend**: FastAPI, Python, uvicorn
**ML**: PyTorch, sentence-transformers, gensim, scikit-learn, networkx
**Data**: Spotify API, iTunes previews, LRCLIB lyrics (optional Genius fallback), OpenAI Whisper

```
backend/
  app/
    main.py              # FastAPI app, all endpoints
    rec_engines.py       # Engine registry
    engines/             # Runtime engine modules (load .npy, compute similarity)
    editorial.py         # 166 hand-curated cross-artist bridges
    taylor_complete.json # Master song database
    spotify_client.py    # Spotify API + iTunes preview fallback
  ml/                    # One-time pre-compute scripts
  ml_data/               # Pre-computed embeddings, indexes, models

frontend/
  src/
    app/page.tsx         # Main orchestrator
    components/          # Constellation, RecEngine, ErasCorridor, SongWorld, etc.
    lib/
      eraThemes.ts       # Era colors, fonts, and metadata
      api.ts             # API client
      types.ts           # TypeScript interfaces
```

## Data

The pretrained model baseline uses the dataset below; weekly lyric expansion can increase the current corpus:

- **355 Taylor Swift songs** across 12 eras (including The Life Of A Showgirl)
- **323 songs** with real Spotify audio features (9 dimensions: danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness, tempo, loudness)
- **341 songs** with full lyrics
- **460 cross-artist songs** from 46 artists, scraped via Genius
- **166 editorial bridges** — hand-written connections between Taylor and 53 unique artists, each with a poetic reason
- **341 songs** with Whisper-synced lyric timings (averaging 34 timed lines per song)
- **4 data science analyses** computed from real data, with real statistics, zero placeholders

The weekly GitHub Actions pipeline expands cross-artist lyrics, recomputes BERT embeddings, refreshes iTunes discovery snapshots, syncs available previews, and updates insights. Audio features are served from the committed dataset because Spotify restricts that endpoint for newer apps.

## Research

The six engines are implementations of these papers:

1. **Reimers & Gurevych (2019)** — "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks" — [arxiv.org/abs/1908.10084](https://arxiv.org/abs/1908.10084)
2. **Kingma & Welling (2013)** — "Auto-Encoding Variational Bayes" — [arxiv.org/abs/1312.6114](https://arxiv.org/abs/1312.6114)
3. **Grover & Leskovec (2016)** — "node2vec: Scalable Feature Learning for Networks" — [arxiv.org/abs/1607.00653](https://arxiv.org/abs/1607.00653)
4. **He et al. (2017)** — "Neural Collaborative Filtering" — [arxiv.org/abs/1708.05031](https://arxiv.org/abs/1708.05031)
5. **Burke (2002)** — Hybrid Recommender Systems: Survey and Experiments
6. **Spijkervet & Burgoyne (2021)** — "Contrastive Learning of Musical Representations" (ISMIR 2021)

See the [Engine page](https://shubz-taylor-recommendation-engine.vercel.app) on the live site for interactive explanations of each technique.

## Deployment

The app runs on free-tier infrastructure:

- **Frontend**: Deployed to [Vercel](https://vercel.com). Push to `main` triggers auto-deploy.
- **Backend**: Deployed to [Render](https://render.com). Auto-deploys from `main` with root directory set to `backend/`.

Note: Render's free tier spins down after 15 minutes of inactivity. First request after idle takes 30-60 seconds.

To deploy your own fork, set these environment variables:
- **Render**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `FRONTEND_URL` (your frontend origin), and `SPOTIFY_REDIRECT_URI` (your backend `/api/spotify/callback` URL; defaults to Render’s external URL when available)
- **Vercel**: `NEXT_PUBLIC_API_URL` (your Render URL)

## Contributing

We welcome new engines, new artists, new editorial bridges, and visual improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## License

[MIT](LICENSE)

## Acknowledgments

Taylor Swift's catalog, for being endlessly interesting to study. The Spotify, Genius, and iTunes APIs. OpenAI Whisper for making lyric synchronization possible. Sentence-BERT for making meaning computable. And the researchers behind the six papers that power this project — none of this works without their work.

## Maintenance checks

Use Node.js 22+ and Python 3.12. From the repository root:

```bash
(cd frontend && npm ci && npm run lint && npm run build && npm audit)
(cd backend && .venv/bin/python -m unittest discover -s tests -v)
```

GitHub Actions runs desktop/mobile browser smoke tests, frontend checks, and backend regression tests for changes to the application. Backend tests cover all six engines, embedding/index integrity, API validation, preview matching, and isolated Spotify sessions without requiring credentials.

Spotify playlist export requires registering the exact `SPOTIFY_REDIRECT_URI` in the Spotify developer dashboard. For local development, register `http://127.0.0.1:8000/api/spotify/callback`; Spotify does not accept `localhost` redirect URIs. Each browser tab holds its own opaque session token; Spotify tokens stay on the backend. Sessions expire after 24 hours or a backend restart, after which the user reconnects. This in-memory session store supports the current single-process deployment; multiple workers would need a shared store. Restricted Spotify artist enrichment calls fail independently so basic artist details remain available.

Lyrics expansion uses the documented LRCLIB API without a key, with exact artist matching, deduplication, source attribution, sequential throttling, and `Retry-After` handling. Genius is an optional fallback. The workflow retains existing data and reports a source outage if neither provider returns usable lyrics.

Song details preserve both title and artist, including cross-artist recordings. iTunes provides metadata and previews when Spotify is unavailable. Recommendation track lists can be downloaded as CSV without signing in; Spotify playlist creation remains an optional account connection.

The frontend includes Vercel Web Analytics. Collection requires enabling Web Analytics for the project in the Vercel dashboard.

To run browser smoke tests locally, activate the backend virtual environment, then from `frontend/` run `npx playwright install chromium`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run build`, and `npm run test:smoke`. Playwright starts both servers automatically.

The public source mirror at [updated-shubz-taylor-rec-engine](https://github.com/shubhangithub/updated-shubz-taylor-rec-engine) is synchronized after application changes and successful data refreshes. Publication uses an explicit file allowlist; internal agent notes, local credentials, and private-only inputs are excluded, and private Git history is never imported.

## Public source mirror

This repository is a sanitized source snapshot of the live application. Internal agent notes, local credentials, and private-only inputs are excluded. Production data refreshes run upstream; this copy retains a manual data workflow for reproducibility.
