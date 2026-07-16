# Contributing

Welcome. Whether you want to add a new recommendation engine, expand the artist universe, write editorial bridges, or make the visuals even more beautiful, this guide will get you there.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/updated-shubz-taylor-rec-engine.git
   cd updated-shubz-taylor-rec-engine
   ```
3. Create a branch from `main`:
   ```bash
   git checkout -b your-feature-name
   ```
4. Run the setup script:
   ```bash
   chmod +x setup.sh && ./setup.sh
   ```

See the [README](README.md) for full setup and running instructions.

## Ways to Contribute

### Add a New Recommendation Engine

This is the most impactful contribution. Each engine should implement a real, published technique.

1. **Create the runtime module** at `backend/app/engines/your_engine.py`
   - Implement a `recommend(song_names: list[str], limit: int) -> list[dict]` function
   - Load pre-computed embeddings from `backend/ml_data/`
   - Return results with similarity scores

2. **Create the pre-compute script** at `backend/ml/your_precompute.py`
   - Generate `.npy` embeddings and `.json` index files
   - Save outputs to `backend/ml_data/`
   - Run once: `cd backend && python -m ml.your_precompute`

3. **Register the engine** in `backend/app/rec_engines.py`
   - Use the `register_engine()` pattern to add your engine to the registry

4. **Add to the frontend** (four files):
   - `frontend/src/components/RecEngine.tsx` — Add to the `RecMode` type and `REC_MODES` array
   - `frontend/src/components/ComparisonGrid.tsx` — Add to `ENGINE_META` and `ENGINE_ORDER`, update the overlap badge denominator
   - `frontend/src/components/AgreementHeatmap.tsx` — Add to `ENGINE_META` and `ENGINE_ORDER`, update the agreement-count denominator
   - `frontend/src/components/HowItWorks.tsx` — Add a `Section` entry with your paper reference in the `PAPERS` dict and the `sections` array, and update the mind map / stats card

If your engine adapts a paper rather than implementing it (different data regime, frozen components, synthetic supervision), say so explicitly in every description — this repo labels adaptations honestly.

### Add a New Taylor Swift Era

When a new album drops, all ten of these files need updating:

1. `backend/app/taylor_data.py` — Add era to `ERA_THEMES` and songs to `TAYLOR_CATALOG`
2. `backend/app/editorial.py` — Add artists to `ERA_ARTISTS` and moods to `MOOD_MAPPING`
3. `frontend/src/lib/eraThemes.ts` — Add era to `ERA_THEMES`, `ALL_ERAS`, and `ERA_FONT_CLASSES`
4. `frontend/src/lib/constellationData.ts` — Add cluster center to `ERA_CLUSTER_CENTERS`
5. `frontend/src/components/Constellation.tsx` — Add to `ERA_CLUSTER_CENTERS` (duplicate of above)
6. `frontend/src/app/page.tsx` — Add to `FALLBACK_CATALOG`, singles list, and `FALLBACK_ERA_ARTISTS`
7. `frontend/src/components/ErasCorridor.tsx` — Add era decoration to the `decorations` object
8. `frontend/src/app/globals.css` — Add `.era-bg-{name}` and `.font-era-{name}` classes
9. `backend/app/taylor_complete.json` — Add songs with lyrics and audio features
10. Re-run lyrics embeddings: `cd backend && python -m ml.compute_lyrics_embeddings`

### Add Cross-Artist Songs

The engine discovers connections between Taylor and other artists through shared lyrical meaning.

1. Set your Genius API token: `export GENIUS_ACCESS_TOKEN=your_token`
2. Run the scraper for a new artist:
   ```bash
   cd backend && python -m ml.scrape_artist_lyrics --artist "Artist Name" --max-songs 20
   ```
3. Re-run the lyrics embeddings to include the new songs:
   ```bash
   python -m ml.compute_lyrics_embeddings
   ```
4. Optionally re-train downstream engines (VAE, NCF, Contrastive, Qwen3) that depend on the full corpus:
   ```bash
   python -m ml.train_vae && python -m ml.train_ncf && python -m ml.train_contrastive && python -m ml.compute_qwen3_embeddings
   python -m ml.download_previews && python -m ml.compute_audio_embeddings   # CLAP audio engine
   ```

### Add Editorial Bridges

Editorial bridges are hand-curated connections between Taylor Swift songs and songs by other artists, each with a poetic reason explaining *why* the two songs resonate.

1. Open `backend/app/editorial.py`
2. Add entries to the editorial bridges list with:
   - The Taylor Swift song title
   - The connected artist and song
   - A one-sentence reason (think Stripe Press tone: confident, specific, surprising)
3. Keep reasons grounded in musical or lyrical specifics, not generic sentiment

### Visual Improvements

The aesthetic is dark, luminous, and immersive. When contributing visual changes:

- **Dark always** — add light, not color. Never introduce light backgrounds.
- **Glow effects** at 10-30% opacity maximum. Restraint is the point.
- **Era colors** must come from `ERA_THEMES` in `eraThemes.ts`. Never hardcode hex values.
- **Glass effects** via the `.glass` CSS class (backdrop blur + inner glow).
- **No emojis in code** — the UI earns its atmosphere through light and motion, not icons.
- Include a screenshot in your PR for any visual change.

## Code Style

### TypeScript (Frontend)
- Strict mode enabled
- Use TypeScript interfaces from `frontend/src/lib/types.ts`
- Prefer named exports

### Python (Backend)
- Type hints on all function signatures
- Use `logging` module, never `print()`
- Docstrings on public functions

### General
- Commit messages: imperative mood, describe the change ("Add contrastive engine", not "Added contrastive engine")
- One feature per PR
- Every number in insights or blog posts must be computed from real data. Zero placeholders, ever.

## Pull Request Process

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Verify the build:
   ```bash
   # Frontend
   cd frontend && npx next build

   # Backend (syntax check)
   cd backend && python -m py_compile app/main.py
   ```
4. Open a pull request with:
   - A clear description of what you changed and why
   - Screenshots for any visual changes
   - The paper reference if adding a new engine

## Questions?

Open an [issue](https://github.com/shubhangithub/updated-shubz-taylor-rec-engine/issues). We are happy to help you find the right place to contribute.
