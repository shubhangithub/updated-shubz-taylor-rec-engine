export interface Song {
  id: string;
  name: string;
  artist: string;
  artist_id?: string;
  album: string;
  album_id?: string;
  preview_url: string | null;
  external_url: string;
  image: string | null;
  release_date?: string;
  popularity?: number;
  features?: AudioFeatures;
  similarity?: number;
  recommendation_type?: 'algorithmic' | 'editorial';
}

export interface AudioFeatures {
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
}

export interface Atmosphere {
  mood: string;
  energy_level: number;
  emotional_valence: number;
  color_palette: string[];
  particle_type: 'embers' | 'rain' | 'fireflies' | 'stars' | 'petals' | 'snow' | 'lightning';
  atmosphere_type: 'storm' | 'golden_hour' | 'rain' | 'neon' | 'garden' | 'midnight' | 'autumn' | 'ocean';
}

export interface SongWithAtmosphere extends Song {
  atmosphere?: Atmosphere;
  lyrics?: string;
  audio_features?: Record<string, number>;
  key_mode?: string;
  explicit?: boolean;
  featuring?: string;
  editorial_bridges?: EditorialBridge[];
}

export interface EditorialBridge {
  artist: string;
  song: string;
  reason: string;
  mood: string;
  era_connection: string;
}

export interface EraTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
  description: string;
  year: number;
  aesthetic: string;
}

export interface TaylorSong {
  name: string;
  album: string;
  era: string;
  track_number: number;
  is_single: boolean;
  is_vault_track: boolean;
}

export interface ArtistInfo {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  image: string | null;
  top_tracks: Song[];
  related_artists?: ArtistInfo[];
}

export interface EraArtist {
  name: string;
  reason: string;
}

export interface ConstellationStar {
  id: string;
  name: string;
  album: string;
  era: string;
  position: [number, number, number];
  brightness: number;
  isSingle: boolean;
}

// Comparison and explainability types
export interface FeatureBreakdown {
  seed: number;
  match: number;
  closeness: number;
}

export interface ExplainableResult {
  name: string;
  artist: string;
  album?: string;
  image?: string | null;
  preview_url?: string | null;
  external_url?: string;
  similarity?: number;
  recommendation_type?: string;
  reason?: string;
  mood?: string;
  era_connection?: string;
  feature_breakdown?: Record<string, FeatureBreakdown>;
  top_factors?: string[];
  explanation?: string;
  engine_count?: number;
  engines_used?: string[];
}

export interface CompareResponse {
  seed_features: Record<string, number>;
  engines: Record<string, {
    results: ExplainableResult[];
  }>;
}

export interface EngineStats {
  catalog_size: number;
  songs_with_features: number;
  songs_with_lyrics: number;
  editorial_bridge_count: number;
  bridge_songs_count: number;
  unique_bridge_artists: number;
  catalog_coverage_pct: number;
  feature_distributions: Record<string, { mean: number; std: number; min: number; max: number }>;
}

export type Mood = 'heartbreak' | 'euphoria' | 'melancholy' | 'rage' | 'nostalgia' | 'romantic' | 'empowerment' | 'introspective';

export type Era = 'Taylor Swift' | 'Fearless' | 'Speak Now' | 'Red' | '1989' | 'reputation' | 'Lover' | 'folklore' | 'evermore' | 'Midnights' | 'The Tortured Poets Department' | 'The Life Of A Showgirl';
