import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, resolveImage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut, Plus, Trash2, Edit, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const Stat = ({ label, value, testId }) => (
  <div className="wed-card p-5" data-testid={testId}>
    <div className="wed-overline">{label}</div>
    <div className="font-serif text-4xl mt-2 gold-text">{value}</div>
  </div>
);

const sectionTitle = (t) => <h2 className="font-serif text-2xl mb-5">{t}</h2>;

export default function AdminDashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [funds, setFunds] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rsvps, setRsvps] = useState([]);
  const [contribs, setContribs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");

  // Modal states
  const [editEvent, setEditEvent] = useState(null);
  const [editGift, setEditGift] = useState(null);
  const [editFund, setEditFund] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // {type, id, label}

  const token = typeof window !== "undefined" ? localStorage.getItem("wedwish_admin_token") : null;
  useEffect(() => {
    if (!token) { nav("/admin"); return; }
    loadAll();
  }, []);

  useEffect(() => {
    const t = settings.theme || "champagne";
    const themeColors = {
      champagne: "#FAF9F6",
      maroon: "#F7F2EB",
      sage: "#F5F5EE",
      midnight: "#171C26",
      coral: "#F8EFE6",
    };
    if (t === "champagne") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", themeColors[t] || themeColors.champagne);
  }, [settings.theme]);

  const loadAll = async () => {
    try {
      const [s, st, ev, gf, fd, gs, rv, cb, ms] = await Promise.all([
        api.get("/settings"),
        api.get("/admin/stats"),
        api.get("/events"),
        api.get("/admin/gifts"),
        api.get("/funds"),
        api.get("/admin/guests"),
        api.get("/admin/rsvps"),
        api.get("/admin/contributions"),
        api.get("/guestbook"),
      ]);
      setSettings(s.data || {});
      setStats(st.data || {});
      setEvents(ev.data || []);
      setGifts(gf.data || []);
      setFunds(fd.data || []);
      setGuests(gs.data || []);
      setRsvps(rv.data || []);
      setContribs(cb.data || []);
      setMessages(ms.data || []);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("wedwish_admin_token");
        nav("/admin");
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("wedwish_admin_token");
    nav("/admin");
  };

  const saveSettings = async () => {
    try {
      await api.put("/admin/settings", settings);
      toast.success("Settings saved");
    } catch { toast.error("Save failed"); }
  };

  const uploadImage = async (file, folder = "gifts") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return data.url;
  };

  // Events
  const saveEvent = async (data) => {
    try {
      if (data.id) await api.put(`/admin/events/${data.id}`, data);
      else await api.post("/admin/events", data);
      toast.success("Event saved");
      setEditEvent(null);
      loadAll();
    } catch { toast.error("Save failed"); }
  };
  const deleteEvent = (id, label) => setConfirmDel({ type: "event", id, label });
  const deleteGift = (id, label) => setConfirmDel({ type: "gift", id, label });
  const deleteFund = (id, label) => setConfirmDel({ type: "fund", id, label });

  const doDelete = async () => {
    if (!confirmDel) return;
    const path = { event: "events", gift: "gifts", fund: "funds" }[confirmDel.type];
    try {
      await api.delete(`/admin/${path}/${confirmDel.id}`);
      toast.success("Deleted");
      setConfirmDel(null);
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    }
  };

  const releaseGift = async (id) => {
    try {
      await api.post(`/admin/gifts/${id}/release`);
      toast.success("Reservation released");
      loadAll();
    } catch { toast.error("Release failed"); }
  };

  // Gifts
  const saveGift = async (data) => {
    try {
      if (data.id) await api.put(`/admin/gifts/${data.id}`, data);
      else await api.post("/admin/gifts", data);
      toast.success("Gift saved");
      setEditGift(null);
      loadAll();
    } catch { toast.error("Save failed"); }
  };
  const [importUrl, setImportUrl] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const importProduct = async () => {
    if (!importUrl.trim()) { toast.error("Enter a URL"); return; }
    try {
      const { data } = await api.post("/admin/gifts/import", { url: importUrl });
      setImportOpen(false);
      setImportUrl("");
      setEditGift({ ...data });
      toast.success("Product imported — review & save");
    } catch { toast.error("Could not import. Add manually."); }
  };

  // Funds
  const saveFund = async (data) => {
    try {
      if (data.id) await api.put(`/admin/funds/${data.id}`, data);
      else await api.post("/admin/funds", data);
      toast.success("Fund saved");
      setEditFund(null);
      loadAll();
    } catch { toast.error("Save failed"); }
  };

  const filteredGuests = guests.filter((g) =>
    !search || g.name?.toLowerCase().includes(search.toLowerCase()) || g.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]" data-testid="admin-dashboard">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="wed-container flex items-center justify-between py-5">
          <div>
            <p className="wed-overline">WedWish Admin</p>
            <h1 className="font-serif text-2xl">{settings.couple_name_1} & {settings.couple_name_2}</h1>
          </div>
          <button onClick={logout} className="wed-btn-outline px-4 py-2" data-testid="admin-logout">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <div className="wed-container py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <Stat label="Guests" value={stats.total_guests || 0} testId="stat-guests" />
          <Stat label="RSVPs" value={stats.total_rsvps || 0} testId="stat-rsvps" />
          <Stat label="Attending" value={stats.attending || 0} testId="stat-attending" />
          <Stat label="Reserved" value={stats.reserved_gifts || 0} testId="stat-reserved" />
          <Stat label="Purchased" value={stats.purchased_gifts || 0} testId="stat-purchased" />
          <Stat label="Contributions" value={`₹${(stats.contribution_total || 0).toLocaleString("en-IN")}`} testId="stat-contrib" />
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="grid grid-cols-3 md:grid-cols-7 gap-1 bg-[hsl(var(--secondary))]/40 w-full overflow-x-auto">
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
            <TabsTrigger value="gifts" data-testid="tab-gifts">Gifts</TabsTrigger>
            <TabsTrigger value="funds" data-testid="tab-funds">Funds</TabsTrigger>
            <TabsTrigger value="guests" data-testid="tab-guests">Guests</TabsTrigger>
            <TabsTrigger value="rsvps" data-testid="tab-rsvps">RSVPs</TabsTrigger>
            <TabsTrigger value="contribs" data-testid="tab-contribs">Contribs</TabsTrigger>
          </TabsList>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-8 wed-card p-8">
            {sectionTitle("Site Settings")}
            <div className="grid md:grid-cols-2 gap-5">
              <div><Label>Couple Name 1</Label>
                <Input value={settings.couple_name_1 || ""} onChange={(e) => setSettings({ ...settings, couple_name_1: e.target.value })} data-testid="settings-name1" /></div>
              <div><Label>Couple Name 2</Label>
                <Input value={settings.couple_name_2 || ""} onChange={(e) => setSettings({ ...settings, couple_name_2: e.target.value })} data-testid="settings-name2" /></div>
              <div><Label>Wedding Date (ISO)</Label>
                <Input type="datetime-local" value={settings.wedding_date ? settings.wedding_date.substring(0, 16) : ""}
                  onChange={(e) => setSettings({ ...settings, wedding_date: new Date(e.target.value).toISOString() })}
                  data-testid="settings-date" /></div>
              <div><Label>UPI ID</Label>
                <Input value={settings.upi_id || ""} onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })} data-testid="settings-upi" /></div>
              <div className="md:col-span-2"><Label>Hero Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input value={settings.hero_image || ""} onChange={(e) => setSettings({ ...settings, hero_image: e.target.value })} data-testid="settings-hero" />
                  <label className="wed-btn-outline px-3 cursor-pointer">
                    <Upload size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await uploadImage(e.target.files[0], "hero");
                        setSettings({ ...settings, hero_image: url });
                      }
                    }} />
                  </label>
                </div>
                {settings.hero_image && <img src={resolveImage(settings.hero_image)} alt="" className="mt-3 h-32 object-cover rounded" />}
              </div>
              <div className="md:col-span-2"><Label>Story Headline</Label>
                <Input value={settings.story_headline || ""} onChange={(e) => setSettings({ ...settings, story_headline: e.target.value })} placeholder="How a chance meeting turned into forever." data-testid="settings-story-headline" /></div>
              <div className="md:col-span-2"><Label>Story Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input value={settings.story_image || ""} onChange={(e) => setSettings({ ...settings, story_image: e.target.value })} data-testid="settings-story-image" />
                  <label className="wed-btn-outline px-3 cursor-pointer">
                    <Upload size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await uploadImage(e.target.files[0], "story");
                        setSettings({ ...settings, story_image: url });
                      }
                    }} />
                  </label>
                </div>
                {settings.story_image && <img src={resolveImage(settings.story_image)} alt="" className="mt-3 h-32 object-cover rounded" />}
              </div>
              <div className="md:col-span-2"><Label>Story Content</Label>
                <Textarea rows={6} value={settings.story_content || ""} onChange={(e) => setSettings({ ...settings, story_content: e.target.value })} data-testid="settings-story" /></div>
            </div>
            <button onClick={saveSettings} className="wed-btn-primary mt-6" data-testid="settings-save">Save settings</button>

            <div className="mt-10 pt-8 border-t border-[hsl(var(--border))]">
              <h3 className="font-serif text-xl mb-1">Theme</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-5">Click a palette to preview. Save to publish.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { key: "champagne", name: "Champagne Ivory", bg: "#FAF9F6", fg: "#2C2A28", primary: "#C5A059", secondary: "#EADDCA" },
                  { key: "maroon", name: "Royal Maroon", bg: "#F7F2EB", fg: "#3A1B1E", primary: "#8A2C3C", secondary: "#E0D2BE" },
                  { key: "sage", name: "Sage Garden", bg: "#F5F5EE", fg: "#262E22", primary: "#557A4F", secondary: "#D6DCC5" },
                  { key: "midnight", name: "Midnight Rose", bg: "#171C26", fg: "#ECE5DA", primary: "#D88FA3", secondary: "#2C3340" },
                  { key: "coral", name: "Coral Sunset", bg: "#F8EFE6", fg: "#3B2820", primary: "#CB573F", secondary: "#ECD7C2" },
                ].map((t) => {
                  const active = (settings.theme || "champagne") === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSettings({ ...settings, theme: t.key })}
                      className={`relative text-left rounded-lg border-2 transition-all p-3 ${
                        active ? "border-[hsl(var(--primary))] shadow-md" : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/60"
                      }`}
                      data-testid={`theme-${t.key}`}
                      style={{ background: t.bg, color: t.fg }}
                    >
                      <div className="flex gap-1.5 mb-3">
                        <span className="w-6 h-6 rounded-full border" style={{ background: t.primary, borderColor: t.fg + "22" }} />
                        <span className="w-6 h-6 rounded-full border" style={{ background: t.secondary, borderColor: t.fg + "22" }} />
                        <span className="w-6 h-6 rounded-full border" style={{ background: t.bg, borderColor: t.fg + "55" }} />
                      </div>
                      <div className="font-serif text-base leading-tight">{t.name}</div>
                      <div className="text-[10px] uppercase tracking-widest mt-1 opacity-70">
                        {active ? "Selected" : "Preview"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[hsl(var(--border))]">
              <h3 className="font-serif text-xl mb-1">Section Headlines</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-5">Leave empty to use the default (Events headline auto-computes from your events).</p>
              <div className="grid md:grid-cols-2 gap-5">
                <div><Label>Hero Overline</Label>
                  <Input value={settings.hero_overline || ""} onChange={(e) => setSettings({ ...settings, hero_overline: e.target.value })} placeholder="A wedding invitation" data-testid="settings-hero-overline" /></div>
                <div><Label>Events Headline</Label>
                  <Input value={settings.events_headline || ""} onChange={(e) => setSettings({ ...settings, events_headline: e.target.value })} placeholder="(auto: Two days of joy.)" data-testid="settings-events-headline" /></div>
                <div><Label>Registry Headline</Label>
                  <Input value={settings.registry_headline || ""} onChange={(e) => setSettings({ ...settings, registry_headline: e.target.value })} placeholder="A few things we'd love." data-testid="settings-registry-headline" /></div>
                <div><Label>Gallery Headline</Label>
                  <Input value={settings.gallery_headline || ""} onChange={(e) => setSettings({ ...settings, gallery_headline: e.target.value })} placeholder="Our gallery, soon." data-testid="settings-gallery-headline" /></div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[hsl(var(--border))]">
              <h3 className="font-serif text-xl mb-1">Navigation</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-5">Edit each navbar label, and toggle pages on/off. Home is always visible.</p>
              <div className="mb-5 max-w-md">
                <Label>Navbar Brand (logo text)</Label>
                <Input
                  value={settings.nav_brand || ""}
                  placeholder={`${settings.couple_name_1 || "U"} & ${settings.couple_name_2 || "K"}`}
                  onChange={(e) => setSettings({ ...settings, nav_brand: e.target.value })}
                  data-testid="settings-nav-brand"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Shown in the navbar and footer. Leave empty to use the couple names automatically.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-3 max-w-xl">
                {[
                  ["home", "Home"],
                  ["our_story", "Our Story"],
                  ["events", "Events"],
                  ["registry", "Registry"],
                  ["cash_gifts", "Cash Gifts"],
                  ["gallery", "Gallery"],
                  ["contact", "Contact"],
                ].map(([key, label]) => {
                  const vp = settings.visible_pages || {};
                  const nl = settings.nav_labels || {};
                  const checked = key === "home" ? true : vp[key] !== false;
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-md border border-[hsl(var(--border))]" data-testid={`visibility-${key}`}>
                      <Input
                        value={nl[key] ?? ""}
                        placeholder={label}
                        onChange={(e) => setSettings({ ...settings, nav_labels: { ...nl, [key]: e.target.value } })}
                        className="flex-1"
                        data-testid={`nav-label-${key}`}
                      />
                      {key !== "home" && (
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) => setSettings({ ...settings, visible_pages: { ...vp, [key]: !!v } })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={saveSettings} className="wed-btn-primary mt-8" data-testid="settings-save-bottom">Save settings</button>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="mt-8">
            <div className="flex justify-between items-center mb-5">
              {sectionTitle("Events")}
              <button onClick={() => setEditEvent({})} className="wed-btn-primary" data-testid="event-new"><Plus size={14} /> New event</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {events.map((e) => (
                <div key={e.id} className="wed-card p-5 flex gap-4">
                  {e.image_url && <img src={resolveImage(e.image_url)} className="w-24 h-24 object-cover rounded" alt="" />}
                  <div className="flex-1">
                    <h3 className="font-serif text-xl">{e.title}</h3>
                    <p className="text-xs gold-text mt-1">{e.date && new Date(e.date).toLocaleString("en-IN")}</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{e.venue_name}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setEditEvent(e)} className="text-xs gold-text"><Edit size={12} className="inline" /> Edit</button>
                      <button onClick={() => deleteEvent(e.id, e.title)} className="text-xs text-red-700" data-testid={`delete-event-${e.id}`}><Trash2 size={12} className="inline" /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* GIFTS */}
          <TabsContent value="gifts" className="mt-8">
            <div className="flex justify-between items-center mb-5">
              {sectionTitle("Gift Registry")}
              <div className="flex gap-2">
                <button onClick={() => setImportOpen(true)} className="wed-btn-outline" data-testid="gift-import"><LinkIcon size={14} /> Import URL</button>
                <button onClick={() => setEditGift({})} className="wed-btn-primary" data-testid="gift-new"><Plus size={14} /> New gift</button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gifts.map((g) => (
                <div key={g.id} className="wed-card p-4">
                  {g.image_url && <img src={resolveImage(g.image_url)} alt="" className="w-full h-40 object-cover rounded mb-3" />}
                  <h3 className="font-serif text-lg">{g.title}</h3>
                  <p className="text-xs gold-text">₹{g.price?.toLocaleString("en-IN")} · {g.status}</p>
                  {g.reservation && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Reserved by {g.reservation.guest_name} ({g.reservation.guest_email})
                      {g.reservation.purchased && " ✓ purchased"}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 text-xs">
                    <button onClick={() => setEditGift(g)} className="gold-text">Edit</button>
                    {g.status !== "available" && <button onClick={() => releaseGift(g.id)} className="text-[hsl(var(--muted-foreground))]">Release</button>}
                    <button onClick={() => deleteGift(g.id, g.title)} className="text-red-700 ml-auto" data-testid={`delete-gift-${g.id}`}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* FUNDS */}
          <TabsContent value="funds" className="mt-8">
            <div className="flex justify-between items-center mb-5">
              {sectionTitle("Cash Funds")}
              <button onClick={() => setEditFund({ active: true })} className="wed-btn-primary" data-testid="fund-new"><Plus size={14} /> New fund</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funds.map((f) => (
                <div key={f.id} className="wed-card p-5">
                  <h3 className="font-serif text-xl">{f.name}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{f.description}</p>
                  <p className="text-xs gold-text mt-2">₹{f.raised?.toLocaleString("en-IN") || 0} / ₹{f.goal_amount?.toLocaleString("en-IN")}</p>
                  <div className="flex gap-2 mt-3 text-xs">
                    <button onClick={() => setEditFund(f)} className="gold-text">Edit</button>
                    <button onClick={() => deleteFund(f.id, f.name)} className="text-red-700 ml-auto" data-testid={`delete-fund-${f.id}`}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* GUESTS */}
          <TabsContent value="guests" className="mt-8 wed-card p-6">
            {sectionTitle("Guests")}
            <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" data-testid="guest-search" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>RSVPs</th><th>Reservations</th><th>Contributed</th></tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr key={g.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-3">{g.name}</td>
                      <td className="text-[hsl(var(--muted-foreground))]">{g.email}</td>
                      <td className="text-[hsl(var(--muted-foreground))]">{g.phone || "—"}</td>
                      <td>{g.rsvp_count}</td>
                      <td>{g.reservation_count}</td>
                      <td className="gold-text">₹{g.contribution_total?.toLocaleString("en-IN") || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* RSVPS */}
          <TabsContent value="rsvps" className="mt-8 wed-card p-6">
            {sectionTitle("RSVP Responses")}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr><th className="py-2">Guest</th><th>Event</th><th>Status</th><th>Count</th><th>Dietary</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {rsvps.map((r) => (
                    <tr key={r.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-3">{r.guest?.name}</td>
                      <td>{r.event?.title}</td>
                      <td className="gold-text capitalize">{r.status}</td>
                      <td>{r.guest_count}</td>
                      <td className="text-[hsl(var(--muted-foreground))]">{r.dietary || "—"}</td>
                      <td className="text-[hsl(var(--muted-foreground))]">{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* CONTRIBUTIONS */}
          <TabsContent value="contribs" className="mt-8 wed-card p-6">
            {sectionTitle("Contributions")}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr><th className="py-2">Guest</th><th>Fund</th><th>Amount</th><th>Ref</th><th>Message</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {contribs.map((c) => (
                    <tr key={c.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-3">{c.guest?.name}</td>
                      <td>{c.fund?.name}</td>
                      <td className="gold-text">₹{c.amount?.toLocaleString("en-IN")}</td>
                      <td className="text-[hsl(var(--muted-foreground))] font-mono text-xs">{c.txn_ref || "—"}</td>
                      <td className="text-[hsl(var(--muted-foreground))]">{c.message || "—"}</td>
                      <td className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              {sectionTitle("Guestbook Messages")}
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="border-l-2 border-[hsl(var(--primary))]/50 pl-4 py-2">
                    <p className="text-sm italic">"{m.message}"</p>
                    <p className="text-xs gold-text mt-1">— {m.guest_name} · {new Date(m.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* EVENT MODAL */}
      <Dialog open={!!editEvent} onOpenChange={(v) => !v && setEditEvent(null)}>
        <DialogContent className="bg-[hsl(var(--card))] max-w-2xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editEvent?.id ? "Edit" : "New"} event</DialogTitle></DialogHeader>
          {editEvent && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editEvent.title || ""} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editEvent.description || ""} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date/time</Label><Input type="datetime-local" value={editEvent.date ? editEvent.date.substring(0, 16) : ""} onChange={(e) => setEditEvent({ ...editEvent, date: new Date(e.target.value).toISOString() })} /></div>
                <div><Label>Venue</Label><Input value={editEvent.venue_name || ""} onChange={(e) => setEditEvent({ ...editEvent, venue_name: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={editEvent.address || ""} onChange={(e) => setEditEvent({ ...editEvent, address: e.target.value })} /></div>
              <div><Label>Map Link</Label><Input value={editEvent.map_link || ""} onChange={(e) => setEditEvent({ ...editEvent, map_link: e.target.value })} /></div>
              <div><Label>Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input value={editEvent.image_url || ""} onChange={(e) => setEditEvent({ ...editEvent, image_url: e.target.value })} />
                  <label className="wed-btn-outline px-3 cursor-pointer">
                    <Upload size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await uploadImage(e.target.files[0], "events");
                        setEditEvent({ ...editEvent, image_url: url });
                      }
                    }} />
                  </label>
                </div>
              </div>
              <button onClick={() => saveEvent(editEvent)} className="wed-btn-primary w-full">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GIFT MODAL */}
      <Dialog open={!!editGift} onOpenChange={(v) => !v && setEditGift(null)}>
        <DialogContent className="bg-[hsl(var(--card))] max-w-xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editGift?.id ? "Edit" : "New"} gift</DialogTitle></DialogHeader>
          {editGift && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editGift.title || ""} onChange={(e) => setEditGift({ ...editGift, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editGift.description || ""} onChange={(e) => setEditGift({ ...editGift, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₹)</Label><Input type="number" value={editGift.price || ""} onChange={(e) => setEditGift({ ...editGift, price: parseFloat(e.target.value) || null })} /></div>
                <div><Label>Product URL</Label><Input value={editGift.product_url || ""} onChange={(e) => setEditGift({ ...editGift, product_url: e.target.value })} /></div>
              </div>
              <div><Label>Image URL or Upload</Label>
                <div className="flex gap-2">
                  <Input value={editGift.image_url || ""} onChange={(e) => setEditGift({ ...editGift, image_url: e.target.value })} />
                  <label className="wed-btn-outline px-3 cursor-pointer">
                    <Upload size={14} />
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await uploadImage(e.target.files[0], "gifts");
                        setEditGift({ ...editGift, image_url: url });
                      }
                    }} />
                  </label>
                </div>
              </div>
              <button onClick={() => saveGift(editGift)} className="wed-btn-primary w-full">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FUND MODAL */}
      <Dialog open={!!editFund} onOpenChange={(v) => !v && setEditFund(null)}>
        <DialogContent className="bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editFund?.id ? "Edit" : "New"} fund</DialogTitle></DialogHeader>
          {editFund && (
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editFund.name || ""} onChange={(e) => setEditFund({ ...editFund, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editFund.description || ""} onChange={(e) => setEditFund({ ...editFund, description: e.target.value })} /></div>
              <div><Label>Goal Amount (₹)</Label><Input type="number" value={editFund.goal_amount || ""} onChange={(e) => setEditFund({ ...editFund, goal_amount: parseFloat(e.target.value) || 0 })} /></div>
              <button onClick={() => saveFund(editFund)} className="wed-btn-primary w-full">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IMPORT URL MODAL */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-[hsl(var(--card))]">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Import product</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paste Amazon / Flipkart URL</Label>
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.amazon.in/..."
                data-testid="import-url-input"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                We'll try to extract title, image and price. You can edit before saving.
              </p>
            </div>
            <button onClick={importProduct} className="wed-btn-primary w-full" data-testid="import-url-submit">
              Import
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent className="bg-[hsl(var(--card))]" data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete {confirmDel?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.label ? <>This will permanently delete <span className="font-medium text-[hsl(var(--foreground))]">{confirmDel.label}</span>.</> : "This action cannot be undone."}
              {confirmDel?.type === "event" && " All RSVPs for this event will also be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-red-700 hover:bg-red-800 text-white"
              data-testid="confirm-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
