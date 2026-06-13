"""
WedWish - Wedding Website Backend
FastAPI + MongoDB single-tenant wedding platform
"""
import os
import re
import uuid
import logging
import secrets
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import bcrypt
import jwt as pyjwt
import requests
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
for sub in ("gifts", "events", "hero", "story"):
    (UPLOAD_DIR / sub).mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / ".env")

# Config
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "wedwish-secret-change-me")
JWT_ALG = "HS256"
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
MAX_RESERVATIONS_PER_GUEST = int(os.environ.get("MAX_RESERVATIONS", "2"))

# Mongo
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="WedWish API")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


def make_admin_token() -> str:
    payload = {"sub": "admin", "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(days=14)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Admin auth required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("role") != "admin":
            raise HTTPException(403, "Forbidden")
        return payload
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")


async def require_guest(x_guest_token: Optional[str] = Header(None)):
    if not x_guest_token:
        raise HTTPException(401, "Guest token required")
    guest = await db.guests.find_one({"token": x_guest_token})
    if not guest:
        raise HTTPException(401, "Invalid guest token")
    return clean(guest)


async def optional_guest(x_guest_token: Optional[str] = Header(None)):
    if not x_guest_token:
        return None
    guest = await db.guests.find_one({"token": x_guest_token})
    return clean(guest) if guest else None


# ---------- Models ----------
class AdminLogin(BaseModel):
    username: str
    password: str


class GuestIdentify(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    receive_updates: bool = True


class RSVPIn(BaseModel):
    event_id: str
    status: str  # attending | maybe | declined
    guest_count: int = 1
    dietary: Optional[str] = None
    note: Optional[str] = None


class EventIn(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None  # ISO datetime
    venue_name: Optional[str] = None
    address: Optional[str] = None
    map_link: Optional[str] = None
    image_url: Optional[str] = None


class GiftIn(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[float] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None


class FundIn(BaseModel):
    name: str
    description: Optional[str] = None
    goal_amount: Optional[float] = 0
    active: bool = True


class ContributionIn(BaseModel):
    fund_id: str
    amount: float
    message: Optional[str] = None
    txn_ref: Optional[str] = None


class GuestMessageIn(BaseModel):
    message: str


class SiteSettingsIn(BaseModel):
    couple_name_1: Optional[str] = None
    couple_name_2: Optional[str] = None
    wedding_date: Optional[str] = None
    hero_image: Optional[str] = None
    story_content: Optional[str] = None
    upi_id: Optional[str] = None
    contact_info: Optional[dict] = None


class ProductImport(BaseModel):
    url: str


# ---------- Startup seeding ----------
@app.on_event("startup")
async def seed_data():
    # Site settings
    if not await db.settings.find_one({"_key": "site"}):
        await db.settings.insert_one({
            "_key": "site",
            "couple_name_1": "Ujjwal",
            "couple_name_2": "Kasturika",
            "wedding_date": (datetime.now(timezone.utc) + timedelta(days=120)).isoformat(),
            "hero_image": "https://images.pexels.com/photos/35069916/pexels-photo-35069916.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "story_content": "Our story began in a quiet bookshop in 2019. What started as a chance conversation grew into a love that has weathered late-night phone calls, long-distance trips, shared dreams and quiet mornings. We are excited to begin this next chapter together — surrounded by the people who shaped us.",
            "upi_id": "ujjwal.kasturika@upi",
            "contact_info": {
                "couple_phone": "+91 98765 43210",
                "couple_email": "ujjwal.kasturika@wedwish.in",
                "family": [
                    {"name": "Mr. & Mrs. Sharma (Ujjwal's parents)", "phone": "+91 98123 45678"},
                    {"name": "Mr. & Mrs. Das (Kasturika's parents)", "phone": "+91 98765 12345"}
                ],
                "venue_support": "+91 91234 56789"
            },
            "updated_at": now_iso()
        })

    # Sample events
    if await db.events.count_documents({}) == 0:
        base = datetime.now(timezone.utc) + timedelta(days=120)
        events = [
            ("Haldi Ceremony", "A vibrant morning of turmeric, laughter, and family blessings.",
             (base - timedelta(days=2)).replace(hour=10).isoformat(),
             "Sharma Residence", "12 Marigold Lane, Jaipur",
             "https://maps.google.com/?q=Sharma+Residence",
             "https://images.unsplash.com/photo-1681717075175-19feb7a6f664?w=940"),
            ("Mehendi Night", "Intricate henna, music and an evening that lingers.",
             (base - timedelta(days=1)).replace(hour=18).isoformat(),
             "Garden Courtyard", "Hotel Rambagh, Jaipur",
             "https://maps.google.com/?q=Hotel+Rambagh+Jaipur",
             "https://images.unsplash.com/photo-1762708590908-4b9a36dda563?w=940"),
            ("Wedding Ceremony", "The sacred vows under a canopy of marigolds.",
             base.replace(hour=19).isoformat(),
             "Rambagh Lawns", "Hotel Rambagh, Jaipur",
             "https://maps.google.com/?q=Hotel+Rambagh+Jaipur",
             "https://images.unsplash.com/photo-1621801306185-8c0ccf9c8eb8?w=940"),
            ("Reception", "An evening of toasts, dancing, and celebration.",
             (base + timedelta(days=1)).replace(hour=20).isoformat(),
             "Grand Ballroom", "ITC Rajputana, Jaipur",
             "https://maps.google.com/?q=ITC+Rajputana+Jaipur",
             "https://images.unsplash.com/photo-1646925910554-8ae45b5c7c2d?w=940"),
        ]
        for title, desc, dt, venue, addr, mlink, img in events:
            await db.events.insert_one({
                "id": new_id(), "title": title, "description": desc, "date": dt,
                "venue_name": venue, "address": addr, "map_link": mlink, "image_url": img,
                "created_at": now_iso()
            })

    # Sample funds
    if await db.funds.count_documents({}) == 0:
        for n, d, g in [
            ("Honeymoon Fund", "Help us explore Iceland's northern lights together.", 200000),
            ("New Home Fund", "Towards furnishing our first home as a married couple.", 300000),
            ("Future Travel Fund", "Saving for adventures yet to come.", 100000),
        ]:
            await db.funds.insert_one({
                "id": new_id(), "name": n, "description": d,
                "goal_amount": g, "active": True, "created_at": now_iso()
            })

    # Sample gifts
    if await db.gifts.count_documents({}) == 0:
        for t, d, p, img in [
            ("Espresso Machine", "For slow mornings together.", 24999,
             "https://images.unsplash.com/photo-1572119003128-d110c07af847?w=600"),
            ("Cookware Set", "For all our future dinner parties.", 8999,
             "https://images.unsplash.com/photo-1584990347449-a8b4ee0fff7c?w=600"),
            ("Linen Bed Set", "King-size, sage green.", 6499,
             "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600"),
            ("Hand-thrown Pottery Set", "Dinner plates from a Pondicherry studio.", 4500,
             "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600"),
            ("Indoor Plant Collection", "To bring our new home alive.", 3200,
             "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600"),
            ("Vintage Record Player", "For lazy Sunday afternoons.", 18999,
             "https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=600"),
        ]:
            await db.gifts.insert_one({
                "id": new_id(), "title": t, "description": d, "price": p,
                "product_url": None, "image_url": img, "created_at": now_iso()
            })


# ---------- Public: Settings ----------
@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"_key": "site"})
    return clean(s) if s else {}


@api.put("/admin/settings")
async def update_settings(payload: SiteSettingsIn, _=Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    await db.settings.update_one({"_key": "site"}, {"$set": update}, upsert=True)
    return await get_settings()


# ---------- Admin auth ----------
@api.post("/admin/login")
async def admin_login(body: AdminLogin):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_admin_token(), "username": ADMIN_USERNAME}


@api.get("/admin/me")
async def admin_me(_=Depends(require_admin)):
    return {"username": ADMIN_USERNAME, "role": "admin"}


# ---------- Guests ----------
@api.post("/guests/identify")
async def guests_identify(body: GuestIdentify):
    existing = await db.guests.find_one({"email": body.email.lower()})
    if existing:
        # update name/phone optionally
        await db.guests.update_one({"id": existing["id"]}, {"$set": {
            "name": body.name, "phone": body.phone,
            "receive_updates": body.receive_updates
        }})
        return {"token": existing["token"], "guest": clean({**existing, "name": body.name, "phone": body.phone})}
    guest = {
        "id": new_id(),
        "name": body.name,
        "email": body.email.lower(),
        "phone": body.phone,
        "receive_updates": body.receive_updates,
        "token": secrets.token_urlsafe(32),
        "created_at": now_iso(),
    }
    await db.guests.insert_one(guest)
    return {"token": guest["token"], "guest": clean(guest)}


@api.get("/guests/me")
async def guests_me(guest=Depends(require_guest)):
    return guest


@api.get("/admin/guests")
async def admin_guests(_=Depends(require_admin)):
    guests = await db.guests.find({}).to_list(2000)
    out = []
    for g in guests:
        g = clean(g)
        g["reservation_count"] = await db.reservations.count_documents({"guest_id": g["id"], "released": {"$ne": True}})
        contribs = await db.contributions.find({"guest_id": g["id"]}, {"_id": 0}).to_list(500)
        g["contribution_total"] = sum(c.get("amount", 0) for c in contribs)
        rsvps = await db.rsvps.find({"guest_id": g["id"]}, {"_id": 0}).to_list(500)
        g["rsvp_count"] = len(rsvps)
        out.append(g)
    return out


# ---------- Events ----------
@api.get("/events")
async def list_events():
    items = await db.events.find({}, {"_id": 0}).to_list(500)
    items.sort(key=lambda x: x.get("date") or "")
    return items


@api.post("/admin/events")
async def create_event(body: EventIn, _=Depends(require_admin)):
    e = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.events.insert_one(e)
    return clean(e)


@api.put("/admin/events/{eid}")
async def update_event(eid: str, body: EventIn, _=Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await db.events.update_one({"id": eid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return clean(await db.events.find_one({"id": eid}))


@api.delete("/admin/events/{eid}")
async def delete_event(eid: str, _=Depends(require_admin)):
    await db.events.delete_one({"id": eid})
    await db.rsvps.delete_many({"event_id": eid})
    return {"ok": True}


# ---------- RSVP ----------
@api.post("/rsvp")
async def submit_rsvp(body: RSVPIn, guest=Depends(require_guest)):
    if body.status not in {"attending", "maybe", "declined"}:
        raise HTTPException(400, "Invalid status")
    ev = await db.events.find_one({"id": body.event_id})
    if not ev:
        raise HTTPException(404, "Event not found")
    existing = await db.rsvps.find_one({"guest_id": guest["id"], "event_id": body.event_id})
    doc = {
        "id": existing["id"] if existing else new_id(),
        "guest_id": guest["id"],
        "event_id": body.event_id,
        "status": body.status,
        "guest_count": max(1, body.guest_count),
        "dietary": body.dietary,
        "note": body.note,
        "updated_at": now_iso(),
    }
    if existing:
        await db.rsvps.update_one({"id": existing["id"]}, {"$set": doc})
    else:
        doc["created_at"] = now_iso()
        await db.rsvps.insert_one(doc)
    return clean(doc)


@api.get("/rsvp/me")
async def my_rsvps(guest=Depends(require_guest)):
    items = await db.rsvps.find({"guest_id": guest["id"]}, {"_id": 0}).to_list(200)
    return items


@api.get("/admin/rsvps")
async def admin_rsvps(_=Depends(require_admin)):
    items = await db.rsvps.find({}, {"_id": 0}).to_list(2000)
    # join with guest + event
    for r in items:
        g = await db.guests.find_one({"id": r["guest_id"]}, {"_id": 0})
        e = await db.events.find_one({"id": r["event_id"]}, {"_id": 0})
        r["guest"] = g
        r["event"] = e
    return items


# ---------- Gifts / Registry ----------
async def gift_with_status(gift: dict, guest_id: Optional[str] = None) -> dict:
    g = clean(dict(gift))
    res = await db.reservations.find_one({"gift_id": g["id"], "released": {"$ne": True}})
    if not res:
        g["status"] = "available"
        g["mine"] = False
    elif res.get("purchased"):
        g["status"] = "purchased"
        g["mine"] = bool(guest_id and res["guest_id"] == guest_id)
    else:
        g["status"] = "reserved"
        g["mine"] = bool(guest_id and res["guest_id"] == guest_id)
    return g


@api.get("/gifts")
async def list_gifts(guest=Depends(optional_guest)):
    gid = guest["id"] if guest else None
    items = await db.gifts.find({}).to_list(500)
    return [await gift_with_status(g, gid) for g in items]


@api.post("/admin/gifts")
async def create_gift(body: GiftIn, _=Depends(require_admin)):
    g = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.gifts.insert_one(g)
    return await gift_with_status(g)


@api.put("/admin/gifts/{gid}")
async def update_gift(gid: str, body: GiftIn, _=Depends(require_admin)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    res = await db.gifts.update_one({"id": gid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    g = await db.gifts.find_one({"id": gid})
    return await gift_with_status(g)


@api.delete("/admin/gifts/{gid}")
async def delete_gift(gid: str, _=Depends(require_admin)):
    await db.gifts.delete_one({"id": gid})
    await db.reservations.delete_many({"gift_id": gid})
    return {"ok": True}


@api.post("/admin/gifts/import")
async def import_product(body: ProductImport, _=Depends(require_admin)):
    """Extract title/image/price from Amazon/Flipkart/generic pages."""
    try:
        r = requests.get(body.url, timeout=12, headers={
            "User-Agent": "Mozilla/5.0 (compatible; WedWish/1.0)",
            "Accept-Language": "en-IN,en;q=0.9",
        }, allow_redirects=True)
        html = r.text
        final_url = str(r.url)
        soup = BeautifulSoup(html, "lxml")

        def meta(prop):
            tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
            return tag.get("content") if tag else None

        title = None
        image = None
        price = None

        host = (final_url or body.url).lower()
        is_amazon = "amazon." in host or "amzn." in host
        is_flipkart = "flipkart." in host or "fkrt." in host

        # Title
        if is_amazon:
            tag = soup.find("span", id="productTitle")
            if tag: title = tag.get_text(strip=True)
        if not title:
            title = meta("og:title") or (soup.title.string if soup.title else None)
        if title:
            title = re.sub(r"\s+", " ", title).strip()
            # Strip Amazon's "Buy ... : Amazon.in" prefix/suffix
            title = re.sub(r"^Buy\s+", "", title, flags=re.I)
            title = re.split(r"\s*[:|]\s*Amazon\.[a-z.]+", title, maxsplit=1)[0]
            title = title[:200]

        # Image
        if is_amazon:
            img_tag = soup.find("img", id="landingImage") or soup.find("img", id="imgBlkFront")
            if img_tag:
                image = img_tag.get("data-old-hires") or img_tag.get("src")
            if not image:
                m = re.search(r'"hiRes":"(https?://[^"]+)"', html)
                if m: image = m.group(1)
            if not image:
                m = re.search(r'"large":"(https?://[^"]+)"', html)
                if m: image = m.group(1)
        if not image and is_flipkart:
            img_tag = soup.select_one("img._396cs4") or soup.select_one("img._2r_T1I") or soup.select_one("img.q6DClP")
            if img_tag:
                image = img_tag.get("src")
        if not image:
            image = meta("og:image")
        if not image:
            ls = soup.find("link", rel="image_src")
            if ls: image = ls.get("href")

        # Price
        price_text = None
        if is_amazon:
            el = soup.select_one("span.a-price span.a-offscreen") or soup.select_one("span.a-offscreen")
            if el: price_text = el.get_text(strip=True)
        if not price_text and is_flipkart:
            el = soup.select_one("div._30jeq3") or soup.select_one("div._16Jk6d")
            if el: price_text = el.get_text(strip=True)
        if not price_text:
            price_text = meta("product:price:amount") or meta("og:price:amount")
        if price_text:
            cleaned = re.sub(r"[^0-9.]", "", price_text)
            try:
                price = float(cleaned) if cleaned else None
            except Exception:
                price = None

        return {
            "title": title or "",
            "image_url": image,
            "price": price,
            "product_url": final_url or body.url,
        }
    except Exception as ex:
        raise HTTPException(400, f"Could not extract: {ex}")


@api.post("/gifts/{gid}/reserve")
async def reserve_gift(gid: str, guest=Depends(require_guest)):
    gift = await db.gifts.find_one({"id": gid})
    if not gift:
        raise HTTPException(404, "Gift not found")
    active = await db.reservations.find_one({"gift_id": gid, "released": {"$ne": True}})
    if active:
        raise HTTPException(400, "Already reserved")
    my_active = await db.reservations.count_documents({
        "guest_id": guest["id"], "released": {"$ne": True}, "purchased": {"$ne": True}
    })
    if my_active >= MAX_RESERVATIONS_PER_GUEST:
        raise HTTPException(400, f"You can only reserve {MAX_RESERVATIONS_PER_GUEST} gifts at a time")
    res = {
        "id": new_id(),
        "gift_id": gid,
        "guest_id": guest["id"],
        "purchased": False,
        "released": False,
        "created_at": now_iso(),
    }
    await db.reservations.insert_one(res)
    return await gift_with_status(gift, guest["id"])


@api.delete("/gifts/{gid}/reserve")
async def unreserve_gift(gid: str, guest=Depends(require_guest)):
    res = await db.reservations.find_one({"gift_id": gid, "released": {"$ne": True}})
    if not res:
        raise HTTPException(404, "No active reservation")
    if res["guest_id"] != guest["id"]:
        raise HTTPException(403, "Not your reservation")
    await db.reservations.update_one({"id": res["id"]}, {"$set": {"released": True, "released_at": now_iso()}})
    gift = await db.gifts.find_one({"id": gid})
    return await gift_with_status(gift, guest["id"])


@api.post("/gifts/{gid}/purchased")
async def mark_purchased(gid: str, guest=Depends(require_guest)):
    res = await db.reservations.find_one({"gift_id": gid, "released": {"$ne": True}})
    if not res:
        raise HTTPException(404, "No active reservation")
    if res["guest_id"] != guest["id"]:
        raise HTTPException(403, "Not your reservation")
    await db.reservations.update_one({"id": res["id"]}, {"$set": {"purchased": True, "purchased_at": now_iso()}})
    gift = await db.gifts.find_one({"id": gid})
    return await gift_with_status(gift, guest["id"])


@api.post("/admin/gifts/{gid}/release")
async def admin_release(gid: str, _=Depends(require_admin)):
    res = await db.reservations.find_one({"gift_id": gid, "released": {"$ne": True}})
    if res:
        await db.reservations.update_one({"id": res["id"]}, {"$set": {"released": True, "released_at": now_iso()}})
    return {"ok": True}


@api.get("/admin/gifts")
async def admin_list_gifts(_=Depends(require_admin)):
    """Admin sees reservation owners."""
    items = await db.gifts.find({}).to_list(500)
    out = []
    for g in items:
        gd = await gift_with_status(g)
        res = await db.reservations.find_one({"gift_id": gd["id"], "released": {"$ne": True}})
        if res:
            guest = await db.guests.find_one({"id": res["guest_id"]}, {"_id": 0})
            gd["reservation"] = {
                "guest_name": guest["name"] if guest else "?",
                "guest_email": guest["email"] if guest else "?",
                "purchased": res.get("purchased", False),
            }
        out.append(gd)
    return out


# ---------- Funds & Contributions ----------
@api.get("/funds")
async def list_funds():
    items = await db.funds.find({"active": True}, {"_id": 0}).to_list(100)
    for f in items:
        contribs = await db.contributions.find({"fund_id": f["id"]}, {"_id": 0}).to_list(2000)
        f["raised"] = sum(c.get("amount", 0) for c in contribs)
        f["contributor_count"] = len(contribs)
    return items


@api.post("/admin/funds")
async def create_fund(body: FundIn, _=Depends(require_admin)):
    f = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.funds.insert_one(f)
    return clean(f)


@api.put("/admin/funds/{fid}")
async def update_fund(fid: str, body: FundIn, _=Depends(require_admin)):
    await db.funds.update_one({"id": fid}, {"$set": body.model_dump()})
    return clean(await db.funds.find_one({"id": fid}))


@api.delete("/admin/funds/{fid}")
async def delete_fund(fid: str, _=Depends(require_admin)):
    await db.funds.delete_one({"id": fid})
    return {"ok": True}


@api.post("/contributions")
async def add_contribution(body: ContributionIn, guest=Depends(require_guest)):
    fund = await db.funds.find_one({"id": body.fund_id})
    if not fund:
        raise HTTPException(404, "Fund not found")
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    c = {
        "id": new_id(),
        "fund_id": body.fund_id,
        "guest_id": guest["id"],
        "amount": body.amount,
        "message": body.message,
        "txn_ref": body.txn_ref,
        "created_at": now_iso(),
    }
    await db.contributions.insert_one(c)
    return clean(c)


@api.get("/admin/contributions")
async def admin_contributions(_=Depends(require_admin)):
    items = await db.contributions.find({}, {"_id": 0}).to_list(2000)
    for c in items:
        g = await db.guests.find_one({"id": c["guest_id"]}, {"_id": 0})
        f = await db.funds.find_one({"id": c["fund_id"]}, {"_id": 0})
        c["guest"] = g
        c["fund"] = f
    return items


# ---------- Guestbook ----------
@api.post("/guestbook")
async def post_message(body: GuestMessageIn, guest=Depends(require_guest)):
    m = {
        "id": new_id(),
        "guest_id": guest["id"],
        "guest_name": guest["name"],
        "message": body.message,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(m)
    return clean(m)


@api.get("/guestbook")
async def list_messages():
    items = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ---------- Admin stats ----------
@api.get("/admin/stats")
async def admin_stats(_=Depends(require_admin)):
    total_guests = await db.guests.count_documents({})
    total_rsvps = await db.rsvps.count_documents({})
    attending = await db.rsvps.count_documents({"status": "attending"})
    reserved = await db.reservations.count_documents({"released": {"$ne": True}, "purchased": False})
    purchased = await db.reservations.count_documents({"purchased": True, "released": {"$ne": True}})
    contribs = await db.contributions.find({}, {"_id": 0, "amount": 1}).to_list(5000)
    total_amount = sum(c.get("amount", 0) for c in contribs)
    return {
        "total_guests": total_guests,
        "total_rsvps": total_rsvps,
        "attending": attending,
        "reserved_gifts": reserved,
        "purchased_gifts": purchased,
        "contribution_total": total_amount,
    }


# ---------- File upload ----------
@api.post("/admin/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("gifts"),
    _=Depends(require_admin),
):
    safe_folder = folder if folder in {"gifts", "events", "hero", "story"} else "gifts"
    ext = Path(file.filename).suffix.lower() or ".png"
    name = f"{new_id()}{ext}"
    path = UPLOAD_DIR / safe_folder / name
    content = await file.read()
    path.write_bytes(content)
    return {"url": f"/api/uploads/{safe_folder}/{name}"}


@api.get("/uploads/{folder}/{name}")
async def serve_upload(folder: str, name: str):
    p = UPLOAD_DIR / folder / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p)


# ---------- Mount ----------
app.include_router(api)

_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False if "*" in _cors_origins else True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("wedwish")


@app.on_event("shutdown")
async def shutdown():
    client.close()
