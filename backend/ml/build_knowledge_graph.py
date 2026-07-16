"""
Engine 5: Knowledge Graph with multi-hop reasoning.
Builds a directed graph from editorial bridges and computes transitive recommendations
with path-based explanations.
Run once: python -m ml.build_knowledge_graph
"""
import json
import os
import networkx as nx

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml_data')

def main():
    from app.editorial import EDITORIAL_BRIDGES, ERA_ARTISTS

    with open(os.path.join(DATA_DIR, 'taylor_complete.json'), 'r') as f:
        songs = json.load(f)

    song_names = [s.get('name', '') for s in songs if s.get('danceability')]
    song_albums = {s.get('name', '').lower(): s.get('album', '') for s in songs}

    # Build directed knowledge graph
    G = nx.DiGraph()

    # Add Taylor song nodes
    for name in song_names:
        G.add_node(f"taylor:{name.lower()}", type="taylor_song", name=name, album=song_albums.get(name.lower(), ''))

    # Add bridge artist/song nodes and edges
    for taylor_song, bridges in EDITORIAL_BRIDGES.items():
        src = f"taylor:{taylor_song.lower()}"
        if src not in G:
            G.add_node(src, type="taylor_song", name=taylor_song, album=song_albums.get(taylor_song.lower(), ''))

        for bridge in bridges:
            artist = bridge['artist']
            song = bridge['song']
            target = f"ext:{artist.lower()}:{song.lower()}"

            G.add_node(target, type="external_song", name=song, artist=artist)
            G.add_node(f"artist:{artist.lower()}", type="artist", name=artist)

            # Taylor song -> external song
            G.add_edge(src, target, relation="bridges_to", reason=bridge.get('reason', ''),
                      mood=bridge.get('mood', ''), weight=1.0)
            # External song -> artist
            G.add_edge(target, f"artist:{artist.lower()}", relation="by_artist", weight=0.5)

    # Add era-artist connections
    for era, artists in ERA_ARTISTS.items():
        for artist_info in artists:
            artist_name = artist_info['name']
            artist_node = f"artist:{artist_name.lower()}"
            if artist_node not in G:
                G.add_node(artist_node, type="artist", name=artist_name)

            # Connect all Taylor songs in this era to this artist
            for name in song_names:
                if song_albums.get(name.lower(), '').lower() == era.lower():
                    src = f"taylor:{name.lower()}"
                    if not G.has_edge(src, artist_node):
                        G.add_edge(src, artist_node, relation="era_connection",
                                  reason=artist_info.get('reason', ''), weight=0.3)

    # Connect artists that share Taylor song bridges (2-hop inference)
    # If Taylor Song A -> Artist X and Taylor Song A -> Artist Y, then X is related to Y
    artist_cooccurrence = {}
    for taylor_song, bridges in EDITORIAL_BRIDGES.items():
        artists_for_song = [b['artist'].lower() for b in bridges]
        for i, a1 in enumerate(artists_for_song):
            for a2 in artists_for_song[i+1:]:
                key = tuple(sorted([a1, a2]))
                if key not in artist_cooccurrence:
                    artist_cooccurrence[key] = []
                artist_cooccurrence[key].append(taylor_song)

    for (a1, a2), shared_songs in artist_cooccurrence.items():
        n1 = f"artist:{a1}"
        n2 = f"artist:{a2}"
        if n1 in G and n2 in G:
            # G is a DiGraph and the 3-hop pass follows out_edges only, so the
            # co-bridge relation must be added in both directions to be mutual.
            reason = f"Both connected via {', '.join(shared_songs[:3])}"
            G.add_edge(n1, n2, relation="co_bridges", reason=reason, weight=0.4)
            G.add_edge(n2, n1, relation="co_bridges", reason=reason, weight=0.4)

    print(f"Knowledge graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # Pre-compute recommendations for each Taylor song
    # 1-hop: direct bridges
    # 2-hop: Taylor song -> Artist -> other songs by that artist in the graph
    # 3-hop: Taylor song -> era-connected artist -> co-bridged artist -> their songs

    recommendations = {}

    for name in song_names:
        src = f"taylor:{name.lower()}"
        if src not in G:
            continue

        recs = []

        # 1-hop: direct editorial bridges
        for _, target, data in G.out_edges(src, data=True):
            target_data = G.nodes[target]
            if target_data.get('type') == 'external_song':
                recs.append({
                    'name': target_data.get('name', ''),
                    'artist': target_data.get('artist', ''),
                    'reason': data.get('reason', ''),
                    'mood': data.get('mood', ''),
                    'hop': 1,
                    'path': f"{name} -> {target_data.get('name', '')}",
                    'confidence': 0.95,
                    'recommendation_type': 'knowledge_graph',
                })

        # 2-hop: Taylor song -> Artist -> other external songs by artists connected to same Taylor songs
        visited_artists = set()
        for _, target, data in G.out_edges(src, data=True):
            target_data = G.nodes[target]
            if target_data.get('type') == 'external_song':
                # Get this song's artist
                for _, artist_node, _ in G.out_edges(target, data=True):
                    artist_data = G.nodes.get(artist_node, {})
                    if artist_data.get('type') != 'artist':
                        continue
                    artist_name = artist_data.get('name', '')
                    if artist_name.lower() in visited_artists:
                        continue
                    visited_artists.add(artist_name.lower())

                    # Find other songs connected to this artist
                    for other_src, _, other_data in G.in_edges(artist_node, data=True):
                        other_node_data = G.nodes.get(other_src, {})
                        if other_node_data.get('type') == 'external_song':
                            other_name = other_node_data.get('name', '')
                            if other_name != target_data.get('name', ''):
                                recs.append({
                                    'name': other_name,
                                    'artist': artist_name,
                                    'reason': f"Connected through {artist_name}: {data.get('reason', '')}",
                                    'mood': data.get('mood', ''),
                                    'hop': 2,
                                    'path': f"{name} -> {target_data.get('name', '')} -> {artist_name} -> {other_name}",
                                    'confidence': 0.75,
                                    'recommendation_type': 'knowledge_graph',
                                })

        # 3-hop: through co-bridged artists
        for _, target, data in G.out_edges(src, data=True):
            target_data = G.nodes[target]
            if target_data.get('type') != 'artist':
                continue
            # Find co-bridged artists
            for _, co_artist, co_data in G.out_edges(target, data=True):
                co_data_node = G.nodes.get(co_artist, {})
                if co_data_node.get('type') != 'artist':
                    continue
                co_name = co_data_node.get('name', '')
                # Find songs by co-bridged artist
                for song_node, _ in G.in_edges(co_artist):
                    song_data = G.nodes.get(song_node, {})
                    if song_data.get('type') == 'external_song':
                        recs.append({
                            'name': song_data.get('name', ''),
                            'artist': co_name,
                            'reason': f"3-hop: {name} -> {target_data.get('name', '')} -> {co_name} (co-bridged artists)",
                            'hop': 3,
                            'path': f"{name} -> ... -> {co_name} -> {song_data.get('name', '')}",
                            'confidence': 0.55,
                            'recommendation_type': 'knowledge_graph',
                        })

        # Deduplicate by song+artist, keep highest confidence
        seen = {}
        for r in recs:
            key = f"{r['name']}|{r['artist']}".lower()
            if key not in seen or r['confidence'] > seen[key]['confidence']:
                seen[key] = r

        recommendations[name.lower()] = sorted(seen.values(), key=lambda x: x['confidence'], reverse=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, 'knowledge_graph.json'), 'w') as f:
        json.dump({
            'stats': {
                'nodes': G.number_of_nodes(),
                'edges': G.number_of_edges(),
                'taylor_songs': len([n for n, d in G.nodes(data=True) if d.get('type') == 'taylor_song']),
                'external_songs': len([n for n, d in G.nodes(data=True) if d.get('type') == 'external_song']),
                'artists': len([n for n, d in G.nodes(data=True) if d.get('type') == 'artist']),
            },
            'recommendations': recommendations,
        }, f, indent=2)

    total_recs = sum(len(v) for v in recommendations.values())
    print(f"Pre-computed {total_recs} recommendations for {len(recommendations)} songs")
    print(f"Saved to ml_data/knowledge_graph.json")

if __name__ == '__main__':
    main()
