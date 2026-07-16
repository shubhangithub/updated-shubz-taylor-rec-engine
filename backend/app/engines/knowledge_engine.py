"""Knowledge Graph lookup over precomputed 1-3 hop editorial-bridge paths.

NOT REGISTERED as a live engine: the Hybrid Ensemble replaced it in
rec_engines.py. Kept because it serves ml_data/knowledge_graph.json
(built by ml/build_knowledge_graph.py) if re-registered. Despite the old
module name, nothing reasons at runtime — recommendations are precomputed
fixed-depth graph traversals with hard-coded per-hop confidence tiers."""
import json
import os
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

ML_DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml_data')

_graph_data = None

def _load():
    global _graph_data
    if _graph_data is not None:
        return
    path = os.path.join(ML_DATA, 'knowledge_graph.json')
    if not os.path.exists(path):
        logger.warning("Knowledge graph not found. Run: cd backend && python -m ml.build_knowledge_graph")
        _graph_data = {'recommendations': {}, 'stats': {}}
        return
    with open(path) as f:
        _graph_data = json.load(f)
    logger.info(f"Loaded knowledge graph: {_graph_data.get('stats', {})}")

def recommend(song_names: List[str], limit: int = 10, **kwargs) -> List[Dict]:
    _load()
    if not _graph_data:
        return []

    recs_db = _graph_data.get('recommendations', {})

    all_recs = []
    for name in song_names:
        song_recs = recs_db.get(name.lower(), [])
        all_recs.extend(song_recs)

    # Deduplicate, keep highest confidence
    seen = {}
    for r in all_recs:
        key = f"{r['name']}|{r.get('artist', '')}".lower()
        if key not in seen or r.get('confidence', 0) > seen[key].get('confidence', 0):
            seen[key] = r

    results = sorted(seen.values(), key=lambda x: x.get('confidence', 0), reverse=True)

    # Add similarity field for consistency
    for r in results:
        r['similarity'] = r.get('confidence', 0.5)
        if 'explanation' not in r:
            r['explanation'] = f"{r.get('hop', 1)}-hop path: {r.get('path', 'direct bridge')}"

    return results[:limit]
