import { Check } from "lucide-react";

export function Checklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-3" aria-label="Checklist">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-base leading-7 text-white/68">
          <Check aria-hidden className="mt-1 size-4 shrink-0 text-[#67e8f9]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
