"""
Hybrid Ensemble Engine — blends all 6 embedding engines at query time.
Replaces the static Knowledge Graph with dynamic weighted rank aggregation
(Burke, 2002: weighted hybridization).
"""
import logging
from typing import List, Dict
from collections import defaultdict

logger = logging.getLogger(__name__)


def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    """Run all 6 embedding engines and merge results with weighted voting."""
    from app.engines import (lyrics_transformer, qwen3_engine, vae_engine,
                             graph_engine, ncf_engine, contrastive_engine)
    from app.editorial import get_editorial_recommendations

    # Engine weights (sum to 1.0)
    engines = [
        (lyrics_transformer, 0.25, "lyrics_transformer"),
        (qwen3_engine, 0.25, "qwen3_embed"),
        (vae_engine, 0.15, "vae_latent"),
        (contrastive_engine, 0.15, "contrastive"),
        (graph_engine, 0.10, "graph_node2vec"),
        (ncf_engine, 0.10, "ncf"),
    ]

    # Collect results from each engine
    song_scores: Dict[str, Dict] = {}  # key: "name|||artist" → accumulated score + metadata

    for engine_mod, weight, engine_name in engines:
        try:
            results = engine_mod.recommend(song_names, limit=limit * 2)
            for rank, result in enumerate(results):
                key = f"{result['name']}|||{result.get('artist', '')}".lower()

                if key not in song_scores:
                    song_scores[key] = {
                        'name': result['name'],
                        'artist': result.get('artist', 'Taylor Swift'),
                        'score': 0.0,
                        'engine_count': 0,
                        'engines': [],
                        'best_similarity': 0.0,
                    }

                # Weighted rank score: higher rank = more weight
                rank_score = weight * (1.0 - rank / max(len(results), 1))
                song_scores[key]['score'] += rank_score
                song_scores[key]['engine_count'] += 1
                song_scores[key]['engines'].append(engine_name)
                song_scores[key]['best_similarity'] = max(
                    song_scores[key]['best_similarity'],
                    result.get('similarity', 0)
                )
        except Exception as e:
            logger.warning(f"Ensemble: {engine_name} failed: {e}")

    # Boost songs found by 3+ engines
    for key, data in song_scores.items():
        if data['engine_count'] >= 3:
            data['score'] *= 1.3  # 30% boost for consensus

    # Sort by ensemble score
    ranked = sorted(song_scores.values(), key=lambda x: x['score'], reverse=True)

    # Build results with enrichment from editorial bridges
    results = []
    for item in ranked[:limit * 2]:
        # Check if an editorial bridge exists for enrichment
        reason = None
        for song_name in song_names:
            bridges = get_editorial_recommendations(song_name, limit=20)
            for bridge in bridges:
                if (bridge.get('song', '').lower() == item['name'].lower() or
                    bridge.get('artist', '').lower() == item['artist'].lower()):
                    reason = bridge.get('reason')
                    break
            if reason:
                break

        results.append({
            'name': item['name'],
            'artist': item['artist'],
            'similarity': round(item['score'], 4),
            'recommendation_type': 'ensemble',
            'explanation': reason if reason else f"Ensemble score: {round(item['score']*100)}% (found by {item['engine_count']}/6 engines: {', '.join(item['engines'][:3])})",
            'engine_count': item['engine_count'],
            'engines_used': item['engines'],
        })
        if len(results) >= limit:
            break

    return results
