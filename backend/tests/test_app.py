"""Offline regressions for the shipped dataset, API contracts and Spotify flow."""
import json
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlparse

import numpy as np
import requests
from fastapi.testclient import TestClient

from app.main import app
from app import spotify_auth as auth
from app.rec_engines import ENGINES
from app.engines.utils import interleave_results, resolve_seed_indices
from app.spotify_client import SpotifyClient, get_itunes_preview, _itunes_lookup
from app.recommender import get_full_song_data


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_read_endpoints(self):
        for path in ['/health', '/api/catalog', '/api/eras', '/api/all-song-features',
                     '/api/era-features', '/api/insights', '/api/trending', '/api/engine-stats',
                     '/api/lyrics-sync/cardigan', '/api/era/folklore', '/api/editorial/cardigan',
                     '/api/era-artists-dynamic/folklore']:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_all_engines_and_comparison(self):
        seeds = {'liked_songs': [], 'song_names': ['cardigan'], 'num_per_engine': 12}
        self.assertEqual(len(ENGINES), 6)
        for key in ENGINES:
            with self.subTest(engine=key):
                response = self.client.post('/api/engine/' + key, json=seeds)
                self.assertEqual(response.status_code, 200)
                recs = response.json()['recommendations']
                self.assertEqual(len(recs), 12)
                self.assertFalse(any(r['name'].casefold() == 'cardigan' and r['artist'] == 'Taylor Swift' for r in recs))
                self.assertTrue(all(np.isfinite(r['similarity']) for r in recs))
        compared = self.client.post('/api/compare', json=seeds)
        self.assertEqual(compared.status_code, 200)
        self.assertEqual(set(compared.json()['engines']), set(ENGINES))

    def test_validation(self):
        for count in [-1, 0, 51]:
            self.assertEqual(self.client.post('/api/engine/ncf', json={
                'liked_songs': [], 'song_names': ['cardigan'], 'num_per_engine': count}).status_code, 422)
        self.assertEqual(self.client.post('/api/engine/missing', json={'liked_songs': []}).status_code, 404)
        self.assertEqual(self.client.post('/api/spotify/create-playlist', json={'songs': ['cardigan']}).status_code, 401)
        self.assertEqual(self.client.post('/api/spotify/create-playlist', json={'songs': []}).status_code, 422)

    def test_song_endpoint_does_not_mutate_dataset(self):
        original = get_full_song_data('cardigan').copy()
        with patch('app.main.get_itunes_song', return_value={'preview_url': 'https://example.com/preview.m4a'}):
            self.assertEqual(self.client.get('/api/song-data/cardigan').status_code, 200)
        self.assertEqual(get_full_song_data('cardigan'), original)

    def test_cors(self):
        allowed = self.client.options('/api/compare', headers={
            'Origin': auth.FRONTEND_URL, 'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type'})
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.headers['access-control-allow-origin'], auth.FRONTEND_URL)
        self.assertNotIn('access-control-allow-origin', self.client.get('/health', headers={'Origin': 'https://evil.example'}).headers)

    def test_cross_artist_recording_does_not_inherit_taylor_lyrics(self):
        metadata = {'id': 'itunes-other', 'name': 'Love Story', 'artist': 'Other Artist',
                    'album': 'Other Album', 'preview_url': 'https://example.com/other.m4a'}
        with patch('app.main.get_itunes_song', return_value=metadata):
            response = self.client.get('/api/song-data/Love%20Story?artist=Other%20Artist')
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['artist'], 'Other Artist')
        self.assertNotIn('lyrics', data)
        self.assertNotIn('atmosphere', data)
        self.assertEqual(data['editorial_bridges'], [])
        self.assertEqual(self.client.get('/api/lyrics-sync/cardigan?artist=Other').status_code, 404)

    def test_embedding_index_integrity(self):
        pairs = [('lyrics_embeddings', 'lyrics_index'), ('vae_latents', 'vae_index'),
                 ('graph_embeddings', 'graph_index'), ('ncf_embeddings', 'ncf_index'),
                 ('contrastive_embeddings', 'contrastive_index')]
        root = Path(__file__).resolve().parents[1] / 'ml_data'
        for matrix, index in pairs:
            with self.subTest(matrix=matrix):
                data = np.load(root / (matrix + '.npy'))
                entries = json.loads((root / (index + '.json')).read_text())
                self.assertEqual(len(data), len(entries))
                self.assertTrue(np.isfinite(data).all())
                self.assertTrue((np.linalg.norm(data, axis=1) > 0).all())


class RecommendationTests(unittest.TestCase):
    def test_seed_collision_prefers_taylor_and_deduplicates(self):
        index = [{'name': 'Love Story', 'artist': 'Taylor Swift'},
                 {'name': 'Love Story', 'artist': 'Other Artist'}]
        self.assertEqual(resolve_seed_indices(index, [' Love Story ', 'LOVE STORY']), [0])

    def test_small_limits_and_short_pools(self):
        pool = [{'name': str(i), 'artist': artist} for i, artist in enumerate(
            ['Taylor Swift'] * 8 + ['Other Artist'] * 8)]
        for limit in [1, 2, 3, 12]:
            recs = interleave_results(pool, limit)
            self.assertEqual(len(recs), limit)
        self.assertEqual(len(interleave_results(pool[:9], 12)), 9)
        self.assertEqual(interleave_results(pool, 0), [])


class ExternalServiceTests(unittest.TestCase):
    def test_artist_survives_unavailable_optional_endpoints(self):
        client = SpotifyClient()
        client.available = True
        client.sp = Mock()
        client.sp.search.return_value = {'artists': {'items': [{'id': 'taylor', 'name': 'Taylor Swift'}]}}
        client.sp.artist_top_tracks.side_effect = Exception('403')
        client.sp.artist_related_artists.side_effect = Exception('404')
        result = client.get_artist_info('Taylor Swift')
        self.assertEqual(result['name'], 'Taylor Swift')
        self.assertEqual(result['top_tracks'], [])
        self.assertEqual(result['related_artists'], [])

    def test_itunes_uses_matching_song_and_encoded_parameters(self):
        _itunes_lookup.cache_clear()
        response = Mock()
        response.json.return_value = {'results': [
            {'artistName': 'Another Artist', 'trackName': 'cardigan', 'previewUrl': 'wrong'},
            {'artistName': 'Taylor Swift', 'trackName': 'willow', 'previewUrl': 'also-wrong'},
            {'artistName': 'Taylor Swift', 'trackName': 'cardigan', 'previewUrl': 'correct'}]}
        with patch('requests.get', return_value=response) as request:
            self.assertEqual(get_itunes_preview('cardigan'), 'correct')
            self.assertEqual(get_itunes_preview('cardigan'), 'correct')
            self.assertEqual(request.call_count, 1)
            self.assertEqual(request.call_args.kwargs['params']['term'], 'cardigan Taylor Swift')
        _itunes_lookup.cache_clear()
        response.json.return_value = {'results': [{'artistName': 'Other', 'previewUrl': 'wrong'}]}
        with patch('requests.get', return_value=response):
            self.assertIsNone(get_itunes_preview('cardigan'))


class LyricsSourceTests(unittest.TestCase):
    def setUp(self):
        from app import lyrics_sources
        lyrics_sources._next_request_at = 0
        lyrics_sources._rate_limited_until = 0

    def test_exact_artist_deduplication_and_provenance(self):
        from app.lyrics_sources import get_artist_lyrics
        response = Mock(status_code=200)
        response.json.return_value = [
            {'id': 1, 'trackName': 'New Artist - Song', 'artistName': 'New Artist', 'plainLyrics': 'lyric ' * 20},
            {'id': 2, 'trackName': 'Song', 'artistName': 'New Artist', 'plainLyrics': 'duplicate ' * 20},
            {'id': 3, 'trackName': 'Wrong', 'artistName': 'Another Artist', 'plainLyrics': 'wrong ' * 20},
            {'id': 4, 'trackName': 'Instrumental', 'artistName': 'New Artist', 'instrumental': True},
        ]
        with patch('requests.get', return_value=response) as request:
            songs = get_artist_lyrics('New Artist')
        self.assertEqual([s['name'] for s in songs], ['Song'])
        self.assertEqual(songs[0]['lyrics_source'], 'LRCLIB')
        self.assertIn('User-Agent', request.call_args.kwargs['headers'])
        self.assertEqual(request.call_args.kwargs['params'], {'q': 'New Artist'})

    def test_rate_limit_prevents_further_network_calls(self):
        from app.lyrics_sources import get_artist_lyrics
        response = Mock(status_code=429, headers={'Retry-After': '120'})
        with patch('requests.get', return_value=response) as request:
            self.assertEqual(get_artist_lyrics('One'), [])
            self.assertEqual(get_artist_lyrics('Two'), [])
        self.assertEqual(request.call_count, 1)

    def test_lrclib_works_without_genius(self):
        from ml.pipeline_expand_artists import scrape_lyrics
        songs = [{'name': 'Song', 'artist': 'Artist', 'lyrics': 'text'}]
        with patch('app.lyrics_sources.get_artist_lyrics', return_value=songs), \
             patch('ml.pipeline_expand_artists.scrape_genius_lyrics') as genius:
            self.assertEqual(scrape_lyrics('Artist'), songs)
        genius.assert_not_called()


class PipelineTests(unittest.TestCase):
    def test_manual_discovery_rerun_replaces_same_day(self):
        import tempfile
        from ml import pipeline_trending as pipeline
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'trending.json'
            with patch.object(pipeline, 'TRENDING_PATH', str(path)), \
                 patch.object(pipeline, 'ML_DATA', folder), \
                 patch.object(pipeline, 'fetch_itunes_trending', return_value=[{'name': 'cardigan'}]):
                pipeline.main()
                pipeline.main()
            history = json.loads(path.read_text())
            self.assertEqual(len(history['snapshots']), 1)
            self.assertEqual(history['metadata']['total_snapshots'], 1)

    def test_unavailable_lyrics_preserve_corpus_and_report_failure(self):
        import tempfile
        from ml import pipeline_expand_artists as pipeline
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'lyrics.json'
            original = '[{"name":"existing", "artist":"Existing Artist", "lyrics":"retained"}]'
            path.write_text(original)
            with patch.object(pipeline, 'LYRICS_PATH', str(path)), \
                 patch.object(pipeline, 'get_related_artists_spotify', return_value=['New Artist']), \
                 patch.object(pipeline, 'scrape_lyrics', return_value=[]), \
                 patch.object(pipeline.time, 'sleep'):
                with self.assertRaises(SystemExit) as error:
                    pipeline.main()
            self.assertEqual(error.exception.code, 1)
            self.assertEqual(path.read_text(), original)


class SpotifyAuthTests(unittest.TestCase):
    def setUp(self):
        auth._sessions.clear()
        auth._pending.clear()
        self.client = TestClient(app)

    def add_session(self, key='browser-a', expired=False):
        auth._sessions[key] = {'access_token': 'token-' + key, 'refresh_token': 'refresh',
            'expires_at': time.time() + (-1 if expired else 3600), 'session_expires_at': time.time() + 86400}

    def test_state_is_required_single_use_and_expires(self):
        with patch.object(auth, 'CLIENT_ID', 'test'), patch.object(auth, 'CLIENT_SECRET', 'test'):
            url = auth.get_login_url(auth.FRONTEND_URL)
        state = parse_qs(urlparse(url).query)['state'][0]
        self.assertEqual(auth.consume_state(state), auth.FRONTEND_URL)
        self.assertIsNone(auth.consume_state(state))
        auth._pending['old'] = {'origin': auth.FRONTEND_URL, 'expires_at': 0}
        self.assertIsNone(auth.consume_state('old'))
        self.assertEqual(self.client.get('/api/spotify/callback?code=x&state=missing').status_code, 400)

    def test_session_isolation(self):
        self.add_session()
        self.assertFalse(self.client.get('/api/spotify/status').json()['authenticated'])
        self.assertFalse(self.client.get('/api/spotify/status', headers={'Authorization': 'Bearer browser-b'}).json()['authenticated'])
        self.assertTrue(self.client.get('/api/spotify/status', headers={'Authorization': 'Bearer browser-a'}).json()['authenticated'])

    def test_callback_posts_session_to_validated_origin(self):
        auth._pending['valid'] = {'origin': auth.FRONTEND_URL, 'expires_at': time.time() + 60}
        with patch.object(auth, 'exchange_code', return_value='browser-a'):
            response = self.client.get('/api/spotify/callback?code=ok&state=valid')
        self.assertEqual(response.status_code, 200)
        self.assertIn('postMessage', response.text)
        self.assertIn(auth.FRONTEND_URL, response.text)
        self.assertEqual(response.headers['cache-control'], 'no-store')

    def test_refresh_token(self):
        self.add_session(expired=True)
        response = Mock()
        response.json.return_value = {'access_token': 'new', 'expires_in': 3600}
        with patch('requests.post', return_value=response):
            self.assertEqual(auth._access_token('browser-a'), 'new')

    def test_playlist_counts_confirmed_writes(self):
        self.add_session()
        search = Mock(); search.json.return_value = {'tracks': {'items': [{'uri': 'spotify:track:one'}]}}
        playlist = Mock(); playlist.json.return_value = {'id': 'playlist', 'external_urls': {'spotify': 'https://open.spotify.com/playlist/test'}}
        failed = Mock(); failed.raise_for_status.side_effect = requests.HTTPError('403')
        with patch('requests.get', return_value=search), patch('requests.post', side_effect=[playlist, failed]) as post:
            with self.assertRaises(ValueError):
                auth.create_playlist('browser-a', 'Test', '', ['cardigan'])
            self.assertTrue(post.call_args_list[0].args[0].endswith('/me/playlists'))
            self.assertTrue(post.call_args_list[1].args[0].endswith('/items'))
        success = Mock()
        with patch('requests.get', return_value=search), patch('requests.post', side_effect=[playlist, success]):
            self.assertEqual(auth.create_playlist('browser-a', 'Test', '', ['cardigan'])['tracks_added'], 1)


if __name__ == '__main__':
    unittest.main()
