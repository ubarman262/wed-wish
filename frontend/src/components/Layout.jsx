import { Outlet, NavLink, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", key: "home" },
  { to: "/our-story", label: "Our Story", key: "our_story" },
  { to: "/events", label: "Events", key: "events" },
  { to: "/registry", label: "Registry", key: "registry" },
  { to: "/cash-gifts", label: "Cash Gifts", key: "cash_gifts" },
  { to: "/gallery", label: "Gallery", key: "gallery" },
  { to: "/contact", label: "Contact", key: "contact" },
];

export default function Layout() {
  const [settings, setSettings] = useState({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => {});
  }, []);

  const coupleShort = `${settings.couple_name_1 || "U"} & ${settings.couple_name_2 || "K"}`;
  const vp = settings.visible_pages || {};
  const navItems = NAV.filter((n) => n.key === "home" || vp[n.key] !== false);

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-40 backdrop-blur-md bg-[hsl(var(--background))]/80 border-b border-[hsl(var(--border))]"
        data-testid="site-header"
      >
        <div className="wed-container flex items-center justify-between py-5">
          <Link to="/" className="font-serif text-2xl tracking-tight italic gold-text" data-testid="site-logo">
            {coupleShort}
          </Link>
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors ${
                    isActive
                      ? "text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="lg:hidden text-[hsl(var(--foreground))]"
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="mobile-menu">
            <div className="wed-container flex flex-col py-4 gap-3">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `text-sm py-2 ${isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[hsl(var(--border))] py-12 mt-20" data-testid="site-footer">
        <div className="wed-container text-center space-y-3">
          <div className="font-serif italic text-3xl gold-text">{coupleShort}</div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            With love, made for our forever — {new Date().getFullYear()}.
          </p>
          <Link to="/admin" className="text-xs text-[hsl(var(--muted-foreground))] hover:gold-text" data-testid="footer-admin-link">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
