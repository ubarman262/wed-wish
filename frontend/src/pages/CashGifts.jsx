import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import GuestIdentifyModal from "@/components/GuestIdentifyModal";
import { hasGuest } from "@/lib/guest";
import { toast } from "sonner";

export default function CashGifts() {
  const [settings, setSettings] = useState({});
  const [funds, setFunds] = useState([]);
  const [openIdentify, setOpenIdentify] = useState(false);
  const [contribFund, setContribFund] = useState(null);
  const [form, setForm] = useState({ amount: "", message: "", txn_ref: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/settings").then((r) => setSettings(r.data || {}));
    api.get("/funds").then((r) => setFunds(r.data || []));
  };
  useEffect(() => { load(); }, []);

  const upi = settings.upi_id || "";
  const qrUrl = upi ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=${upi}&pn=${encodeURIComponent((settings.couple_name_1 || "") + " & " + (settings.couple_name_2 || ""))}`)}` : "";

  const copy = () => {
    if (!upi) return;
    navigator.clipboard.writeText(upi);
    toast.success("UPI ID copied");
  };

  const startContribute = (f) => {
    if (!hasGuest()) {
      setOpenIdentify(true);
      setContribFund(f);
      return;
    }
    setContribFund(f);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await api.post("/contributions", {
        fund_id: contribFund.id,
        amount: amt,
        message: form.message || null,
        txn_ref: form.txn_ref || null,
      });
      toast.success("Thank you for your generous contribution!");
      setContribFund(null);
      setForm({ amount: "", message: "", txn_ref: "" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not record contribution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="wed-section" data-testid="cash-gifts-page">
      <div className="wed-container">
        <p className="wed-overline">Blessings in Cash</p>
        <h1 className="wed-title mt-4">Contribute to our future.</h1>

        {/* UPI Block */}
        <div className="mt-12 grid lg:grid-cols-12 gap-10 items-center wed-card p-8 md:p-12">
          <div className="lg:col-span-7 space-y-5">
            <h2 className="font-serif text-3xl">Quick UPI Transfer</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              Scan the QR with any UPI app or copy the ID below. After paying, please record your contribution against one of the funds.
            </p>
            {upi && (
              <div className="flex items-center gap-3 max-w-md">
                <Input value={upi} readOnly className="font-mono" data-testid="upi-id-display" />
                <button onClick={copy} className="wed-btn-outline px-4 py-2" data-testid="copy-upi-btn">
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="lg:col-span-5 flex justify-center">
            {qrUrl && (
              <div className="p-4 bg-white border border-[hsl(var(--border))] rounded-lg">
                <img src={qrUrl} alt="UPI QR" className="w-64 h-64" data-testid="upi-qr-code" />
              </div>
            )}
          </div>
        </div>

        {/* Funds */}
        <div className="mt-20">
          <h2 className="font-serif text-3xl">Our Funds</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {funds.map((f) => {
              const pct = f.goal_amount ? Math.min(100, (f.raised / f.goal_amount) * 100) : 0;
              return (
                <div key={f.id} className="wed-card p-6 flex flex-col" data-testid={`fund-card-${f.id}`}>
                  <h3 className="font-serif text-2xl">{f.name}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 flex-1">{f.description}</p>
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="gold-text font-medium">₹{f.raised.toLocaleString("en-IN")}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">of ₹{f.goal_amount.toLocaleString("en-IN")}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" data-testid={`fund-progress-${f.id}`} />
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {f.contributor_count} contributors
                    </div>
                  </div>
                  <button
                    onClick={() => startContribute(f)}
                    className="wed-btn-primary mt-5 w-full"
                    data-testid={`contribute-btn-${f.id}`}
                  >
                    Record contribution
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GuestIdentifyModal open={openIdentify} onOpenChange={setOpenIdentify} onIdentified={() => {}} />

      <Dialog open={!!contribFund && hasGuest()} onOpenChange={(v) => !v && setContribFund(null)}>
        <DialogContent className="bg-[hsl(var(--card))]" data-testid="contribute-modal">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl font-light">Record — {contribFund?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="amt">Amount (₹)</Label>
              <Input
                id="amt"
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                data-testid="contribute-amount"
              />
            </div>
            <div>
              <Label htmlFor="ref">Transaction ref (optional)</Label>
              <Input
                id="ref"
                value={form.txn_ref}
                onChange={(e) => setForm({ ...form, txn_ref: e.target.value })}
                placeholder="UPI ref or note"
                data-testid="contribute-ref"
              />
            </div>
            <div>
              <Label htmlFor="msg">Message (optional)</Label>
              <Textarea
                id="msg"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                data-testid="contribute-message"
              />
            </div>
            <button type="submit" className="wed-btn-primary w-full" disabled={saving} data-testid="contribute-submit">
              {saving ? "Saving..." : "Submit"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
