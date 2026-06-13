import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { identifyGuest } from "@/lib/guest";
import { toast } from "sonner";

export default function GuestIdentifyModal({ open, onOpenChange, onIdentified }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", receive_updates: true });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setLoading(true);
    try {
      const guest = await identifyGuest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        receive_updates: form.receive_updates,
      });
      toast.success(`Welcome, ${guest.name.split(" ")[0]}!`);
      onOpenChange(false);
      onIdentified?.(guest);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(var(--card))] border-[hsl(var(--border))]" data-testid="guest-identify-modal">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-light">A few details, please</DialogTitle>
          <DialogDescription className="text-[hsl(var(--muted-foreground))]">
            So we know who's celebrating with us. No password required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="g-name">Full name</Label>
            <Input
              id="g-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Aanya Kapoor"
              data-testid="guest-name-input"
              required
            />
          </div>
          <div>
            <Label htmlFor="g-email">Email</Label>
            <Input
              id="g-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="aanya@example.com"
              data-testid="guest-email-input"
              required
            />
          </div>
          <div>
            <Label htmlFor="g-phone">Phone (optional)</Label>
            <Input
              id="g-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 ..."
              data-testid="guest-phone-input"
            />
          </div>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={form.receive_updates}
              onCheckedChange={(v) => setForm({ ...form, receive_updates: !!v })}
              data-testid="guest-updates-checkbox"
            />
            <span>Receive wedding updates by email</span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="wed-btn-primary w-full"
            data-testid="guest-identify-submit"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
