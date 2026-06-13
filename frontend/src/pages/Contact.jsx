import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Phone, Mail, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import GuestIdentifyModal from "@/components/GuestIdentifyModal";
import { hasGuest, getGuest } from "@/lib/guest";
import { toast } from "sonner";

export default function Contact() {
  const [s, setS] = useState({});
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/settings").then((r) => setS(r.data || {}));
    api.get("/guestbook").then((r) => setMessages(r.data || []));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    if (!hasGuest()) {
      setOpen(true);
      return;
    }
    try {
      await api.post("/guestbook", { message: msg.trim() });
      toast.success("Your message means the world to us.");
      setMsg("");
      load();
    } catch (e) {
      toast.error("Could not post message");
    }
  };

  const ci = s.contact_info || {};
  return (
    <section className="wed-section" data-testid="contact-page">
      <div className="wed-container">
        <p className="wed-overline">Get in Touch</p>
        <h1 className="wed-title mt-4">Reach out.</h1>

        <div className="grid lg:grid-cols-2 gap-12 mt-12">
          <div className="space-y-8">
            <div className="wed-card p-6">
              <h3 className="font-serif text-2xl mb-4">Couple</h3>
              {ci.couple_phone && (
                <div className="flex items-center gap-3 text-sm py-1.5"><Phone size={14} className="gold-text" /> {ci.couple_phone}</div>
              )}
              {ci.couple_email && (
                <div className="flex items-center gap-3 text-sm py-1.5"><Mail size={14} className="gold-text" /> {ci.couple_email}</div>
              )}
            </div>
            <div className="wed-card p-6">
              <h3 className="font-serif text-2xl mb-4">Family</h3>
              {(ci.family || []).map((f, i) => (
                <div key={i} className="text-sm py-2 border-b last:border-0 border-[hsl(var(--border))]">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[hsl(var(--muted-foreground))]">{f.phone}</div>
                </div>
              ))}
            </div>
            {ci.venue_support && (
              <div className="wed-card p-6">
                <h3 className="font-serif text-2xl mb-4">Venue Support</h3>
                <div className="flex items-center gap-3 text-sm"><MapPin size={14} className="gold-text" /> {ci.venue_support}</div>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-serif text-3xl">Guestbook</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">Leave a message for the couple.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Wishing you a lifetime of joy..."
                rows={4}
                data-testid="guestbook-input"
              />
              <button type="submit" className="wed-btn-primary" data-testid="guestbook-submit">
                Post message
              </button>
            </form>
            <div className="mt-10 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {messages.map((m) => (
                <div key={m.id} className="border-l-2 border-[hsl(var(--primary))]/40 pl-4 py-2" data-testid={`msg-${m.id}`}>
                  <p className="text-sm italic text-[hsl(var(--foreground))]">"{m.message}"</p>
                  <p className="text-xs gold-text mt-1">— {m.guest_name}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Be the first to leave a message.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <GuestIdentifyModal open={open} onOpenChange={setOpen} onIdentified={() => msg && submit({ preventDefault: () => {} })} />
    </section>
  );
}
