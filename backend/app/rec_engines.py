"""
Pluggable recommendation engine registry.
5 real ML engines, each backed by a specific paper and genuinely implemented.
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
    from app.engines import lyrics_transformer, vae_engine, graph_engine, ncf_engine, contrastive_engine, ensemble_engine

    # Engine 1: Transformer Semantic Lyrics
    register_engine(
        key="lyrics_transformer",
        name="Transformer Lyrics",
        description="384-dim BERT embeddings of song lyrics via all-MiniLM-L6-v2. Finds songs with similar meaning, not just similar words.",
        paper="Reimers & Gurevych (2019) 'Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks', EMNLP",
        color="#E53E3E",
        fn=lambda song_names, song_ids, limit, **kw: lyrics_transformer.recommend(song_names, limit),
    )

    # Engine 2: Variational Autoencoder
    register_engine(
        key="vae_latent",
        name="VAE Latent Space",
        description="16-dim latent vectors from a VAE trained on 384-dim BERT lyrics embeddings. 24:1 compression captures deep semantic structure. 801 songs.",
        paper="Roberts et al. (2017) 'Hierarchical Variational Autoencoders for Music', NIPS Workshop",
        color="#9F7AEA",
        fn=lambda song_names, song_ids, limit, **kw: vae_engine.recommend(song_names, limit),
    )

    # Engine 3: Node2Vec Graph
    register_engine(
        key="graph_node2vec",
        name="Graph Node2Vec",
        description="64-dim embeddings from biased random walks on a song similarity graph. Captures multi-hop structural relationships.",
        paper="Grover & Leskovec (2016) 'node2vec: Scalable Feature Learning for Networks', KDD",
        color="#48BB78",
        fn=lambda song_names, song_ids, limit, **kw: graph_engine.recommend(song_names, limit),
    )

    # Engine 4: Neural Collaborative Filtering
    register_engine(
        key="ncf",
        name="Neural Collaborative",
        description="48-dim multi-modal embeddings from MLP trained on lyrics similarity + audio features + editorial bridges. 801 songs across 47 artists.",
        paper="He et al. (2017) 'Neural Collaborative Filtering', WWW",
        color="#5B9BD5",
        fn=lambda song_names, song_ids, limit, **kw: ncf_engine.recommend(song_names, limit),
    )

    # Engine 5: Hybrid Ensemble (replaces static Knowledge Graph)
    register_engine(
        key="ensemble",
        name="Hybrid Ensemble",
        description="Weighted rank aggregation across all 5 engines at query time. Dynamic — different results each query. Consensus-boosted.",
        paper="Burke (2002) 'Hybrid Recommender Systems: Survey and Experiments', User Modeling and User-Adapted Interaction",
        color="#ED8936",
        fn=lambda song_names, song_ids, limit, **kw: ensemble_engine.recommend(song_names, limit),
    )


    # Engine 6: Contrastive Self-Supervised Learning
    register_engine(
        key="contrastive",
        name="Contrastive SSL",
        description="64-dim SimCLR projections from contrastive learning on augmented lyrics views. Learns paraphrase-invariant representations. 801 songs.",
        paper="Spijkervet & Burgoyne (2021) 'Contrastive Learning of Musical Representations', ISMIR + Chen et al. (2020) 'SimCLR', ICML",
        color="#F687B3",
        fn=lambda song_names, song_ids, limit, **kw: contrastive_engine.recommend(song_names, limit),
    )


try:
    _init_engines()
except Exception as e:
    logger.warning(f"Engine init deferred: {e}")
