import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export type Feature = {
  title: string;
  description: string;
  icon?: ComponentType<LucideProps>;
};

type FeatureGridProps = {
  features: Feature[];
  tone?: "rukh" | "glass" | "farzin";
};

const iconTone = {
  rukh: "border-[color:var(--brand-red)]/24 bg-[color:var(--brand-red)]/10 text-[#ff9ca7]",
  glass: "border-[#16c8ff]/24 bg-[linear-gradient(135deg,rgba(22,200,255,0.14),rgba(109,49,255,0.14))] text-[#8ce8ff]",
  farzin: "border-[#f4bd43]/24 bg-[#f4bd43]/10 text-[#ffe19a]",
};

export function FeatureGrid({ features, tone = "rukh" }: FeatureGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature) => {
        const Icon = feature.icon ?? CheckCircle2;

        return (
          <Card key={feature.title} interactive className="p-5">
            <span className={`grid size-10 place-items-center rounded-xl border ${iconTone[tone]}`}>
              <Icon aria-hidden className="size-5" />
            </span>
            <h3 className="mt-5 text-base font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/58">
              {feature.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
