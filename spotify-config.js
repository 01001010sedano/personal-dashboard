// Safe to expose in a browser app. Never put a Spotify Client Secret here.
window.SPOTIFY_CONFIG = {
  clientId: 'PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE',
  redirectUri: window.location.origin + window.location.pathname.replace(/\/$/, '') + '/callback'
};
