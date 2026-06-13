export default function Gallery() {
  return (
    <section className="wed-section" data-testid="gallery-page">
      <div className="wed-container text-center max-w-2xl">
        <p className="wed-overline">Memories</p>
        <h1 className="wed-title mt-4">Gallery, coming soon.</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-6 leading-relaxed">
          After the celebrations, this space will fill up with photographs, videos, and downloadable albums from
          every part of the wedding. Check back soon.
        </p>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 opacity-40 select-none">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-[hsl(var(--muted))] rounded" />
          ))}
        </div>
      </div>
    </section>
  );
}
