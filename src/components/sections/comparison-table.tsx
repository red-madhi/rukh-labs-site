import { Card } from "@/components/ui/card";

type ComparisonRow = {
  label: string;
  other: string;
  farzin: string;
};

type ComparisonTableProps = {
  rows: ComparisonRow[];
};

export function ComparisonTable({ rows }: ComparisonTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.035] text-sm font-semibold text-white">
        <div className="px-4 py-4 sm:px-6">Focus area</div>
        <div className="px-4 py-4 sm:px-6">Noisy platforms</div>
        <div className="px-4 py-4 sm:px-6 text-[#f3d99d]">Farzin</div>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 sm:grid-cols-3">
            <div className="px-4 py-4 text-sm font-semibold text-white sm:px-6">
              {row.label}
            </div>
            <div className="px-4 py-4 text-sm leading-6 text-white/56 sm:px-6">
              {row.other}
            </div>
            <div className="px-4 py-4 text-sm leading-6 text-white/74 sm:px-6">
              {row.farzin}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
