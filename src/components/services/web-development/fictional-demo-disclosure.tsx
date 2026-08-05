import { cn } from "@/lib/utils";

export function FictionalDemoDisclosure({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside
      data-fictional-demonstration
      className={cn(
        "rounded-xl border border-[#ffb4b8]/32 bg-[#190d10]/95 px-4 py-3 text-left shadow-[0_14px_35px_rgba(0,0,0,0.28)] backdrop-blur",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[#ffb4b8]">Fictional working website demonstrations</p>
      <p className={cn("mt-1 leading-6 text-white/60", compact ? "text-xs" : "text-sm")}>
        All names, businesses, addresses, audiences, testimonials, and results shown in these demonstrations are invented for design and functionality examples.
      </p>
    </aside>
  );
}
