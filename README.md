# convive

> Tinder, but what's for dinner

A two-player dinner decider that pulls recipes from your [Mealie](https://mealie.io)
instance. Both people swipe through a deck of your actual recipes. Where both
swipe right, convive shows a match. Tap a match to see the full recipe.

Self-hosted, ad-free, works on any device with a browser. Installs as a PWA
on iOS and Android.

---

## Features

- Pulls recipes (and photos) directly from your Mealie instance
- Real-time swipe sync between two people on any devices via WebSockets
- Match reveal with full recipe detail and deep-link back to Mealie
- Mobile-first, dark, distraction-free UI
- Installable as a PWA on iOS and Android
- Tiny resource footprint (runs comfortably on a Raspberry Pi)

---

## Requirements

- A running Mealie instance (v2 or v3)
- Docker and Docker Compose
- A Mealie API token (Profile → API Tokens → Generate)

---

## Quick start

```bash
git clone https://github.com/guazzabuglio/convive.git
cd convive
cp .env.example .env
# Edit .env — set MEALIE_HOST to your Mealie address
docker compose up -d --build
```

Open `http://localhost:3000` (or whatever port you set), paste your Mealie API
token on first launch, and you're in.

### MEALIE_HOST values

| Mealie location | Value |
|---|---|
| Same machine, outside Docker | `host.docker.internal:9000` |
| Same Docker stack (service named "mealie") | `mealie:9000` |
| Different machine on your network | `192.168.1.x:9000` |

If your Mealie runs on a non-default port (e.g. 9091), adjust accordingly.

---

## How it works

1. **Host** clicks "New session" → convive fetches a random deck of 12 recipes
   from Mealie, creates a room on the WebSocket server, and shows a 5-letter
   session code.

2. **Guest** enters their name and the code → joins the same room. Both
   clients now share the same recipe deck in the same order.

3. Both swipe independently. The server tracks progress and shows each player
   how far along their partner is via dots at the top.

4. When both finish, the server computes the intersection of liked recipes
   and broadcasts the match list to both clients simultaneously.

5. Tapping a match pulls full recipe detail from Mealie (ingredients, steps,
   notes) and offers an "Open in Mealie" deep-link.

---

## Architecture

```
┌─────────────┐      ┌──────────────────────────────────┐
│   Browser   │◀────▶│  convive-client (nginx + Vite)   │
│  (React)    │      │  ─ serves static React app       │
└─────────────┘      │  ─ proxies /mealie → MEALIE_HOST │
                     │  ─ proxies /ws → convive-server  │
                     └────────────┬─────────────────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  ▼                               ▼
       ┌──────────────────┐         ┌──────────────────────┐
       │  convive-server  │         │       Mealie         │
       │   (WebSockets)   │         │  (your own instance) │
       └──────────────────┘         └──────────────────────┘
```

- The React client talks to two endpoints, both proxied through nginx:
  `/mealie/*` for REST calls to your Mealie instance, and `/ws` for the
  real-time session sync.
- The WebSocket server is a small Python service (~150 lines) that handles
  room creation, joining, swipe progress sync, and match computation.
- No database. Sessions live in memory and are cleaned up on disconnect.

---

## Remote access

By default convive only listens on your local network. To use it from outside
your home, the easiest options are:

- **[Tailscale](https://tailscale.com/)** — free private VPN, install on your
  server and devices, access via Tailscale IP. No port forwarding.
- **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)**
  — public HTTPS URL without opening ports. Works great with a custom domain.

If you go the Cloudflare Tunnel route, add Cloudflare Access (free for up to
50 users) to restrict access to specific email addresses.

---

## Development

```bash
# Backend
cd server
pip install -r requirements.txt
python server.py

# Frontend
cd client
npm install
VITE_MEALIE_URL=http://localhost:9000 npm run dev
```

Vite proxies `/mealie` → your Mealie and `/ws` → the WebSocket server. Open
`http://localhost:5173`.

---

## Project structure

```
convive/
├── docker-compose.yml
├── .env.example
├── server/
│   ├── server.py            # WebSocket session server
│   ├── requirements.txt
│   └── Dockerfile
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── nginx.conf           # Used inside the Docker container
    ├── docker-entrypoint.sh
    ├── Dockerfile
    ├── public/
    │   └── manifest.json    # PWA manifest
    └── src/
        ├── main.jsx
        ├── App.jsx          # All screens and UI
        ├── useSocket.js     # WebSocket hook
        └── mealie.js        # Mealie API helpers
```

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

Built to pair with [Mealie](https://mealie.io), a great self-hosted recipe
manager. This project has no affiliation with Mealie; it just talks to its
REST API.
