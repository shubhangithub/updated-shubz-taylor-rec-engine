import { API_URL, apiFetch } from './connection';

const SESSION_KEY = 'spotify-session';
const authHeaders = (): Record<string, string> => {
  const session = sessionStorage.getItem(SESSION_KEY);
  return session ? { Authorization: `Bearer ${session}` } : {};
};

async function connectSpotify(): Promise<void> {
  // Open synchronously in the click handler so browsers permit the popup.
  const popup = window.open('about:blank', 'spotify-auth', 'width=500,height=700');
  if (!popup) throw new Error('Allow popups to connect Spotify.');
  try {
    const statusRes = await apiFetch(`${API_URL}/api/spotify/status`, { headers: authHeaders() });
    if (!statusRes.ok) throw new Error('Spotify connection is unavailable. Please retry.');
    const status = await statusRes.json();
    if (status.authenticated) { popup.close(); return; }
    if (!status.configured) throw new Error('Spotify export is not configured on this server.');

    await new Promise<void>((resolve, reject) => {
      let closed: ReturnType<typeof setInterval>;
      let timeout: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        clearInterval(closed);
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
      };
      const receive = (event: MessageEvent) => {
        if (event.origin !== new URL(API_URL).origin || event.source !== popup || event.data?.type !== 'spotify-auth') return;
        cleanup();
        popup.close();
        if (event.data.session) {
          sessionStorage.setItem(SESSION_KEY, event.data.session);
          resolve();
        } else reject(new Error(event.data.error || 'Spotify sign-in failed.'));
      };
      window.addEventListener('message', receive);
      closed = setInterval(() => {
        if (popup.closed) { cleanup(); reject(new Error('Spotify sign-in was cancelled.')); }
      }, 500);
      timeout = setTimeout(() => {
        cleanup(); popup.close(); reject(new Error('Spotify sign-in timed out. Please retry.'));
      }, 5 * 60_000);
      popup.location.href = `${API_URL}/api/spotify/login?origin=${encodeURIComponent(window.location.origin)}`;
    });
  } catch (error) { popup.close(); throw error; }
}

export async function exportSpotifyPlaylist(songs: string[], name: string, description: string) {
  await connectSpotify();
  const res = await apiFetch(`${API_URL}/api/spotify/create-playlist`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ songs, name, description }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) sessionStorage.removeItem(SESSION_KEY);
    const message = typeof data.detail === 'string' ? data.detail : 'Spotify could not create this playlist.';
    throw new Error(`${message} You can also download the track list without connecting Spotify.`);
  }
  return data as { playlist_url: string; tracks_added: number };
}
