# The Shubz-Taylor Recommendation Engine

> Every song you love is a coordinate in a space you haven't mapped yet.

[Live Demo](https://shubz-taylor-recommendation-engine.vercel.app) · [Research Papers](#research) · [Contributing](CONTRIBUTING.md)

## What Is This

This is a music recommendation engine built around one of the most studied and obsessed-over catalogs in modern music: Taylor Swift's. But it is not a Taylor Swift fan project. It is a serious attempt to answer a deceptively hard question: *why do two songs feel the same?*

To find out, six independent ML engines — each implementing a real, published research technique — are pointed at 801 songs across 46 artists. A Sentence-BERT transformer reads lyrics as meaning. A Variational Autoencoder compresses 384 dimensions of feeling into 16. A Node2Vec graph walker discovers connections no playlist algorithm would surface. A Neural Collaborative Filter learns taste the way Netflix learned movies. A Knowledge Graph reasons over 561 nodes of structured musical relationships. And a Contrastive SSL model, trained with the same NT-Xent loss that taught machines to see, learns what makes two songs similar without ever being told.

The result is a 3D constellation of Taylor Swift's universe — every song a star, every connection a thread of light — with Whisper-synced karaoke, hand-written editorial bridges connecting Taylor to 53 other artists, and four data science investigations that read like magazine features.

## The Six Engines

| Engine | Technique | Paper | What It Finds |
|--------|-----------|-------|---------------|
| **Transformer Lyrics** | Sentence-BERT embeddings (384-d) | Reimers & Gurevych, 2019 | Songs that mean the same thing, even in different words |
| **VAE Latent Space** | Variational Autoencoder (384 -> 16-d) | Kingma & Welling, 2013 | The hidden structure beneath lyrical similarity |
| **Graph Node2Vec** | Biased random walks on song graphs (64-d) | Grover & Leskovec, 2016 (KDD) | Neighbors you would never think to visit |
| **Neural Collaborative** | Neural Collaborative Filtering (48-d) | He et al., 2017 (WWW) | What listeners with your taste also love |
| **Knowledge Graph** | Hybrid knowledge-based reasoning | Burke, 2000 + Afchar, 2022 | Connections through artists, eras, moods, and genres |
| **Contrastive SSL** | SimCLR-style self-supervised learning (64-d) | Spijkervet & Burgoyne, 2021 (ISMIR) | Similarity learned without labels |

All six are real implementations. Every embedding is pre-computed and stored as numpy arrays. Runtime queries take less than 10 milliseconds.

## Quick Start

```bash
git clone https://github.com/shubhangithub/shubz-taylor-rec-engine.git
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

**Frontend**: Next.js 14, TypeScript, Tailwind, Framer Motion, React Three Fiber (Three.js), Recharts
**Backend**: FastAPI, Python, uvicorn
**ML**: PyTorch, sentence-transformers, gensim, scikit-learn, networkx
**Data**: Spotify API, iTunes previews, Genius lyrics, OpenAI Whisper

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

The engine operates on a carefully assembled dataset:

- **355 Taylor Swift songs** across 12 eras (including The Life Of A Showgirl)
- **323 songs** with real Spotify audio features (9 dimensions: danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness, tempo, loudness)
- **341 songs** with full lyrics
- **460 cross-artist songs** from 46 artists, scraped via Genius
- **166 editorial bridges** — hand-written connections between Taylor and 53 unique artists, each with a poetic reason
- **341 songs** with Whisper-synced lyric timings (averaging 34 timed lines per song)
- **4 data science analyses** computed from real data, with real statistics, zero placeholders

Spotify audio features refresh weekly via GitHub Actions. Cross-artist lyrics are scraped on demand.

## Research

The six engines are implementations of these papers:

1. **Reimers & Gurevych (2019)** — "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks" — [arxiv.org/abs/1908.10084](https://arxiv.org/abs/1908.10084)
2. **Kingma & Welling (2013)** — "Auto-Encoding Variational Bayes" — [arxiv.org/abs/1312.6114](https://arxiv.org/abs/1312.6114)
3. **Grover & Leskovec (2016)** — "node2vec: Scalable Feature Learning for Networks" — [arxiv.org/abs/1607.00653](https://arxiv.org/abs/1607.00653)
4. **He et al. (2017)** — "Neural Collaborative Filtering" — [arxiv.org/abs/1708.05031](https://arxiv.org/abs/1708.05031)
5. **Burke (2000) + Afchar (2022)** — Knowledge-based and hybrid recommendation systems
6. **Spijkervet & Burgoyne (2021)** — "Contrastive Learning of Musical Representations" (ISMIR 2021)

See the [Engine page](https://shubz-taylor-recommendation-engine.vercel.app) on the live site for interactive explanations of each technique.

## Deployment

The app runs on free-tier infrastructure:

- **Frontend**: Deployed to [Vercel](https://vercel.com). Push to `main` triggers auto-deploy.
- **Backend**: Deployed to [Render](https://render.com). Auto-deploys from `main` with root directory set to `backend/`.

Note: Render's free tier spins down after 15 minutes of inactivity. First request after idle takes 30-60 seconds.

To deploy your own fork, set these environment variables:
- **Render**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- **Vercel**: `NEXT_PUBLIC_API_URL` (your Render URL)

## Contributing

New engines, new artists, new editorial bridges, and visual improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## License

[MIT](LICENSE)

## Acknowledgments

Taylor Swift's catalog, for being endlessly interesting to study. The Spotify, Genius, and iTunes APIs. OpenAI Whisper for making lyric synchronization possible. Sentence-BERT for making meaning computable. And the researchers behind the six papers that power this project — none of this works without their work.
