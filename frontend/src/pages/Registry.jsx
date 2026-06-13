import { useEffect, useState } from "react";
import { api, resolveImage } from "@/lib/api";
import { ExternalLink, Check, Lock } from "lucide-react";
import GuestIdentifyModal from "@/components/GuestIdentifyModal";
import { hasGuest } from "@/lib/guest";
import { toast } from "sonner";

const STATUS_LABEL = {
  available: { label: "Available", cls: "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]" },
  reserved: { label: "Reserved", cls: "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]" },
  purchased: { label: "Purchased", cls: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] line-through" },
};

export default function Registry() {
  const [gifts, setGifts] = useState([]);
  const [openIdentify, setOpenIdentify] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => api.get("/gifts").then((r) => setGifts(r.data || []));
  useEffect(() => { load(); }, []);

  const guarded = (fn) => {
    if (!hasGuest()) {
      setPendingAction(() => fn);
      setOpenIdentify(true);
      return;
    }
    fn();
  };

  const reserve = (g) => guarded(async () => {
    try {
      await api.post(`/gifts/${g.id}/reserve`);
      toast.success(`Reserved: ${g.title}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not reserve");
    }
  });
  const unreserve = (g) => guarded(async () => {
    try {
      await api.delete(`/gifts/${g.id}/reserve`);
      toast.success("Reservation released");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not unreserve");
    }
  });
  const purchased = (g) => guarded(async () => {
    try {
      await api.post(`/gifts/${g.id}/purchased`);
      toast.success("Marked as purchased — thank you!");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update");
    }
  });

  return (
    <section className="wed-section" data-testid="registry-page">
      <div className="wed-container">
        <p className="wed-overline">Gift Registry</p>
        <h1 className="wed-title mt-4">A thoughtful list.</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-3 max-w-xl">
          Reserve to claim, then mark as purchased once you've bought it. Each guest may reserve up to 2 gifts.
        </p>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gifts.map((g) => {
            const st = STATUS_LABEL[g.status];
            return (
              <div key={g.id} className="wed-card overflow-hidden flex flex-col" data-testid={`gift-card-${g.id}`}>
                <div className="aspect-square bg-[hsl(var(--muted))] overflow-hidden">
                  {g.image_url && (
                    <img src={resolveImage(g.image_url)} alt={g.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl flex-1">{g.title}</h3>
                    <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  {g.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2">{g.description}</p>
                  )}
                  {g.price && (
                    <p className="text-sm gold-text mt-2 font-medium">₹{g.price.toLocaleString("en-IN")}</p>
                  )}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    {g.product_url && (
                      <a
                        href={g.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1 gold-text hover:underline"
                      >
                        View <ExternalLink size={12} />
                      </a>
                    )}
                    <div className="ml-auto flex gap-2">
                      {g.status === "available" && (
                        <button
                          onClick={() => reserve(g)}
                          className="text-xs px-3 py-1.5 rounded-full bg-[hsl(var(--primary))] text-white hover:bg-[#b08d44]"
                          data-testid={`reserve-${g.id}`}
                        >
                          Reserve
                        </button>
                      )}
                      {g.status === "reserved" && g.mine && (
                        <>
                          <button
                            onClick={() => unreserve(g)}
                            className="text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                            data-testid={`unreserve-${g.id}`}
                          >
                            Unreserve
                          </button>
                          <button
                            onClick={() => purchased(g)}
                            className="text-xs px-3 py-1.5 rounded-full bg-[hsl(var(--primary))] text-white hover:bg-[#b08d44] flex items-center gap-1"
                            data-testid={`purchased-${g.id}`}
                          >
                            <Check size={12} /> Purchased
                          </button>
                        </>
                      )}
                      {g.status === "reserved" && !g.mine && (
                        <span className="text-xs flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                          <Lock size={12} /> Reserved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <GuestIdentifyModal
        open={openIdentify}
        onOpenChange={setOpenIdentify}
        onIdentified={() => pendingAction && pendingAction()}
      />
    </section>
  );
}
