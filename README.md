# Inside My Head

A free, static personal dashboard with mood-based colors, manual shows/movies tracking, pasted poster URLs/images, and a future Spotify OAuth PKCE connection.

## Deployment

This app is designed for GitHub Pages. It stores personal data in the browser's `localStorage`, so no database or paid backend is required.

Before Spotify integration, replace the placeholder `clientId` in `spotify-config.js`. This is a public Client ID for the browser app; never add a Client Secret.

## API key safety

Spotify browser apps should use OAuth Authorization Code with PKCE. The Spotify `client_id` can be public; never commit a `client_secret`. Configure the GitHub Pages URL as an allowed redirect URI in Spotify Developer Dashboard.
