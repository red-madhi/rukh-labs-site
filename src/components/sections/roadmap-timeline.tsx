import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type RoadmapItem = {
  title: string;
  description: string;
  status: "Done" | "Active" | "Research" | "Upcoming";
};

type RoadmapTimelineProps = {
  items: RoadmapItem[];
};

export function RoadmapTimeline({ items }: RoadmapTimelineProps) {
  return (
    <div className="relative grid gap-4">
      <div aria-hidden className="absolute bottom-0 left-5 top-0 hidden w-px bg-white/10 sm:block" />
      {items.map((item, index) => (
        <div key={item.title} className="relative sm:pl-14">
          <span className="absolute left-[13px] top-6 hidden size-4 rounded-full border border-[color:var(--brand-red)]/45 bg-[#100708] shadow-[0_0_22px_rgba(183,29,37,0.45)] sm:block" />
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-white/42">Phase {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
              </div>
              <Badge tone={item.status === "Active" ? "gold" : "blue"}>
                {item.status}
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/60">{item.description}</p>
          </Card>
        </div>
      ))}
    </div>
  );
}
