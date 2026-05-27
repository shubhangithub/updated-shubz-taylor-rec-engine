from pydantic import BaseModel
from typing import List, Optional


class SongSearchRequest(BaseModel):
    query: str
    artist: Optional[str] = None


class RecommendationRequest(BaseModel):
    liked_songs: List[str]
    target_artist: Optional[str] = None
    num_recommendations: int = 10
    mood: Optional[str] = None


class MoodRequest(BaseModel):
    mood: str
    era: Optional[str] = None
    limit: int = 20


class CrossArtistRequest(BaseModel):
    song_id: str
    limit: int = 10


class CompareRequest(BaseModel):
    liked_songs: List[str]  # Spotify track IDs
    song_names: List[str] = []  # Taylor song names for editorial lookup
    num_per_engine: int = 6


class EraRequest(BaseModel):
    era: str
