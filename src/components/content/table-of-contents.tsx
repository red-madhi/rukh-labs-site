export function TableOfContents({
  items,
}: {
  items: readonly { id: string; title: string }[];
}) {
  return (
    <nav aria-label="On this page" className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/46">On this page</p>
      <ol className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-sm leading-6 text-white/64 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]"
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
