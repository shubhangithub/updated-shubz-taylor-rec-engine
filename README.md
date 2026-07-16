# The Shubz-Taylor Recommendation Engine

> Every song you love is a coordinate in a space you haven't mapped yet.

[Live Demo](https://shubz-taylor-recommendation-engine.vercel.app) · [Research Papers](#research) · [Contributing](CONTRIBUTING.md)

## What Is This

This is a music recommendation engine built around one of the most studied and obsessed-over catalogs in modern music: Taylor Swift's. But it is not a Taylor Swift fan project. It is a serious attempt to answer a deceptively hard question: *why do two songs feel the same?*

To find out, eight ML engines — seven embedding engines plus a hybrid ensemble, each grounded in a published research technique — are pointed at 1,056 songs by Taylor Swift and 80 other artists. A Sentence-BERT transformer reads lyrics as meaning, and its 2025-era counterpart (Qwen3-Embedding-0.6B) reads the *whole* song where the 2019 encoder stops after the first verse. A Variational Autoencoder compresses those 384 dimensions of feeling into 16. A node2vec graph walker roams a multi-artist song graph to discover connections no playlist algorithm would surface. An NCF-style neural pair model scores song affinity from synthetic interactions (there are no real listeners here — and this README says so rather than pretending otherwise). A Contrastive SSL head, trained with the same NT-Xent loss that taught machines to see, refines what makes two songs similar without song-level labels. A CLAP audio model is the only engine that *hears* the recordings — 30-second previews embedded into a joint audio-text space, where a mood described in words can be scored against sound. And a hybrid ensemble aggregates all seven, boosted where they agree.

The result is a 3D constellation of Taylor Swift's universe — every song a star, every connection a thread of light — with Whisper-synced karaoke, hand-written editorial bridges connecting Taylor to 53 other artists, and four data science investigations that read like magazine features.

## The Eight Engines

| Engine | Technique | Paper | What It Finds |
|--------|-----------|-------|---------------|
| **Transformer Lyrics** | Sentence-BERT embeddings (384-d) | Reimers & Gurevych, 2019 (EMNLP) | Songs that mean the same thing, even in different words |
| **Qwen3 Embeddings** | Modern LLM-based embeddings, full lyrics (1024-d) | Zhang et al., 2025 (arXiv:2506.05176) | What six years of encoder progress hears that 2019 couldn't |
| **VAE Latent Space** | beta-VAE over lyrics embeddings (384 → 16-d) | Kingma & Welling, 2013 (ICLR 2014) | The hidden structure beneath lyrical similarity |
| **Graph Node2Vec** | Second-order biased walks, p=1 q=2 (64-d) | Grover & Leskovec, 2016 (KDD) | Neighbors you would never think to visit |
| **Neural Collaborative** | NCF-style MLP pair scorer on synthetic pairs (48-d) | He et al., 2017 (WWW) — adapted, no user data | Songs whose lyrics, audio profile, and editorial bridges predict affinity |
| **CLAP Audio** | Joint audio-text embeddings of 30s previews (512-d) | Wu et al., 2023 (ICASSP) | Songs that *sound* alike — and moods scored against the audio itself |
| **Hybrid Ensemble** | Weighted rank aggregation across the 7 embedding engines | Burke, 2002 (UMUAI) | The consensus — and the disagreements — of all the others |
| **Contrastive SSL** | SimCLR-style NT-Xent on augmented lyrics (64-d) | Chen et al., 2020 (ICML); CLMR-inspired | Similarity refined without song-level labels |

Six engines implement their papers directly; the NCF and contrastive engines are honest adaptations (no real users; frozen text encoder) and are labeled as such everywhere they appear. The CLAP engine covers the songs with an available iTunes preview; preview clips are never redistributed — only derived embeddings ship. Every embedding is pre-computed and stored as numpy arrays. Runtime queries take less than 10 milliseconds.

## Quick Start

```bash
git clone https://github.com/shubhangithub/updated-shubz-taylor-rec-engine.git
cd updated-shubz-taylor-rec-engine
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
- **715 cross-artist songs** from 80 artists (Genius, plus tokenless iTunes + lyrics.ovh gathering)
- **166 editorial bridges** — hand-written connections between Taylor and 53 unique artists, each with a poetic reason
- **341 songs** with Whisper-synced lyric timings (averaging 34 timed lines per song)
- **30-second iTunes previews** resolved for most of the corpus, embedded with CLAP (audio never committed — only the derived 512-d vectors)
- **4 data science analyses** computed from real data, with real statistics and honest significance labels, zero placeholders

A weekly GitHub Actions pipeline expands the artist pool, tracks trending songs, recomputes lyrics embeddings, Whisper-syncs new songs, and refreshes the insights. Cross-artist lyrics are scraped on demand; downstream engines (VAE, NCF, Contrastive, Qwen3) are re-trained manually after corpus changes.

## Research

The papers behind the eight engines (implementations unless marked as adaptations):

1. **Reimers & Gurevych (2019)** — "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks", EMNLP-IJCNLP — [arxiv.org/abs/1908.10084](https://arxiv.org/abs/1908.10084)
2. **Zhang et al. (2025)** — "Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models" — [arxiv.org/abs/2506.05176](https://arxiv.org/abs/2506.05176)
3. **Kingma & Welling (2013)** — "Auto-Encoding Variational Bayes", ICLR 2014 — [arxiv.org/abs/1312.6114](https://arxiv.org/abs/1312.6114)
4. **Grover & Leskovec (2016)** — "node2vec: Scalable Feature Learning for Networks", KDD — [arxiv.org/abs/1607.00653](https://arxiv.org/abs/1607.00653)
5. **He et al. (2017)** — "Neural Collaborative Filtering", WWW — [arxiv.org/abs/1708.05031](https://arxiv.org/abs/1708.05031) — *adapted*: the MLP interaction function applied to song-song pairs; this project has no real user-item data
6. **Burke (2002)** — "Hybrid Recommender Systems: Survey and Experiments", User Modeling and User-Adapted Interaction 12(4) — the weighted-hybridization strategy behind the ensemble
7. **Chen et al. (2020)** — "A Simple Framework for Contrastive Learning of Visual Representations" (SimCLR), ICML — [arxiv.org/abs/2002.05709](https://arxiv.org/abs/2002.05709) — *adapted to lyrics text*, inspired by **Spijkervet & Burgoyne (2021)**, "Contrastive Learning of Musical Representations" (CLMR), ISMIR — a raw-audio method this project does not implement
8. **Wu et al. (2023)** — "Large-scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation" (CLAP), ICASSP — [arxiv.org/abs/2211.06687](https://arxiv.org/abs/2211.06687) — music checkpoint `laion/larger_clap_music`

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

Taylor Swift's catalog, for being endlessly interesting to study. The Spotify, Genius, and iTunes APIs. OpenAI Whisper for making lyric synchronization possible. Sentence-BERT for making meaning computable. And the researchers behind the papers that power this project — none of this works without their work.
