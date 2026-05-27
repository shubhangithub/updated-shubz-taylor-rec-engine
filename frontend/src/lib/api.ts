import axios from 'axios';
import {
  Song,
  SongWithAtmosphere,
  ArtistInfo,
  TaylorSong,
  EraTheme,
  EraArtist,
  EditorialBridge,
  CompareResponse,
  EngineStats,
} from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Development logging
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error(`[API Error] ${err.config?.url}:`, err.message);
      return Promise.reject(err);
    }
  );
}

export async function searchSongs(query: string, artist?: string): Promise<Song[]> {
  try {
    const response = await api.post('/api/search', { query, artist });
    return response.data?.results || [];
  } catch {
    return [];
  }
}

export async function getRecommendations(
  likedSongs: string[],
  targetArtist?: string,
  num?: number,
  mood?: string
): Promise<Song[]> {
  try {
    const response = await api.post('/api/recommend', {
      liked_songs: likedSongs,
      target_artist: targetArtist,
      num_recommendations: num || 10,
      mood,
    });
    return response.data?.recommendations || [];
  } catch {
    return [];
  }
}

export async function getCrossArtistRecommendations(
  songId: string,
  limit?: number
): Promise<Song[]> {
  try {
    const response = await api.post('/api/cross-artist', {
      song_id: songId,
      limit: limit || 10,
    });
    return response.data?.recommendations || [];
  } catch {
    return [];
  }
}

export async function getMoodRecommendations(
  mood: string,
  era?: string,
  limit?: number
): Promise<Song[]> {
  try {
    const response = await api.post('/api/mood', { mood, era, limit: limit || 20 });
    return response.data?.recommendations || [];
  } catch {
    return [];
  }
}

export async function getArtistInfo(artistName: string): Promise<ArtistInfo> {
  try {
    const response = await api.get(`/api/artist/${encodeURIComponent(artistName)}`);
    return response.data;
  } catch {
    return { id: '', name: artistName, genres: [], popularity: 0, image: null, top_tracks: [] };
  }
}

export async function getSongInfo(songId: string): Promise<SongWithAtmosphere> {
  try {
    const response = await api.get(`/api/song/${encodeURIComponent(songId)}`);
    return response.data;
  } catch {
    return { id: songId, name: '', artist: '', album: '', preview_url: null, external_url: '', image: null };
  }
}

export async function getCatalog(): Promise<TaylorSong[]> {
  try {
    const response = await api.get('/api/catalog');
    return response.data?.catalog || [];
  } catch {
    return [];
  }
}

export async function getEras(): Promise<Record<string, EraTheme>> {
  try {
    const response = await api.get('/api/eras');
    return response.data?.eras || {};
  } catch {
    return {};
  }
}

export async function getEra(
  eraName: string
): Promise<{ songs: TaylorSong[]; artists: EraArtist[]; theme: EraTheme }> {
  try {
    const response = await api.get(`/api/era/${encodeURIComponent(eraName)}`);
    return response.data;
  } catch {
    return {
      songs: [],
      artists: [],
      theme: { colors: { primary: '#708090', secondary: '#A9A9A9', accent: '#D3D3C7', bg: '#0f1210' }, description: '', year: 2020, aesthetic: 'default' },
    };
  }
}

export async function getEditorialBridges(songName: string): Promise<EditorialBridge[]> {
  try {
    const response = await api.get(`/api/editorial/${encodeURIComponent(songName)}`);
    return response.data?.bridges || [];
  } catch {
    return [];
  }
}

export async function getMoodSongs(mood: string): Promise<string[]> {
  try {
    const response = await api.get(`/api/mood-songs/${encodeURIComponent(mood)}`);
    return response.data?.songs || [];
  } catch {
    return [];
  }
}

export async function compareEngines(
  songIds: string[],
  songNames: string[],
  numPerEngine?: number
): Promise<CompareResponse | null> {
  try {
    const response = await api.post('/api/compare', {
      liked_songs: songIds,
      song_names: songNames,
      num_per_engine: numPerEngine || 6,
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getEngineStats(): Promise<EngineStats | null> {
  try {
    const response = await api.get('/api/engine-stats');
    return response.data;
  } catch {
    return null;
  }
}
