import { useEffect, useState } from "react";
import { api, resolveImage } from "@/lib/api";
import { MapPin, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import GuestIdentifyModal from "@/components/GuestIdentifyModal";
import { hasGuest, getGuest } from "@/lib/guest";
import { toast } from "sonner";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [myRsvps, setMyRsvps] = useState({});
  const [openIdentify, setOpenIdentify] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [form, setForm] = useState({ status: "attending", guest_count: 1, dietary: "", note: "" });
  const [saving, setSaving] = useState(false);

  const loadRsvps = async () => {
    if (!hasGuest()) return;
    try {
      const { data } = await api.get("/rsvp/me");
      const map = {};
      data.forEach((r) => (map[r.event_id] = r));
      setMyRsvps(map);
    } catch (e) {}
  };

  useEffect(() => {
    api.get("/events").then((r) => setEvents(r.data || []));
    loadRsvps();
  }, []);

  const startRsvp = (e) => {
    if (!hasGuest()) {
      setPendingEvent(e);
      setOpenIdentify(true);
      return;
    }
    const existing = myRsvps[e.id];
    setForm({
      status: existing?.status || "attending",
      guest_count: existing?.guest_count || 1,
      dietary: existing?.dietary || "",
      note: existing?.note || "",
    });
    setRsvpEvent(e);
  };

  const onIdentified = () => {
    loadRsvps();
    if (pendingEvent) {
      startRsvp(pendingEvent);
      setPendingEvent(null);
    }
  };

  const submitRsvp = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await api.post("/rsvp", {
        event_id: rsvpEvent.id,
        status: form.status,
        guest_count: Number(form.guest_count) || 1,
        dietary: form.dietary || null,
        note: form.note || null,
      });
      toast.success("Your RSVP is recorded.");
      setRsvpEvent(null);
      loadRsvps();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save RSVP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="wed-section" data-testid="events-page">
      <div className="wed-container">
        <p className="wed-overline">Celebrations</p>
        <h1 className="wed-title mt-4">The events.</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-3 max-w-xl">
          Tap RSVP on each event you'd like to attend.
        </p>

        <div className="mt-16 space-y-12">
          {events.map((e, i) => {
            const dt = e.date ? new Date(e.date) : null;
            const rsvp = myRsvps[e.id];
            return (
              <div
                key={e.id}
                className={`grid lg:grid-cols-12 gap-8 items-center ${i % 2 ? "lg:[direction:rtl]" : ""}`}
                data-testid={`event-card-${i}`}
              >
                <div className="lg:col-span-6 lg:[direction:ltr]">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg">
                    <img src={resolveImage(e.image_url)} alt={e.title} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="lg:col-span-6 lg:[direction:ltr] space-y-4">
                  <p className="wed-overline">Event {String(i + 1).padStart(2, "0")}</p>
                  <h2 className="font-serif text-4xl md:text-5xl font-light">{e.title}</h2>
                  <p className="text-[hsl(var(--muted-foreground))]">{e.description}</p>
                  <div className="space-y-2 text-sm pt-2">
                    {dt && (
                      <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                        <Calendar size={16} className="gold-text" />
                        {dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
                      </div>
                    )}
                    {dt && (
                      <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                        <Clock size={16} className="gold-text" />
                        {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                      </div>
                    )}
                    {e.venue_name && (
                      <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                        <MapPin size={16} className="gold-text" />
                        <span>{e.venue_name} — {e.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-3">
                    <button
                      onClick={() => startRsvp(e)}
                      className="wed-btn-primary"
                      data-testid={`event-rsvp-btn-${i}`}
                    >
                      {rsvp ? `RSVP: ${rsvp.status}` : "RSVP"}
                    </button>
                    {e.map_link && (
                      <a href={e.map_link} target="_blank" rel="noreferrer" className="wed-btn-outline">
                        View map
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GuestIdentifyModal open={openIdentify} onOpenChange={setOpenIdentify} onIdentified={onIdentified} />

      <Dialog open={!!rsvpEvent} onOpenChange={(v) => !v && setRsvpEvent(null)}>
        <DialogContent className="bg-[hsl(var(--card))]" data-testid="rsvp-modal">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl font-light">
              RSVP — {rsvpEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRsvp} className="space-y-5">
            <div>
              <Label>Will you attend?</Label>
              <RadioGroup
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
                className="grid grid-cols-3 gap-2 mt-2"
              >
                {[
                  ["attending", "Joyfully attending"],
                  ["maybe", "Maybe"],
                  ["declined", "Sadly cannot"],
                ].map(([v, l]) => (
                  <label key={v} className={`border rounded-md p-3 cursor-pointer text-center text-sm transition ${
                    form.status === v ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10" : "border-[hsl(var(--border))]"
                  }`}>
                    <RadioGroupItem value={v} className="sr-only" data-testid={`rsvp-status-${v}`} />
                    {l}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {form.status !== "declined" && (
              <>
                <div>
                  <Label htmlFor="gc">Guest count</Label>
                  <Input
                    id="gc"
                    type="number"
                    min="1"
                    max="10"
                    value={form.guest_count}
                    onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                    data-testid="rsvp-guest-count"
                  />
                </div>
                <div>
                  <Label htmlFor="diet">Dietary restrictions (optional)</Label>
                  <Input
                    id="diet"
                    value={form.dietary}
                    onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                    placeholder="Vegetarian, nut allergy..."
                    data-testid="rsvp-dietary"
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="note">A note for us (optional)</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                data-testid="rsvp-note"
              />
            </div>
            <button type="submit" disabled={saving} className="wed-btn-primary w-full" data-testid="rsvp-submit">
              {saving ? "Saving..." : "Confirm RSVP"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
