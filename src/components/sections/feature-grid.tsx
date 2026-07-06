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
};

export function FeatureGrid({ features }: FeatureGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature) => {
        const Icon = feature.icon ?? CheckCircle2;

        return (
          <Card key={feature.title} interactive className="p-5">
            <span className="grid size-10 place-items-center rounded-lg border border-[#d6ad5b]/20 bg-[#d6ad5b]/10 text-[#f3d99d]">
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
