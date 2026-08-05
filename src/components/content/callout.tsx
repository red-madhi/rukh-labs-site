import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "border-[#16c8ff]/25 bg-[#16c8ff]/[0.06] text-[#9feaff]",
  gold: "border-[#d6ad5b]/25 bg-[#d6ad5b]/[0.07] text-[#f3d99d]",
  red: "border-[#f0001c]/25 bg-[#f0001c]/[0.07] text-[#ffb4bc]",
};

export function Callout({
  title,
  children,
  tone = "blue",
}: {
  title: string;
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <aside className={cn("rounded-xl border p-5", tones[tone])}>
      <div className="flex items-start gap-3">
        <Info aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <div className="mt-2 text-sm leading-6 text-white/68">{children}</div>
        </div>
      </div>
    </aside>
  );
}
