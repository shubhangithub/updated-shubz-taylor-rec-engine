'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import VaultDoor from '@/components/VaultDoor';
import NavigationHUD from '@/components/NavigationHUD';
import AudioPlayer from '@/components/AudioPlayer';
import ErasCorridor from '@/components/ErasCorridor';
import MoodRooms from '@/components/MoodRooms';
import Observatory from '@/components/Observatory';
import Bridge from '@/components/Bridge';
import RecEngine from '@/components/RecEngine';
import HowItWorks from '@/components/HowItWorks';
import Insights from '@/components/Insights';
import Trending from '@/components/Trending';
import GuidedTour from '@/components/GuidedTour';
import { ConstellationStar, SongWithAtmosphere, Song, EditorialBridge, TaylorSong, EraArtist } from '@/lib/types';
import { ERA_THEMES, ALL_ERAS } from '@/lib/eraThemes';
import { generateConstellationStars } from '@/lib/constellationData';
import * as api from '@/lib/api';
import { useBeat } from '@/lib/useBeat';

// Dynamically import heavy 3D components
const Constellation = dynamic(() => import('@/components/Constellation'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#020208]">
      <motion.div
        className="text-[#D4AF37]/30 font-display text-lg"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Loading the universe...
      </motion.div>
    </div>
  ),
});

const SongWorld = dynamic(() => import('@/components/SongWorld'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050510]">
      <motion.div
        className="text-white/30 font-display text-lg"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Entering atmosphere...
      </motion.div>
    </div>
  ),
});

type View = 'vault' | 'constellation' | 'song' | 'eras' | 'mood-rooms' | 'observatory' | 'insights' | 'bridge' | 'recommend' | 'how-it-works' | 'trending';

// Fallback catalog data when API is unavailable
const FALLBACK_CATALOG: TaylorSong[] = ALL_ERAS.flatMap(era => {
  const songs: Record<string, string[]> = {
    'Taylor Swift': ['Tim McGraw', 'Picture To Burn', 'Teardrops On My Guitar', 'A Place in this World', 'Cold As You', 'The Outside', 'Tied Together with a Smile', 'Stay Beautiful', 'Should\'ve Said No', 'Mary\'s Song', 'Our Song'],
    'Fearless': ['Fearless', 'Fifteen', 'Love Story', 'Hey Stephen', 'White Horse', 'You Belong With Me', 'Breathe', 'Tell Me Why', 'You\'re Not Sorry', 'The Way I Loved You', 'Forever & Always', 'The Best Day', 'Change'],
    'Speak Now': ['Mine', 'Sparks Fly', 'Back to December', 'Speak Now', 'Dear John', 'Mean', 'The Story of Us', 'Never Grow Up', 'Enchanted', 'Better Than Revenge', 'Innocent', 'Haunted', 'Last Kiss', 'Long Live'],
    'Red': ['State of Grace', 'Red', 'Treacherous', 'I Knew You Were Trouble', 'All Too Well', '22', 'I Almost Do', 'We Are Never Getting Back Together', 'Stay Stay Stay', 'The Last Time', 'Holy Ground', 'Sad Beautiful Tragic', 'The Lucky One', 'Everything Has Changed', 'Starlight', 'Begin Again', 'All Too Well (10 Minute Version)'],
    '1989': ['Welcome to New York', 'Blank Space', 'Style', 'Out of the Woods', 'All You Had To Do Was Stay', 'Shake It Off', 'I Wish You Would', 'Bad Blood', 'Wildest Dreams', 'How You Get the Girl', 'This Love', 'I Know Places', 'Clean', 'New Romantics'],
    'reputation': ['...Ready For It?', 'End Game', 'I Did Something Bad', 'Don\'t Blame Me', 'Delicate', 'Look What You Made Me Do', 'So It Goes...', 'Gorgeous', 'Getaway Car', 'King of My Heart', 'Dancing with Our Hands Tied', 'Dress', 'This Is Why We Can\'t Have Nice Things', 'Call It What You Want', 'New Year\'s Day'],
    'Lover': ['I Forgot That You Existed', 'Cruel Summer', 'Lover', 'The Man', 'The Archer', 'I Think He Knows', 'Miss Americana & The Heartbreak Prince', 'Paper Rings', 'Cornelia Street', 'Death By A Thousand Cuts', 'London Boy', 'Soon You\'ll Get Better', 'False God', 'You Need To Calm Down', 'Afterglow', 'ME!', 'It\'s Nice To Have A Friend', 'Daylight'],
    'folklore': ['the 1', 'cardigan', 'the last great american dynasty', 'exile', 'my tears ricochet', 'mirrorball', 'seven', 'august', 'this is me trying', 'illicit affairs', 'invisible string', 'mad woman', 'epiphany', 'betty', 'peace', 'hoax'],
    'evermore': ['willow', 'champagne problems', 'gold rush', '\'tis the damn season', 'tolerate it', 'no body, no crime', 'happiness', 'dorothea', 'coney island', 'ivy', 'cowboy like me', 'long story short', 'marjorie', 'closure', 'evermore'],
    'Midnights': ['Lavender Haze', 'Maroon', 'Anti-Hero', 'Snow on the Beach', 'You\'re On Your Own, Kid', 'Midnight Rain', 'Question...?', 'Vigilante Shit', 'Bejeweled', 'Labyrinth', 'Karma', 'Sweet Nothing', 'Mastermind'],
    'The Tortured Poets Department': ['Fortnight', 'The Tortured Poets Department', 'My Boy Only Breaks His Favorite Toys', 'Down Bad', 'So Long, London', 'But Daddy I Love Him', 'Fresh Out The Slammer', 'Florida!!!', 'Guilty as Sin?', 'Who\'s Afraid of Little Old Me?', 'I Can Fix Him (No Really I Can)', 'loml', 'I Can Do It With a Broken Heart', 'The Smallest Man Who Ever Lived', 'The Alchemy', 'Clara Bow', 'thanK you aIMee'],
    'The Life Of A Showgirl': ['The Fate of Ophelia', 'Elizabeth Taylor', 'Opalite', 'Father Figure', 'Eldest Daughter', 'Ruin The Friendship', 'Actually Romantic', 'Wi$h Li$t', 'Wood', 'Cancelled!', 'Honey', 'The Life of a Showgirl'],
  };

  const singles: Record<string, string[]> = {
    'Taylor Swift': ['Tim McGraw', 'Teardrops On My Guitar', 'Our Song', 'Picture To Burn', 'Should\'ve Said No'],
    'Fearless': ['Love Story', 'You Belong With Me', 'White Horse', 'Fifteen', 'Fearless'],
    'Speak Now': ['Mine', 'Back to December', 'Mean', 'Sparks Fly', 'The Story of Us'],
    'Red': ['We Are Never Getting Back Together', 'I Knew You Were Trouble', '22', 'Everything Has Changed', 'Red', 'Begin Again'],
    '1989': ['Shake It Off', 'Blank Space', 'Style', 'Bad Blood', 'Wildest Dreams', 'Out of the Woods', 'New Romantics'],
    'reputation': ['Look What You Made Me Do', '...Ready For It?', 'End Game', 'Delicate', 'Getaway Car'],
    'Lover': ['ME!', 'You Need To Calm Down', 'Lover', 'The Man', 'Cruel Summer'],
    'folklore': ['cardigan', 'exile', 'betty', 'august'],
    'evermore': ['willow', 'no body, no crime', 'champagne problems'],
    'Midnights': ['Anti-Hero', 'Lavender Haze', 'Bejeweled', 'Karma', 'Midnight Rain'],
    'The Tortured Poets Department': ['Fortnight', 'I Can Do It With a Broken Heart', 'Down Bad'],
    'The Life Of A Showgirl': ['Elizabeth Taylor', 'Eldest Daughter', 'The Life of a Showgirl'],
  };

  return (songs[era] || []).map((name, i) => ({
    name,
    album: era,
    era,
    track_number: i + 1,
    is_single: (singles[era] || []).includes(name),
    is_vault_track: false,
  }));
});

// Fallback mood songs
const FALLBACK_MOOD_SONGS: Record<string, string[]> = {
  heartbreak: ['All Too Well', 'All Too Well (10 Minute Version)', 'exile', 'my tears ricochet', 'champagne problems', 'Dear John', 'Last Kiss', 'Back to December', 'White Horse', 'Sad Beautiful Tragic', 'tolerate it', 'happiness', 'So Long, London', 'The Smallest Man Who Ever Lived', 'loml', 'Haunted'],
  euphoria: ['Shake It Off', '22', 'ME!', 'Cruel Summer', 'Blank Space', 'I Knew You Were Trouble', 'Bad Blood', 'Bejeweled', 'Karma', 'I Can Do It With a Broken Heart', 'Paper Rings', '...Ready For It?', 'New Romantics', 'Welcome to New York'],
  melancholy: ['cardigan', 'the 1', 'this is me trying', 'epiphany', 'hoax', 'peace', 'evermore', 'Clean', 'The Archer', 'Soon You\'ll Get Better', 'Maroon', 'Midnight Rain', 'Down Bad', 'marjorie'],
  rage: ['Look What You Made Me Do', 'I Did Something Bad', 'Better Than Revenge', 'Picture To Burn', 'Bad Blood', 'mad woman', 'Vigilante Shit', 'Who\'s Afraid of Little Old Me?', 'I Knew You Were Trouble', 'Should\'ve Said No', 'This Is Why We Can\'t Have Nice Things'],
  nostalgia: ['Tim McGraw', 'Fifteen', 'Never Grow Up', 'The Best Day', 'Long Live', 'All Too Well', 'Begin Again', '\'tis the damn season', 'dorothea', 'Starlight', 'Holy Ground', 'You\'re On Your Own, Kid', 'seven', 'marjorie', 'Daylight'],
  romantic: ['Love Story', 'Lover', 'Enchanted', 'You Belong With Me', 'Fearless', 'invisible string', 'Paper Rings', 'King of My Heart', 'Call It What You Want', 'False God', 'Dress', 'Cornelia Street', 'ivy', 'gold rush', 'Wildest Dreams'],
  empowerment: ['The Man', 'Mean', 'Shake It Off', 'You Need To Calm Down', 'ME!', 'Long Live', 'Change', 'Blank Space', 'I Can Do It With a Broken Heart', 'Bejeweled', 'Karma', 'thanK you aIMee', 'Miss Americana & The Heartbreak Prince'],
  introspective: ['this is me trying', 'mirrorball', 'The Archer', 'peace', 'Anti-Hero', 'Labyrinth', 'Snow on the Beach', 'Mastermind', 'illicit affairs', 'Delicate', 'New Year\'s Day', 'Daylight', 'Clean', 'The Tortured Poets Department', 'Guilty as Sin?'],
};

// Fallback era artists
const FALLBACK_ERA_ARTISTS: Record<string, EraArtist[]> = {
  'Taylor Swift': [
    { name: 'Kacey Musgraves', reason: 'Country storytelling roots' },
    { name: 'Carole King', reason: 'Singer-songwriter foundation' },
    { name: 'Joni Mitchell', reason: 'Confessional lyricism' },
  ],
  'Fearless': [
    { name: 'Paramore', reason: 'Pop-rock teenage anthems' },
    { name: 'Kelly Clarkson', reason: 'Powerhouse pop vocals' },
    { name: 'Colbie Caillat', reason: 'Acoustic pop warmth' },
  ],
  'Speak Now': [
    { name: 'Paramore', reason: 'Arena-ready emotional rock' },
    { name: 'Florence + The Machine', reason: 'Grand theatrical emotion' },
    { name: 'Adele', reason: 'Vocal powerhouse ballads' },
  ],
  'Red': [
    { name: 'Adele', reason: 'Heartbreak on a cinematic scale' },
    { name: 'Ed Sheeran', reason: 'Acoustic pop storytelling' },
    { name: 'The National', reason: 'Slow-burn emotional depth' },
    { name: 'Bon Iver', reason: 'Beautiful melancholy' },
  ],
  '1989': [
    { name: 'Carly Rae Jepsen', reason: 'Euphoric synth-pop perfection' },
    { name: 'CHVRCHES', reason: 'Shimmering synth-pop' },
    { name: 'Charli XCX', reason: 'Boundary-pushing pop' },
    { name: 'Robyn', reason: 'Dance-floor emotion' },
    { name: 'Bleachers', reason: 'Anthemic 80s-inspired pop' },
  ],
  'reputation': [
    { name: 'Billie Eilish', reason: 'Dark, subversive pop' },
    { name: 'The Weeknd', reason: 'Moody atmospheric R&B' },
    { name: 'Lorde', reason: 'Dark pop introspection' },
    { name: 'Arctic Monkeys', reason: 'Cool, calculated edge' },
  ],
  'Lover': [
    { name: 'Harry Styles', reason: 'Bright, warm pop-rock' },
    { name: 'HAIM', reason: 'Sunshine pop with depth' },
    { name: 'Maggie Rogers', reason: 'Nature-infused pop' },
    { name: 'Carly Rae Jepsen', reason: 'Love-drunk pop joy' },
  ],
  'folklore': [
    { name: 'Bon Iver', reason: 'Indie folk introspection' },
    { name: 'Phoebe Bridgers', reason: 'Haunting folk songwriting' },
    { name: 'Big Thief', reason: 'Raw indie storytelling' },
    { name: 'The National', reason: 'Literary melancholy' },
    { name: 'Sufjan Stevens', reason: 'Intimate emotional landscapes' },
    { name: 'Fleet Foxes', reason: 'Ethereal folk harmonies' },
  ],
  'evermore': [
    { name: 'Bon Iver', reason: 'Experimental folk warmth' },
    { name: 'The National', reason: 'Autumnal indie rock' },
    { name: 'Big Thief', reason: 'Rustic storytelling' },
    { name: 'Julien Baker', reason: 'Emotional devastation, beautiful' },
    { name: 'Lucy Dacus', reason: 'Narrative-driven indie' },
  ],
  'Midnights': [
    { name: 'Lorde', reason: 'Late-night pop introspection' },
    { name: 'Lana Del Rey', reason: 'Dreamy, atmospheric pop' },
    { name: 'SZA', reason: 'Vulnerable midnight confessions' },
    { name: 'Frank Ocean', reason: 'Nocturnal emotional R&B' },
    { name: 'Japanese Breakfast', reason: 'Shimmering synth textures' },
  ],
  'The Tortured Poets Department': [
    { name: 'Phoebe Bridgers', reason: 'Devastating emotional lyricism' },
    { name: 'Mitski', reason: 'Raw poetic expression' },
    { name: 'Fiona Apple', reason: 'Uncompromising artistic vision' },
    { name: 'Gracie Abrams', reason: 'Confessional modern pop' },
    { name: 'boygenius', reason: 'Literary rock vulnerability' },
  ],
  'The Life Of A Showgirl': [
    { name: 'Sabrina Carpenter', reason: 'Featured collaborator and pop kindred spirit' },
    { name: 'Lorde', reason: 'Fame introspection and deconstructed pop' },
    { name: 'Charli XCX', reason: 'Pop maximalism and self-aware stardom' },
    { name: 'Olivia Rodrigo', reason: 'Confessional pop from the new generation' },
    { name: 'Billie Eilish', reason: 'Subversive pop and celebrity consciousness' },
  ],
};

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('vault');
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [catalog, setCatalog] = useState<TaylorSong[]>(FALLBACK_CATALOG);
  const [stars, setStars] = useState<ConstellationStar[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<SongWithAtmosphere | null>(null);
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [editorialBridges, setEditorialBridges] = useState<EditorialBridge[]>([]);
  const [selectedBridge, setSelectedBridge] = useState<EditorialBridge | null>(null);
  const [moodSongs, setMoodSongs] = useState<Record<string, string[]>>(FALLBACK_MOOD_SONGS);
  const [eraArtists, setEraArtists] = useState<Record<string, EraArtist[]>>(FALLBACK_ERA_ARTISTS);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);

  // Beat detection — connects to audio player for visual pulse sync
  const { beatIntensity, connectAudio } = useBeat();

  // Show tour prompt on first constellation visit
  useEffect(() => {
    if (currentView === 'constellation') {
      const seen = localStorage.getItem('st-tour-prompt-seen');
      if (!seen) {
        setShowTourPrompt(true);
      }
    }
  }, [currentView]);

  const dismissTourPrompt = useCallback(() => {
    setShowTourPrompt(false);
    localStorage.setItem('st-tour-prompt-seen', '1');
  }, []);

  // Generate constellation on catalog load
  useEffect(() => {
    const generatedStars = generateConstellationStars(catalog);
    setStars(generatedStars);
  }, [catalog]);

  // Try to fetch catalog from API (fallback already set)
  useEffect(() => {
    api.getCatalog().then(data => {
      if (data && data.length > 0) setCatalog(data);
    }).catch(() => {});
  }, []);

  // Fetch the backend's curated mood song lists (fallback already set).
  // These had drifted from the backend MOOD_MAPPING because the API was never called.
  useEffect(() => {
    const moods = Object.keys(FALLBACK_MOOD_SONGS);
    Promise.all(moods.map(async (mood) => {
      const songs = await api.getMoodSongs(mood);
      return [mood, songs] as const;
    })).then(pairs => {
      const next: Record<string, string[]> = {};
      for (const [mood, songs] of pairs) {
        if (songs && songs.length > 0) next[mood] = songs;
      }
      if (Object.keys(next).length > 0) {
        setMoodSongs(prev => ({ ...prev, ...next }));
      }
    }).catch(() => {});
  }, []);

  // Fetch dynamic era artists from ML engine
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const fetchEraArtists = async () => {
      const dynamic: Record<string, EraArtist[]> = {};
      for (const era of ALL_ERAS) {
        try {
          const res = await fetch(`${url}/api/era-artists-dynamic/${encodeURIComponent(era)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.artists && data.artists.length > 0) {
              dynamic[era] = data.artists;
            }
          }
        } catch {}
      }
      if (Object.keys(dynamic).length > 0) {
        setEraArtists(prev => ({ ...prev, ...dynamic }));
      }
    };
    fetchEraArtists();
  }, []);

  // Navigation
  // Keep a ref to the current view so navigateTo can stay identity-stable.
  // (When it depended on currentView it changed on every navigation, which
  // re-triggered the guided tour's current step.)
  const currentViewRef = useRef(currentView);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  const navigateTo = useCallback((view: View) => {
    setViewHistory(prev => [...prev, currentViewRef.current]);
    setCurrentView(view);
  }, []);

  const goBack = useCallback(() => {
    const prev = viewHistory[viewHistory.length - 1];
    if (prev) {
      setViewHistory(h => h.slice(0, -1));
      setCurrentView(prev);
    }
  }, [viewHistory]);

  const canGoBack = viewHistory.length > 0 && currentView !== 'vault' && currentView !== 'constellation';

  // Monotonic id so a slow earlier load can't overwrite a newer selection
  // (two quick song clicks previously raced).
  const loadSeqRef = useRef(0);

  // Shared helper: load full song data from API
  const loadSongData = useCallback(async (songName: string, fallbackAlbum?: string) => {
    const seq = ++loadSeqRef.current;
    const isStale = () => seq !== loadSeqRef.current;
    try {
      // First try the dedicated song-data endpoint (has features + lyrics from dataset)
      const dataRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/song-data/${encodeURIComponent(songName)}`);
      let localData: any = null;
      if (dataRes.ok) {
        localData = await dataRes.json();
      }

      // Also search Spotify for album art + metadata
      const results = await api.searchSongs(songName, 'Taylor Swift');
      if (results.length > 0) {
        const songInfo = await api.getSongInfo(results[0].id);
        // Merge: Spotify data (image, urls) + local data (lyrics, features, atmosphere).
        // getSongInfo returns a blank-named stub on error, so backfill core
        // fields from local data / the requested name rather than showing "".
        const merged = { ...songInfo };
        if (!merged.name) merged.name = localData?.name || songName;
        if (!merged.artist) merged.artist = localData?.artist || 'Taylor Swift';
        if (!merged.album) merged.album = localData?.album || fallbackAlbum || '';
        if (localData) {
          if (localData.lyrics) merged.lyrics = localData.lyrics;
          if (localData.atmosphere) merged.atmosphere = localData.atmosphere;
          if (localData.danceability && (!merged.audio_features || Object.keys(merged.audio_features).length === 0)) {
            (merged as any).audio_features = {
              danceability: localData.danceability,
              energy: localData.energy,
              loudness: localData.loudness,
              speechiness: localData.speechiness,
              acousticness: localData.acousticness,
              instrumentalness: localData.instrumentalness,
              liveness: localData.liveness,
              valence: localData.valence,
              tempo: localData.tempo,
            };
          }
          if (localData.key_mode) (merged as any).key_mode = localData.key_mode;
          if (localData.explicit !== undefined) (merged as any).explicit = localData.explicit;
        }
        // Get ML-computed cross-artist recommendations instead of hardcoded bridges
        try {
          const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const recRes = await fetch(`${url}/api/engine/lyrics_transformer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_names: [songName], liked_songs: [], num_per_engine: 6 }),
          });
          if (recRes.ok) {
            const recData = await recRes.json();
            const recs = (recData.recommendations || [])
              .filter((r: any) => r.artist !== 'Taylor Swift')
              .slice(0, 4)
              .map((r: any) => ({
                artist: r.artist,
                song: r.name,
                reason: r.explanation || `${Math.round((r.similarity || 0) * 100)}% semantic lyrics match`,
                mood: '',
                era_connection: '',
              }));
            setEditorialBridges(recs);
          } else {
            setEditorialBridges([]);
          }
        } catch {
          setEditorialBridges([]);
        }
        if (isStale()) return merged;
        setSelectedSong(merged);
        setRecommendations([]);
        return merged;
      } else if (localData) {
        // No Spotify result but we have local data
        const song: any = {
          id: `local-${songName}`,
          name: localData.name || songName,
          artist: 'Taylor Swift',
          album: localData.album || fallbackAlbum || '',
          // The song-data response already carries an iTunes preview — use it
          // instead of hardcoding null (which silenced audio for local songs).
          preview_url: localData.preview_url || null,
          external_url: '',
          image: null,
          lyrics: localData.lyrics,
          atmosphere: localData.atmosphere,
          audio_features: localData.danceability ? {
            danceability: localData.danceability,
            energy: localData.energy,
            loudness: localData.loudness,
            speechiness: localData.speechiness,
            acousticness: localData.acousticness,
            instrumentalness: localData.instrumentalness,
            liveness: localData.liveness,
            valence: localData.valence,
            tempo: localData.tempo,
          } : undefined,
          key_mode: localData.key_mode,
          explicit: localData.explicit,
        };
        if (isStale()) return song;
        setSelectedSong(song);
        // Get ML-computed cross-artist recommendations instead of hardcoded bridges
        try {
          const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const recRes = await fetch(`${url}/api/engine/lyrics_transformer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_names: [songName], liked_songs: [], num_per_engine: 6 }),
          });
          if (recRes.ok) {
            const recData = await recRes.json();
            const recs = (recData.recommendations || [])
              .filter((r: any) => r.artist !== 'Taylor Swift')
              .slice(0, 4)
              .map((r: any) => ({
                artist: r.artist,
                song: r.name,
                reason: r.explanation || `${Math.round((r.similarity || 0) * 100)}% semantic lyrics match`,
                mood: '',
                era_connection: '',
              }));
            setEditorialBridges(recs);
          } else {
            setEditorialBridges([]);
          }
        } catch {
          setEditorialBridges([]);
        }
        setRecommendations([]);
        return song;
      }
    } catch (e) {
      console.error('Error loading song data:', e);
    }

    // Final fallback
    if (isStale()) return null;
    setSelectedSong({
      id: `fallback-${songName}`,
      name: songName,
      artist: 'Taylor Swift',
      album: fallbackAlbum || '',
      preview_url: null,
      external_url: '',
      image: null,
    });
    setEditorialBridges([]);
    setRecommendations([]);
    return null;
  }, []);

  // Handle star click in constellation
  const handleStarClick = useCallback(async (star: ConstellationStar) => {
    await loadSongData(star.name, star.album);
    navigateTo('song');
  }, [navigateTo, loadSongData]);

  // Handle song click from eras view
  const handleEraSongClick = useCallback(async (song: TaylorSong) => {
    await loadSongData(song.name, song.era);
    navigateTo('song');
  }, [navigateTo, loadSongData]);

  // Handle mood song click
  const handleMoodSongClick = useCallback(async (songName: string) => {
    await loadSongData(songName);
    navigateTo('song');
  }, [navigateTo, loadSongData]);

  // Handle vault open — auto-play Enchanted as the welcome song
  const handleVaultOpen = useCallback(async () => {
    setCurrentView('constellation');
    // Load Enchanted in the background for auto-play (don't navigate to it)
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${url}/api/song-data/${encodeURIComponent('Enchanted')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.preview_url) {
          // Set as selected song just for the audio player, without navigating
          setSelectedSong({
            id: 'enchanted-welcome',
            name: data.name || 'Enchanted',
            artist: 'Taylor Swift',
            album: data.album || 'Speak Now',
            preview_url: data.preview_url,
            external_url: '',
            image: null,
          });
        }
      }
    } catch {
      // Silently fail — music is a nice-to-have
    }
  }, []);

  // Handle bridge view
  const handleShowBridge = useCallback((bridge: EditorialBridge) => {
    setSelectedBridge(bridge);
    navigateTo('bridge');
  }, [navigateTo]);

  return (
    <main className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {/* Vault entry */}
        {currentView === 'vault' && (
          <motion.div key="vault" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <VaultDoor onOpen={handleVaultOpen} />
          </motion.div>
        )}

        {/* Constellation view */}
        {currentView === 'constellation' && (
          <motion.div
            key="constellation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Constellation
              stars={stars}
              onStarClick={handleStarClick}
              searchQuery={searchQuery}
              beatIntensity={beatIntensity}
            />
          </motion.div>
        )}

        {/* Song world view */}
        {currentView === 'song' && selectedSong && (
          <motion.div
            key="song"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SongWorld
              song={selectedSong}
              recommendations={recommendations}
              editorialBridges={editorialBridges}
              onBack={goBack}
              onSongSelect={async (id) => {
                try {
                  const info = await api.getSongInfo(id);
                  if (info.name) {
                    await loadSongData(info.name);
                  }
                } catch {}
              }}
            />
          </motion.div>
        )}

        {/* Eras corridor */}
        {currentView === 'eras' && (
          <motion.div
            key="eras"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ErasCorridor
              catalog={catalog}
              eraArtists={eraArtists}
              onSongClick={handleEraSongClick}
              onArtistClick={(artist) => {
                // Navigate to Recommend page — user can explore this artist's connections
                navigateTo('recommend');
              }}
            />
          </motion.div>
        )}

        {/* Mood rooms */}
        {currentView === 'mood-rooms' && (
          <motion.div
            key="mood-rooms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MoodRooms
              moodSongs={moodSongs}
              onSongClick={handleMoodSongClick}
            />
          </motion.div>
        )}

        {/* Recommend */}
        {currentView === 'recommend' && (
          <motion.div
            key="recommend"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RecEngine
              catalog={catalog}
              onSongClick={async (name) => {
                await loadSongData(name);
                navigateTo('song');
              }}
            />
          </motion.div>
        )}

        {/* Observatory */}
        {currentView === 'observatory' && (
          <motion.div
            key="observatory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Observatory onSongClick={async (name) => {
              await loadSongData(name);
              navigateTo('song');
            }} />
          </motion.div>
        )}

        {/* Insights */}
        {currentView === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Insights />
          </motion.div>
        )}

        {/* Trending */}
        {currentView === 'trending' && (
          <motion.div key="trending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Trending onSongClick={async (name) => { await loadSongData(name); navigateTo('song'); }} />
          </motion.div>
        )}

        {/* How it works */}
        {currentView === 'how-it-works' && (
          <motion.div
            key="how-it-works"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HowItWorks onBack={goBack} />
          </motion.div>
        )}

        {/* Bridge view */}
        {currentView === 'bridge' && selectedBridge && selectedSong && (
          <motion.div
            key="bridge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Bridge
              taylorSong={{
                name: selectedSong.name,
                album: selectedSong.album,
                image: selectedSong.image,
              }}
              bridge={selectedBridge}
              onExploreNext={() => goBack()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation HUD — visible on all views except vault */}
      {currentView !== 'vault' && (
        <NavigationHUD
          currentView={currentView}
          onNavigate={navigateTo}
          isSearchOpen={isSearchOpen}
          onSearchOpen={() => setIsSearchOpen(true)}
          onSearchClose={() => { setIsSearchOpen(false); setSearchQuery(''); }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          canGoBack={canGoBack}
          onBack={goBack}
          catalog={catalog}
          onSongSelect={async (song) => {
            await loadSongData(song.name, song.era);
            navigateTo('song');
          }}
          onStartTour={() => { setIsTourActive(true); dismissTourPrompt(); }}
          showTourPrompt={showTourPrompt}
          onDismissTourPrompt={dismissTourPrompt}
        />
      )}

      {/* Guided Tour */}
      <GuidedTour
        isActive={isTourActive}
        onEnd={() => setIsTourActive(false)}
        navigateTo={(view) => navigateTo(view as View)}
        loadSongData={loadSongData}
        setSearchQuery={setSearchQuery}
      />

      {/* Persistent audio player */}
      {currentView !== 'vault' && (
        <AudioPlayer
          song={selectedSong ? {
            name: selectedSong.name,
            artist: selectedSong.artist,
            album: selectedSong.album,
            image: selectedSong.image,
            preview_url: selectedSong.preview_url,
          } : null}
          enabled={audioEnabled}
          onToggle={() => setAudioEnabled(prev => !prev)}
          onAudioRef={connectAudio}
        />
      )}
    </main>
  );
}
