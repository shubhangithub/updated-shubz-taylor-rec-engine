/** A portable track list keeps export available without a Spotify account or API. */
export function playlistCsv(songs: { name: string; artist: string }[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return '\uFEFF' + [
    ['Title', 'Artist', 'Spotify search URL'],
    ...songs.map(song => [song.name, song.artist,
      `https://open.spotify.com/search/${encodeURIComponent(`${song.name} ${song.artist}`)}`]),
  ].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
