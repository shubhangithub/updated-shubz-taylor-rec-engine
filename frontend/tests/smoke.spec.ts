import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('entry, recommendations, comparison, navigation and failure feedback', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('st-tour-prompt-seen', '1'));
  await page.goto('/');
  const entry = page.getByRole('button', { name: 'Enter the music universe' });
  if (isMobile) await entry.tap({ position: { x: 195, y: 422 } });
  else await entry.press('Enter');
  await page.getByRole('button', { name: 'Recommend', exact: true }).click();
  await page.getByRole('button', { name: 'cardigan', exact: true }).click();
  const response = page.waitForResponse(r => r.url().endsWith('/api/engine/lyrics_transformer') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Find via Transformer Lyrics', exact: true }).click();
  const recommendations = await (await response).json();
  expect(recommendations.count).toBe(12);
  await expect(page.getByRole('button', { name: 'Spotify Playlist', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download track list', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  const csvPath = await file.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, 'utf8');
  expect(csv).toContain('"Title","Artist","Spotify search URL"');
  expect(csv).toContain(recommendations.recommendations[0].name.replace(/"/g, '""'));

  if (!isMobile) {
    await page.getByRole('button', { name: 'Spotify Playlist', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'not configured' })).toBeVisible();
    await page.getByRole('button', { name: 'Compare All', exact: true }).click();
    const comparison = page.waitForResponse(r => r.url().endsWith('/api/compare') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Compare All 6 Engines', exact: true }).click();
    expect(Object.keys((await (await comparison).json()).engines)).toHaveLength(6);
    await expect(page.getByText('Agreement Heatmap', { exact: true })).toBeVisible();
    await expect(page.getByText('Knowledge Graph', { exact: true })).toHaveCount(0);
    const screens = [
      ['Eras', 'Taylor Swift'], ['Observatory', 'The Observatory'],
      ['Insights', 'Insights'], ['Engine', 'How It Works'], ['Trending', 'Trending Now'],
    ];
    for (const [view, heading] of screens) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'Recommend', exact: true }).click();
    await page.getByRole('button', { name: 'cardigan', exact: true }).click();
    await page.route('**/api/engine/lyrics_transformer', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.getByRole('button', { name: 'Find via Transformer Lyrics', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Recommendations could not load' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});


test('Spotify popup callback supplies the session to playlist export', async ({ page, context, isMobile }) => {
  test.skip(isMobile, 'Popup contract is covered on desktop; portable export runs on both sizes.');
  await context.route('**/api/spotify/status', route => route.fulfill({ json: { authenticated: false, configured: true } }));
  await context.route('**/api/spotify/login?**', route => route.fulfill({ contentType: 'text/html', body:
    '<script>window.opener.postMessage({type:"spotify-auth",session:"browser-test-session"},"http://127.0.0.1:3001");window.close();</script>' }));
  let authenticatedWrite = false;
  await context.route('**/api/spotify/create-playlist', route => {
    authenticatedWrite = route.request().headers().authorization === 'Bearer browser-test-session';
    return route.fulfill({ json: { playlist_url: 'https://open.spotify.com/playlist/test', tracks_added: 12 } });
  });
  await page.addInitScript(() => localStorage.setItem('st-tour-prompt-seen', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter the music universe' }).press('Enter');
  await page.getByRole('button', { name: 'Recommend', exact: true }).click();
  await page.getByRole('button', { name: 'cardigan', exact: true }).click();
  await page.getByRole('button', { name: 'Find via Transformer Lyrics', exact: true }).click();
  await page.getByRole('button', { name: 'Spotify Playlist', exact: true }).click();
  await expect(page.getByText('Playlist created! 12 tracks added', { exact: true })).toBeVisible();
  expect(authenticatedWrite).toBe(true);
});


test('a cross-artist result opens the requested recording without Spotify', async ({ page, isMobile }) => {
  await page.route('**/api/search', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/engine/lyrics_transformer', route => route.fulfill({ json: {
    recommendations: [{ name: 'Love Story', artist: 'Other Artist', similarity: 0.8 }], count: 1,
  } }));
  await page.route('**/api/song-data/Love%20Story?artist=Other%20Artist', route => route.fulfill({ json: {
    name: 'Love Story', artist: 'Other Artist', album: 'Other Album', preview_url: null,
  } }));
  await page.addInitScript(() => localStorage.setItem('st-tour-prompt-seen', '1'));
  await page.goto('/');
  const entry = page.getByRole('button', { name: 'Enter the music universe' });
  if (isMobile) await entry.tap({ position: { x: 195, y: 422 } });
  else await entry.press('Enter');
  await page.getByRole('button', { name: 'Recommend', exact: true }).click();
  await page.getByRole('button', { name: 'cardigan', exact: true }).click();
  await page.getByRole('button', { name: 'Find via Transformer Lyrics', exact: true }).click();
  const request = page.waitForRequest(r => r.url().includes('/api/song-data/Love%20Story?artist=Other%20Artist'));
  await page.getByRole('button', { name: 'Explore Love Story by Other Artist', exact: true }).click();
  await request;
  await expect(page.getByRole('heading', { name: 'Love Story', exact: true })).toBeVisible();
  await expect(page.getByText('Other Artist', { exact: true }).first()).toBeVisible();
});


test('song controls and persistent player share a single audio stream', async ({ page, isMobile }) => {
  const wav = Buffer.alloc(44 + 32000);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(32000, 40);
  const preview = `data:audio/wav;base64,${wav.toString('base64')}`;
  await page.addInitScript(() => {
    localStorage.setItem('st-tour-prompt-seen', '1');
    const NativeAudio = window.Audio;
    (window as any).__previewAudios = [];
    window.Audio = class extends NativeAudio {
      constructor(src?: string) {
        super(src);
        (window as any).__previewAudios.push(this);
      }
    };
  });
  await page.route('**/api/search', route => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/song-data/**', route => route.fulfill({ json: {
    name: 'cardigan', artist: 'Taylor Swift', album: 'folklore', preview_url: preview,
  } }));
  await page.route('**/api/engine/lyrics_transformer', route => route.fulfill({ json: {
    recommendations: [{ name: 'cardigan', artist: 'Taylor Swift', similarity: 0.8 }], count: 1,
  } }));
  await page.goto('/');
  const entry = page.getByRole('button', { name: 'Enter the music universe' });
  if (isMobile) await entry.tap({ position: { x: 195, y: 422 } });
  else await entry.press('Enter');
  await page.getByRole('button', { name: 'Recommend', exact: true }).click();
  await page.getByRole('button', { name: 'cardigan', exact: true }).click();
  await page.getByRole('button', { name: 'Find via Transformer Lyrics', exact: true }).click();
  await page.getByRole('button', { name: 'Explore cardigan by Taylor Swift', exact: true }).click();
  await page.getByRole('heading', { name: 'cardigan', exact: true }).waitFor();
  await expect.poll(() => page.evaluate(() => (window as any).__previewAudios.filter((a: HTMLAudioElement) => !a.paused).length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__previewAudios.length)).toBe(1);
  await page.getByRole('button', { name: 'Pause song preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause song preview', exact: true })).toBeVisible();
});
