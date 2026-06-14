# WedWish — Wedding Website, RSVP, Registry & Guest Management

Single-tenant wedding platform built with **FastAPI + MongoDB + React**.

Features
- Public wedding site: Home, Our Story, Events, Gift Registry, Cash Gifts (UPI + funds), Gallery, Contact
- Passwordless guest identification (name + email → secure token in localStorage)
- RSVP per event with attending/maybe/declined, guest count, dietary notes
- Gift registry with reserve / unreserve / mark-purchased, max-2-reservations per guest, no leakage of reserver identity to other guests
- Cash contribution funds (Honeymoon, New Home, Travel) with progress bars + UPI QR
- Guestbook
- Admin dashboard: stats, content settings, theme picker (5 wedding palettes), editable nav labels, page visibility toggles, events/gifts/funds CRUD, Amazon/Flipkart product import, image uploads
- Open Graph + Twitter Card link previews
- Automatic EXIF rotation on image upload

## Run locally with Docker

Prerequisites: **Docker** and **Docker Compose v2**.

```bash
# 1. (Optional) copy the env template
cp .env.example .env
# edit .env to your taste

# 2. Build and start everything
docker compose up -d --build

# 3. Open the site
open http://localhost:3000          # public site
open http://localhost:3000/admin    # admin (default: admin / admin123)

# 4. Logs
docker compose logs -f backend
docker compose logs -f frontend

# 5. Stop
docker compose down

# 6. Wipe data (Mongo + uploads)
docker compose down -v
```

The compose stack:

| Service   | Port  | Description                                  |
|-----------|-------|----------------------------------------------|
| frontend  | 3000  | React build served by nginx                  |
| backend   | 8001  | FastAPI + uvicorn                            |
| mongo     | -     | MongoDB 7 (internal network only)            |

Persistent volumes:
- `mongo_data` — database
- `backend_uploads` — uploaded hero/story/event/gift images

### Environment variables
Set these in `.env` (or pass via `docker compose run -e`):

| Variable                  | Default                  | Purpose                                                          |
|---------------------------|--------------------------|------------------------------------------------------------------|
| `ADMIN_USERNAME`          | `admin`                  | Admin login                                                      |
| `ADMIN_PASSWORD`          | `admin123`               | Admin login                                                      |
| `JWT_SECRET`              | `change-me-please`       | **Change in production**                                         |
| `MAX_RESERVATIONS`        | `2`                      | Active gifts per guest                                           |
| `CORS_ORIGINS`            | `http://localhost:3000`  | Comma-separated allowed origins                                  |
| `REACT_APP_BACKEND_URL`   | `http://localhost:8001`  | Backend URL baked into the React bundle (build-time)             |

### Customizing for your wedding
After `docker compose up`, log in to `/admin` and use the **Settings** tab to:
- Change couple names, wedding date, hero image, story content
- Pick a theme (Champagne Ivory, Royal Maroon, Sage Garden, Midnight Rose, Coral Sunset)
- Edit navbar labels and toggle pages on/off
- Edit section headlines
- Set UPI ID and family contact info

### Deploying to a server
1. Point a DNS A record at your server.
2. Put a reverse proxy (Caddy / Nginx / Cloudflare Tunnel) in front:
   - `https://your-domain.com/` → `http://localhost:3000`
   - `https://your-domain.com/api/*` → `http://localhost:8001`
3. Update `REACT_APP_BACKEND_URL=https://your-domain.com` and `CORS_ORIGINS=https://your-domain.com` in `.env`, then `docker compose up -d --build`.

## Run without Docker (dev mode)

Backend:
```bash
cd backend
pip install -r requirements.txt
export MONGO_URL=mongodb://localhost:27017 DB_NAME=wedwish
uvicorn server:app --reload --port 8001
```

Frontend:
```bash
cd frontend
yarn install
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
yarn start
```
