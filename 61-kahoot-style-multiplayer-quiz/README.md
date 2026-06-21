# ValQuiz

Real-time multiplayer quiz app powered by React, Express, Socket.IO, and Valkey.

## Start with Docker

```bash
docker compose up --build
```

Open `http://localhost:8080`. For local development, run Valkey, copy `.env.example` to `.env`, run `npm install`, then `npm run dev` and open `http://localhost:5173`.

Rooms and reconnectable sessions persist in Valkey for 24 hours by default. Configure this with `ROOM_TTL`.
