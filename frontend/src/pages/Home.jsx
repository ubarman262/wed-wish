import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveImage } from "@/lib/api";
import { ArrowRight } from "lucide-react";

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff < 0) return { d: 0, h: 0, m: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
  };
}

export default function Home() {
  const [settings, setSettings] = useState({});
  const [events, setEvents] = useState([]);
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data || {}));
    api.get("/events").then((r) => setEvents(r.data || []));
    api.get("/gifts").then((r) => setGifts(r.data || []));
  }, []);

  const cd = useCountdown(settings.wedding_date);
  const dateStr = settings.wedding_date
    ? new Date(settings.wedding_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "";
  const vp = settings.visible_pages || {};
  const showStory = vp.our_story !== false;
  const showEvents = vp.events !== false;
  const showRegistry = vp.registry !== false;
  const showGallery = vp.gallery !== false;

  const eventsHeadline = settings.events_headline || (() => {
    const days = new Set(events.filter((e) => e.date).map((e) => new Date(e.date).toDateString())).size;
    const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
    if (days === 0) return "Our celebrations.";
    if (days === 1) return "One day of joy.";
    return `${words[days] || days} days of joy.`;
  })();

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="wed-section pt-12 md:pt-20" data-testid="hero-section">
        <div className="wed-container grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-8 animate-fade-up">
            <p className="wed-overline">{settings.hero_overline || "A wedding invitation"}</p>
            <h1 className="wed-display leading-[0.95]">
              {settings.couple_name_1 || "Ujjwal"}
              <span className="block gold-text">&</span>
              {settings.couple_name_2 || "Kasturika"}
            </h1>
            <div className="wed-divider">
              <span className="text-sm tracking-[0.3em] uppercase">{dateStr || "Save the Date"}</span>
            </div>
            <p className="text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-md leading-relaxed">
              Two stories, one ever after. We'd be honoured to have you celebrate with us.
            </p>
            {cd && (
              <div className="flex gap-6 pt-4" data-testid="countdown">
                {[
                  ["Days", cd.d],
                  ["Hours", cd.h],
                  ["Minutes", cd.m],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="font-serif text-4xl md:text-5xl gold-text">{String(v).padStart(2, "0")}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mt-1">{l}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/events" className="wed-btn-primary" data-testid="hero-rsvp-btn">
                RSVP <ArrowRight size={16} />
              </Link>
              <Link to="/registry" className="wed-btn-outline" data-testid="hero-registry-btn">
                Gift Registry
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6 animate-fade-up">
            <div className="relative">
              <div className="absolute -inset-4 border border-[hsl(var(--primary))]/30 rounded-t-full" />
              <img
                src={resolveImage(settings.hero_image)}
                alt="Couple"
                className="w-full h-[520px] md:h-[640px] object-cover rounded-t-full"
                data-testid="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STORY PREVIEW */}
      {showStory && (
      <section className="wed-section bg-[hsl(var(--secondary))]/30" data-testid="story-preview">
        <div className="wed-container grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="wed-overline">Our Story</p>
            <h2 className="wed-title">{settings.story_headline || "How a chance meeting turned into forever."}</h2>
            <p className="text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-5">
              {settings.story_content}
            </p>
            <Link to="/our-story" className="wed-btn-outline mt-4" data-testid="story-more-btn">
              Read our story <ArrowRight size={16} />
            </Link>
          </div>
          <div className="lg:col-span-5">
            <div className="aspect-[3/4] bg-[hsl(var(--muted))] overflow-hidden rounded-lg">
              <img
                src={resolveImage(settings.story_image) || "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?w=800"}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* EVENTS PREVIEW */}
      {showEvents && (
      <section className="wed-section" data-testid="events-preview">
        <div className="wed-container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="wed-overline">Celebrations</p>
              <h2 className="wed-title mt-2">{eventsHeadline}</h2>
            </div>
            <Link to="/events" className="hidden md:inline-flex text-sm gold-text hover:underline">
              All events →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.slice(0, 4).map((e) => (
              <div key={e.id} className="wed-card overflow-hidden">
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={resolveImage(e.image_url)} alt={e.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-2xl">{e.title}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--primary))] mt-2">
                    {e.date ? new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* REGISTRY PREVIEW */}
      {showRegistry && (
      <section className="wed-section bg-[hsl(var(--secondary))]/30" data-testid="registry-preview">
        <div className="wed-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="wed-overline">Gift Registry</p>
            <h2 className="wed-title mt-2">{settings.registry_headline || "A few things we'd love."}</h2>
            <p className="text-[hsl(var(--muted-foreground))] mt-4">
              Reserve a gift to let us know it's coming — or contribute to our shared funds.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {gifts.slice(0, 3).map((g) => (
              <div key={g.id} className="wed-card overflow-hidden">
                <div className="aspect-square overflow-hidden bg-[hsl(var(--muted))]">
                  <img src={resolveImage(g.image_url)} alt={g.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl">{g.title}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    ₹{g.price?.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/registry" className="wed-btn-primary" data-testid="registry-explore-btn">
              Explore registry <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* GALLERY PREVIEW */}
      {showGallery && (
      <section className="wed-section" data-testid="gallery-preview">
        <div className="wed-container text-center">
          <p className="wed-overline">Memories</p>
          <h2 className="wed-title mt-2">{settings.gallery_headline || "Our gallery, soon."}</h2>
          <p className="text-[hsl(var(--muted-foreground))] mt-4 max-w-xl mx-auto">
            After the celebrations, we'll share every cherished moment here.
          </p>
        </div>
      </section>
      )}
    </div>
  );
}
