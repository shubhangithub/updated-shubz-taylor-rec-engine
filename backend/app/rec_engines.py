"""
Pluggable recommendation engine registry.
8 engines: 7 embedding engines plus a hybrid ensemble that aggregates them.
Each cites the paper it implements or (where noted) adapts.
"""

from typing import List, Dict, Optional, Callable
import logging

logger = logging.getLogger(__name__)

ENGINES: Dict[str, Dict] = {}


def register_engine(key, name, description, paper, color, fn):
    ENGINES[key] = {"name": name, "description": description, "paper": paper, "color": color, "fn": fn}
    logger.info(f"Registered engine: {key}")


def list_engines():
    return [{"key": k, "name": e["name"], "description": e["description"], "paper": e["paper"], "color": e["color"]} for k, e in ENGINES.items()]


def run_engine(key, song_names=None, song_ids=None, limit=10, **kwargs):
    engine = ENGINES.get(key)
    if not engine:
        return []
    try:
        return engine["fn"](song_names=song_names or [], song_ids=song_ids or [], limit=limit, **kwargs)
    except Exception as e:
        logger.error(f"Engine '{key}' failed: {e}")
        return []


def _init_engines():
    from app.engines import (lyrics_transformer, qwen3_engine, vae_engine, graph_engine,
                             ncf_engine, contrastive_engine, ensemble_engine, audio_engine)

    # Engine 1: Transformer Semantic Lyrics
    register_engine(
        key="lyrics_transformer",
        name="Transformer Lyrics",
        description="384-dim sentence embeddings of song lyrics via all-MiniLM-L6-v2 (sentence-transformers). Finds songs with similar meaning, not just similar words. 801 songs across 47 artists.",
        paper="Reimers & Gurevych (2019) 'Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks', EMNLP-IJCNLP",
        color="#E53E3E",
        fn=lambda song_names, song_ids, limit, **kw: lyrics_transformer.recommend(song_names, limit),
    )

    # Engine 2: Variational Autoencoder
    register_engine(
        key="vae_latent",
        name="VAE Latent Space",
        description="16-dim latent vectors from a beta-VAE (beta=0.1, KL warm-up) trained on the 384-dim lyrics embeddings. 24:1 compression captures non-linear semantic structure. 801 songs.",
        paper="Kingma & Welling (2013) 'Auto-Encoding Variational Bayes', ICLR 2014",
        color="#9F7AEA",
        fn=lambda song_names, song_ids, limit, **kw: vae_engine.recommend(song_names, limit),
    )

    # Engine 3: Node2Vec Graph
    register_engine(
        key="graph_node2vec",
        name="Graph Node2Vec",
        description="64-dim embeddings from second-order biased random walks (p=1, q=2) on a sparse song graph (audio similarity + era + editorial bridges; 323 Taylor songs with audio features).",
        paper="Grover & Leskovec (2016) 'node2vec: Scalable Feature Learning for Networks', KDD",
        color="#48BB78",
        fn=lambda song_names, song_ids, limit, **kw: graph_engine.recommend(song_names, limit),
    )

    # Engine 4: NCF-style neural song-pair model
    register_engine(
        key="ncf",
        name="Neural Collaborative",
        description="48-dim embeddings PCA-initialized from multi-modal features (384 lyrics + 9 audio) and fine-tuned by an MLP pair scorer on synthetic pairs (lyrics/audio similarity + editorial bridges). Adapts the paper's MLP interaction function to song-song pairs — no real users or listening data. 801 songs.",
        paper="He et al. (2017) 'Neural Collaborative Filtering', WWW — adapted (MLP interaction function; no user-item data)",
        color="#5B9BD5",
        fn=lambda song_names, song_ids, limit, **kw: ncf_engine.recommend(song_names, limit),
    )

    # Engine 5: Hybrid Ensemble (replaces static Knowledge Graph)
    register_engine(
        key="ensemble",
        name="Hybrid Ensemble",
        description="Weighted rank aggregation across the 7 embedding engines at query time. Dynamic — different results each query. Consensus-boosted (x1.3 when found by 3+ engines).",
        paper="Burke (2002) 'Hybrid Recommender Systems: Survey and Experiments', User Modeling and User-Adapted Interaction 12(4)",
        color="#ED8936",
        fn=lambda song_names, song_ids, limit, **kw: ensemble_engine.recommend(song_names, limit),
    )

    # Engine 6: Contrastive Self-Supervised Learning
    register_engine(
        key="contrastive",
        name="Contrastive SSL",
        description="64-dim SimCLR-style projections: NT-Xent loss on augmented lyrics views over a frozen MiniLM encoder. Representations robust to word dropout and line reordering. 801 songs.",
        paper="Chen et al. (2020) 'A Simple Framework for Contrastive Learning of Visual Representations' (SimCLR), ICML — inspired by Spijkervet & Burgoyne (2021) CLMR, ISMIR (raw audio)",
        color="#F687B3",
        fn=lambda song_names, song_ids, limit, **kw: contrastive_engine.recommend(song_names, limit),
    )

    # Engine 7: Modern instruction-aware embeddings (2025-era encoder)
    register_engine(
        key="qwen3_embed",
        name="Qwen3 Embeddings",
        description="1024-dim Qwen3-Embedding-0.6B vectors of the full, untruncated lyrics (32K-token context vs MiniLM's 256 wordpieces). The 2025-era counterpart to Engine 1 — same corpus, six years of encoder progress. 801 songs.",
        paper="Zhang et al. (2025) 'Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models', arXiv:2506.05176",
        color="#38B2AC",
        fn=lambda song_names, song_ids, limit, **kw: qwen3_engine.recommend(song_names, limit),
    )

    # Engine 8: CLAP audio similarity — the only engine that hears the recording.
    # Registered only when its (heavy, optional) embeddings exist, so it
    # self-activates once computed instead of showing an empty column.
    import os as _os
    _audio_emb = _os.path.join(_os.path.dirname(_os.path.dirname(__file__)),
                               'ml_data', 'audio_embeddings.npy')
    if _os.path.exists(_audio_emb):
        register_engine(
            key="clap_audio",
            name="CLAP Audio",
            description="512-dim joint audio-text embeddings of 30-second previews (laion/larger_clap_music). Song-to-song sound similarity plus text->audio mood search; covers songs with an available preview.",
            paper="Wu et al. (2023) 'Large-scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation' (CLAP), ICASSP, arXiv:2211.06687",
            color="#ECC94B",
            fn=lambda song_names, song_ids, limit, **kw: audio_engine.recommend(song_names, limit),
        )
    else:
        logger.info("CLAP audio engine not registered (ml_data/audio_embeddings.npy absent)")


try:
    _init_engines()
except Exception as e:
    logger.warning(f"Engine init deferred: {e}")
