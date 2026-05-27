"""Shared utilities for recommendation engines."""
from typing import List, Dict


def diversify_results(results: List[Dict], temperature: float = 0.3) -> List[Dict]:
    """
    Add stochastic diversity to ranked results.
    Instead of deterministic top-K, sample with probability proportional
    to similarity score. Temperature controls randomness:
    - 0.0 = fully deterministic (always top-K)
    - 1.0 = fully random (uniform sampling)
    - 0.3 = mild diversity (top results dominate but not identical every time)
    """
    import numpy as np

    if len(results) <= 1 or temperature <= 0:
        return results

    # Extract similarity scores
    scores = np.array([r.get('similarity', 0.5) for r in results])

    # Apply temperature-scaled softmax
    scores = np.clip(scores, 0, 1)
    logits = scores / max(temperature, 0.01)
    exp_logits = np.exp(logits - np.max(logits))  # Numerical stability
    probs = exp_logits / exp_logits.sum()

    # Sample without replacement
    n = min(len(results), len(results))
    try:
        indices = np.random.choice(len(results), size=n, replace=False, p=probs)
    except ValueError:
        indices = np.arange(n)

    return [results[i] for i in indices]


def interleave_results(results: List[Dict], limit: int = 10) -> List[Dict]:
    """
    Given a ranked list of results, interleave Taylor and cross-artist
    so the user always sees a mix. Guarantees at least 40% cross-artist if available.
    """
    taylor = [r for r in results if r.get('artist', '') == 'Taylor Swift']
    cross = [r for r in results if r.get('artist', '') != 'Taylor Swift']

    if not cross:
        return taylor[:limit]
    if not taylor:
        return cross[:limit]

    # Guarantee at least 40% cross-artist
    cross_target = max(2, int(limit * 0.4))
    taylor_target = limit - cross_target

    # But don't exceed what we have
    cross_take = min(cross_target, len(cross))
    taylor_take = min(taylor_target, len(taylor))

    # If one side is short, give the remainder to the other
    if cross_take < cross_target:
        taylor_take = min(len(taylor), limit - cross_take)
    if taylor_take < taylor_target:
        cross_take = min(len(cross), limit - taylor_take)

    # Interleave the selected items
    merged = []
    ci, ti = 0, 0
    while len(merged) < limit and (ci < cross_take or ti < taylor_take):
        if ci < cross_take:
            merged.append(cross[ci]); ci += 1
        if ti < taylor_take and len(merged) < limit:
            merged.append(taylor[ti]); ti += 1

    return merged[:limit]
