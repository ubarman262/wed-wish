"""WedWish backend API tests"""
import os, uuid, pytest, requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://wedding-registry-dev.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _identify(name, email):
    r = requests.post(f"{API}/guests/identify", json={"name": name, "email": email}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def guest1_token():
    return _identify("TEST Guest One", f"test_g1_{uuid.uuid4().hex[:6]}@example.com")


@pytest.fixture(scope="session")
def guest2_token():
    return _identify("TEST Guest Two", f"test_g2_{uuid.uuid4().hex[:6]}@example.com")


# ---------- Public endpoints ----------
def test_public_settings():
    r = requests.get(f"{API}/settings", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get("couple_name_1") == "Ujjwal"
    assert d.get("couple_name_2") == "Kasturika"


def test_public_events():
    r = requests.get(f"{API}/events", timeout=15)
    assert r.status_code == 200 and isinstance(r.json(), list)
    assert len(r.json()) >= 4


def test_public_gifts_no_token():
    r = requests.get(f"{API}/gifts", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    for g in items:
        assert "status" in g and g["status"] in {"available", "reserved", "purchased"}
        assert g["mine"] is False
        # No leaked reservation owner
        assert "reservation" not in g


def test_public_funds():
    r = requests.get(f"{API}/funds", timeout=15)
    assert r.status_code == 200 and len(r.json()) >= 3
    for f in r.json():
        assert "raised" in f


def test_public_guestbook():
    r = requests.get(f"{API}/guestbook", timeout=15)
    assert r.status_code == 200 and isinstance(r.json(), list)


# ---------- Admin auth ----------
def test_admin_login_bad():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_admin_endpoints_require_auth():
    for ep in ["/admin/stats", "/admin/rsvps", "/admin/guests", "/admin/gifts",
               "/admin/contributions"]:
        r = requests.get(f"{API}{ep}", timeout=15)
        assert r.status_code == 401, f"{ep} returned {r.status_code}"


def test_admin_stats(admin_headers):
    r = requests.get(f"{API}/admin/stats", headers=admin_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_guests", "total_rsvps", "attending", "reserved_gifts",
              "purchased_gifts", "contribution_total"]:
        assert k in d


# ---------- Guest identify ----------
def test_guest_identify_same_email_same_token():
    email = f"test_same_{uuid.uuid4().hex[:6]}@example.com"
    t1 = _identify("Name A", email)
    t2 = _identify("Name B", email)
    assert t1 == t2


# ---------- RSVP ----------
def test_rsvp_create_update_and_me(guest1_token):
    events = requests.get(f"{API}/events").json()
    eid = events[0]["id"]
    h = {"X-Guest-Token": guest1_token}
    r1 = requests.post(f"{API}/rsvp", headers=h,
                       json={"event_id": eid, "status": "attending", "guest_count": 2})
    assert r1.status_code == 200 and r1.json()["status"] == "attending"

    # Update overwrites, no duplicate
    r2 = requests.post(f"{API}/rsvp", headers=h,
                       json={"event_id": eid, "status": "maybe", "guest_count": 1})
    assert r2.status_code == 200 and r2.json()["status"] == "maybe"

    me = requests.get(f"{API}/rsvp/me", headers=h).json()
    matches = [x for x in me if x["event_id"] == eid]
    assert len(matches) == 1 and matches[0]["status"] == "maybe"


def test_rsvp_requires_guest_token():
    r = requests.post(f"{API}/rsvp", json={"event_id": "x", "status": "attending"})
    assert r.status_code == 401


# ---------- Gifts reservation ----------
def test_gift_reserve_unreserve_purchased(guest1_token, guest2_token):
    gifts = requests.get(f"{API}/gifts").json()
    # find available gift
    avail = [g for g in gifts if g["status"] == "available"]
    assert len(avail) >= 2, "Need 2 available gifts"
    g_id = avail[0]["id"]
    h1 = {"X-Guest-Token": guest1_token}
    h2 = {"X-Guest-Token": guest2_token}

    # Reserve as guest1
    r = requests.post(f"{API}/gifts/{g_id}/reserve", headers=h1)
    assert r.status_code == 200 and r.json()["status"] == "reserved" and r.json()["mine"] is True

    # Other guest sees reserved but mine=False, no leak
    listed = requests.get(f"{API}/gifts", headers=h2).json()
    target = next(g for g in listed if g["id"] == g_id)
    assert target["status"] == "reserved" and target["mine"] is False
    assert "reservation" not in target

    # Guest2 cannot unreserve guest1's gift
    r = requests.delete(f"{API}/gifts/{g_id}/reserve", headers=h2)
    assert r.status_code == 403

    # Mark purchased
    r = requests.post(f"{API}/gifts/{g_id}/purchased", headers=h1)
    assert r.status_code == 200 and r.json()["status"] == "purchased"

    # Unreserve another fresh one
    g2_id = avail[1]["id"]
    r = requests.post(f"{API}/gifts/{g2_id}/reserve", headers=h1)
    assert r.status_code == 200
    r = requests.delete(f"{API}/gifts/{g2_id}/reserve", headers=h1)
    assert r.status_code == 200 and r.json()["status"] == "available"


def test_gift_max_reservations():
    # Create fresh guest to avoid prior reservations counted
    token = _identify("TEST Maxer", f"test_max_{uuid.uuid4().hex[:6]}@example.com")
    h = {"X-Guest-Token": token}
    gifts = [g for g in requests.get(f"{API}/gifts").json() if g["status"] == "available"]
    assert len(gifts) >= 3
    ok = 0
    third_status = None
    for g in gifts[:3]:
        r = requests.post(f"{API}/gifts/{g['id']}/reserve", headers=h)
        if r.status_code == 200:
            ok += 1
        else:
            third_status = r.status_code
            break
    assert ok == 2 and third_status == 400


# ---------- Contributions ----------
def test_contribution_increases_raised(guest1_token):
    funds = requests.get(f"{API}/funds").json()
    fid = funds[0]["id"]
    before = funds[0]["raised"]
    h = {"X-Guest-Token": guest1_token}
    r = requests.post(f"{API}/contributions", headers=h,
                      json={"fund_id": fid, "amount": 1500, "message": "TEST"})
    assert r.status_code == 200
    after = next(f for f in requests.get(f"{API}/funds").json() if f["id"] == fid)["raised"]
    assert after >= before + 1500


# ---------- Guestbook ----------
def test_guestbook_post_and_list(guest1_token):
    h = {"X-Guest-Token": guest1_token}
    msg = f"TEST msg {uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/guestbook", headers=h, json={"message": msg})
    assert r.status_code == 200
    messages = requests.get(f"{API}/guestbook").json()
    assert any(m["message"] == msg for m in messages)


# ---------- Admin product import (graceful) ----------
def test_admin_product_import(admin_headers):
    r = requests.post(f"{API}/admin/gifts/import", headers=admin_headers,
                      json={"url": "https://example.com/"}, timeout=20)
    assert r.status_code in (200, 400)
    if r.status_code == 200:
        d = r.json()
        assert "title" in d and "image_url" in d


# ---------- Admin CRUD: event ----------
def test_admin_event_crud(admin_headers):
    r = requests.post(f"{API}/admin/events", headers=admin_headers,
                      json={"title": "TEST Event", "description": "x"})
    assert r.status_code == 200
    eid = r.json()["id"]
    r = requests.put(f"{API}/admin/events/{eid}", headers=admin_headers,
                     json={"title": "TEST Event Updated"})
    assert r.status_code == 200 and r.json()["title"] == "TEST Event Updated"
    r = requests.delete(f"{API}/admin/events/{eid}", headers=admin_headers)
    assert r.status_code == 200
