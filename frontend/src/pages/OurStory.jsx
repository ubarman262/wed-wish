import { useEffect, useState } from "react";
import { api, resolveImage } from "@/lib/api";

export default function OurStory() {
  const [s, setS] = useState({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => {
    api.get("/settings").then((r) => {
      setS(r.data || {});
      setSettingsLoaded(true);
    });
  }, []);
  return (
    <section className="wed-section" data-testid="our-story-page">
      <div className="wed-container max-w-4xl">
        <p className="wed-overline text-center">Our Story</p>
        <h1 className="wed-title text-center mt-4">
          {s.couple_name_1} <span className="gold-text italic">&</span> {s.couple_name_2}
        </h1>
        <div className="aspect-[16/9] mt-12 mb-12 overflow-hidden rounded-lg">
          {(() => {
            const uploaded = resolveImage(s.story_image);
            const fallback = "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?w=1200";
            const src = uploaded || (settingsLoaded ? fallback : null);
            return src ? (
              <img src={src} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            );
          })()}
        </div>
        <div className="prose prose-lg max-w-none text-[hsl(var(--muted-foreground))] leading-loose font-light text-lg">
          {(s.story_content || "").split("\n").map((p, i) => (
            <p key={i} className="mb-6">{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
