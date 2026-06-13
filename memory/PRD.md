# WedWish — Product Requirements Document

## Original Problem Statement
A single-tenant wedding platform for **Ujjwal & Kasturika** combining: wedding website, RSVP, gift registry, cash gift contributions, guestbook, and (future) photo gallery. Self-hostable, admin-managed.

## Tech (deviation from PRD)
- Backend: **FastAPI + MongoDB + Motor** (PRD asked Node/Express/SQLite/Prisma, but Emergent environment only supports this stack — agreed with user).
- Frontend: React (CRA) + Tailwind + shadcn/ui + lucide-react + sonner toasts.
- Auth: Admin JWT (`admin/admin123`), guests passwordless via `X-Guest-Token` header.
- File uploads: stored locally at `/app/backend/uploads/{gifts,events,hero,story}`, served via `/api/uploads/...`.

## User Personas
- **Couple/Admin** — Ujjwal & Kasturika, manage site content, gifts, events, view RSVPs and contributions.
- **Guests** — friends and family who RSVP, reserve gifts, contribute cash, leave guestbook messages.

## Implemented (Feb 2026)
- Public pages: Home (hero + countdown + previews), Our Story, Events (RSVP modal), Registry (reserve / unreserve / purchased), Cash Gifts (UPI QR + funds + contributions), Gallery (coming soon), Contact + Guestbook.
- Guest identification modal — single-step with localStorage token.
- Admin pages: Login, Dashboard with 6 stat widgets + 7 tabs (Settings, Events, Gifts, Funds, Guests, RSVPs, Contributions/Messages).
- Admin: CRUD for events/gifts/funds, image upload, product import via OG metadata, release reservation override.
- Sample data seeded on first boot (4 events, 3 funds, 6 gifts, default Ujjwal+Kasturika settings).

## Backlog
- P1: Real photo gallery with album/upload management.
- P1: Email notifications (RSVP reminders, thank-you emails) — needs email integration.
- P2: Admin export to CSV.
- P2: Multi-language support.
- P2: Detailed admin charts/analytics.

## Next Tasks
- Customize couple-specific content (real wedding date, story, UPI, contacts) via Admin → Settings.
- When closer to wedding, build out Gallery uploads.
