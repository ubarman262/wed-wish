import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveImage } from "@/lib/api";
import { ArrowRight, Heart, Gift, Flower2, MapPin, Calendar } from "lucide-react";

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
      <section className="pt-6 pb-10 md:pb-16 lg:pt-12 lg:pb-20" data-testid="hero-section">
        <div className="wed-container">

          {/* ===== MOBILE / TABLET LAYOUT ===== */}
          <div className="lg:hidden">
            {/* Arched hero image with rose border + side floral accents */}
            <div className="relative animate-fade-up">
              <Flower2 className="absolute left-0 top-1/2 -translate-y-1/2 text-[hsl(var(--primary))] opacity-25" size={56} strokeWidth={0.6} aria-hidden />
              <Flower2 className="absolute right-0 top-1/2 -translate-y-1/2 text-[hsl(var(--primary))] opacity-25" size={56} strokeWidth={0.6} aria-hidden />
              <div className="mx-auto w-[88%]">
                <img
                  src={resolveImage(settings.hero_image)}
                  alt="Couple"
                  className="w-full aspect-[4/5] object-cover rounded-t-[200px] border border-[hsl(var(--primary))]/60 shadow-2xl"
                  data-testid="hero-image"
                />
              </div>
              <div className="flex justify-center mt-3">
                <Flower2 className="text-[hsl(var(--primary))]" size={18} />
              </div>
            </div>

            <div className="text-center mt-6 space-y-4 animate-fade-up">
              <p className="wed-overline">{settings.hero_overline || "A wedding invitation"}</p>
              <h1 className="font-serif text-5xl sm:text-6xl tracking-tight font-light italic leading-none">
                <span>{settings.couple_name_1 || "Ujjwal"}</span>
                <span className="gold-text mx-2 not-italic">&</span>
                <span>{settings.couple_name_2 || "Kasturika"}</span>
              </h1>
              {dateStr && (
                <div className="flex items-center justify-center gap-3 px-8">
                  <span className="h-px flex-1 bg-[hsl(var(--primary))]/40 max-w-[60px]" />
                  <span className="text-xs tracking-[0.32em] uppercase whitespace-nowrap text-[hsl(var(--foreground))]">{dateStr}</span>
                  <span className="h-px flex-1 bg-[hsl(var(--primary))]/40 max-w-[60px]" />
                </div>
              )}
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed px-4">
                Two stories, one ever after.<br />We'd be honoured to have you celebrate with us.
              </p>
            </div>

            {cd && (
              <div className="mt-7 border border-[hsl(var(--border))] rounded-2xl py-4 grid grid-cols-3 divide-x divide-[hsl(var(--border))]" data-testid="countdown">
                {[["Days", cd.d], ["Hours", cd.h], ["Minutes", cd.m]].map(([l, v]) => (
                  <div key={l} className="text-center px-2">
                    <div className="font-serif text-3xl sm:text-4xl gold-text italic">{String(v).padStart(2, "0")}</div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] mt-1">{l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Link to="/events" className="wed-btn-primary !px-2 !py-3 text-sm" data-testid="hero-rsvp-btn">
                <Heart size={14} /> RSVP
              </Link>
              <Link to="/registry" className="wed-btn-outline !px-2 !py-3 text-sm" data-testid="hero-registry-btn">
                <Gift size={14} /> Gift Registry
              </Link>
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT ===== */}
          <div className="hidden lg:grid grid-cols-12 gap-10 items-center">
            <div className="col-span-6 space-y-8 animate-fade-up">
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
                <div className="flex gap-6 pt-4">
                  {[["Days", cd.d], ["Hours", cd.h], ["Minutes", cd.m]].map(([l, v]) => (
                    <div key={l}>
                      <div className="font-serif text-4xl md:text-5xl gold-text">{String(v).padStart(2, "0")}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/events" className="wed-btn-primary">RSVP <ArrowRight size={16} /></Link>
                <Link to="/registry" className="wed-btn-outline">Gift Registry</Link>
              </div>
            </div>
            <div className="col-span-6 animate-fade-up">
              <div className="relative">
                <div className="absolute -inset-4 border border-[hsl(var(--primary))]/30 rounded-t-full" />
                <img
                  src={resolveImage(settings.hero_image)}
                  alt="Couple"
                  className="w-full h-[520px] md:h-[640px] object-cover rounded-t-full"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* STORY PREVIEW */}
      {showStory && (
      <section className="py-10 lg:py-32 lg:bg-[hsl(var(--secondary))]/30" data-testid="story-preview">
        <div className="wed-container">
          {/* Mobile: centered card */}
          <div className="lg:hidden wed-card p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="h-px flex-1 bg-[hsl(var(--primary))]/30 max-w-[60px]" />
              <h2 className="font-serif text-2xl text-[hsl(var(--primary))]">Our Story</h2>
              <span className="h-px flex-1 bg-[hsl(var(--primary))]/30 max-w-[60px]" />
            </div>
            <Heart size={16} className="mx-auto text-[hsl(var(--primary))] opacity-70" />
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mt-5 line-clamp-6 text-center">
              {settings.story_content}
            </p>
            <Link to="/our-story" className="inline-flex items-center gap-1 mt-5 text-sm gold-text italic underline underline-offset-4" data-testid="story-more-btn">
              Read more <ArrowRight size={14} />
            </Link>
          </div>

          {/* Desktop: original two-column layout */}
          <div className="hidden lg:grid grid-cols-12 gap-10 items-center">
            <div className="col-span-7 space-y-5">
              <p className="wed-overline">Our Story</p>
              <h2 className="wed-title">{settings.story_headline || "How a chance meeting turned into forever."}</h2>
              <p className="text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-5">{settings.story_content}</p>
              <Link to="/our-story" className="wed-btn-outline mt-4">Read our story <ArrowRight size={16} /></Link>
            </div>
            <div className="col-span-5">
              <div className="aspect-[3/4] bg-[hsl(var(--muted))] overflow-hidden rounded-lg">
                <img
                  src={resolveImage(settings.story_image) || "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?w=800"}
                  className="w-full h-full object-cover" alt=""
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* EVENTS PREVIEW */}
      {showEvents && (
      <section className="py-10 lg:py-32" data-testid="events-preview">
        <div className="wed-container">
          {/* Mobile: compact 2-col cards */}
          <div className="lg:hidden">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-12 bg-[hsl(var(--primary))]/30" />
              <h2 className="font-serif text-2xl text-[hsl(var(--primary))]">Upcoming Events</h2>
              <span className="h-px w-12 bg-[hsl(var(--primary))]/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {events.slice(0, 4).map((e) => (
                <Link to="/events" key={e.id} className="wed-card p-3 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))]/15 overflow-hidden mb-2 flex items-center justify-center">
                    {e.image_url
                      ? <img src={resolveImage(e.image_url)} alt="" className="w-full h-full object-cover" />
                      : <Flower2 className="text-[hsl(var(--primary))]" />
                    }
                  </div>
                  <div className="font-serif text-base leading-tight">{e.title}</div>
                  <div className="text-[10px] gold-text mt-1.5 flex items-center gap-1">
                    <Calendar size={9} />
                    {e.date ? new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                  </div>
                  {e.venue_name && (
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1 truncate max-w-full">
                      <MapPin size={9} className="gold-text shrink-0" />
                      <span className="truncate">{e.venue_name}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop: original layout */}
          <div className="hidden lg:block">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="wed-overline">Celebrations</p>
                <h2 className="wed-title mt-2">{eventsHeadline}</h2>
              </div>
              <Link to="/events" className="text-sm gold-text hover:underline">All events →</Link>
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
      <section className="py-10 lg:py-32" data-testid="gallery-preview">
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
