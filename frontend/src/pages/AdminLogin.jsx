import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("wedwish_admin_token")) {
      nav("/admin/dashboard");
    }
  }, [nav]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", form);
      localStorage.setItem("wedwish_admin_token", data.token);
      toast.success("Welcome back");
      nav("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="wed-overline">WedWish</p>
          <h1 className="font-serif text-4xl mt-3">Admin</h1>
        </div>
        <form onSubmit={submit} className="wed-card p-8 space-y-5">
          <div>
            <Label htmlFor="u">Username</Label>
            <Input id="u" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required data-testid="admin-username" />
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required data-testid="admin-password" />
          </div>
          <button type="submit" disabled={loading} className="wed-btn-primary w-full" data-testid="admin-login-submit">
            {loading ? "..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
