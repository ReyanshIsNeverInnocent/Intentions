<h1 align="center">intentions</h1>

<p align="center">
  <strong>Your music, your rules.</strong><br />
  A little home for the songs you love.
</p>

<p align="center">
  <img src="https://i.ibb.co/Q3WJ4kvD/image-11.png" alt="Intentions music player banner" width="600" />
</p>

<p align="center">
  Search, lyrics, crossfade, and EQ, all in one playlist player.
</p>

<h2 align="center">Get started</h2>

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) and press play.

## Upload media

Copy `.env.example` to `.env.local` and add your Supabase secret key. Keep local media in `public/audio`, `public/lyrics`, and `public/covers`; Git ignores those files. Run `npm run upload:media` to upload them, or pass specific paths after `--`. Add new track metadata in `src/data/tracks.ts`.
