import Image from "next/image";
import { cn } from "@/lib/utils";

type Brand = "rukh-labs" | "rukh-labs-stacked" | "glass-squares" | "farzin";

const brandAssets: Record<
  Brand,
  { src: string; alt: string; width: number; height: number }
> = {
  "rukh-labs": {
    src: "/brand/rukh-labs-primary.png",
    alt: "Rukh Labs — Apps, Websites, Digital Products. Smart Solutions. Local Impact.",
    width: 1549,
    height: 690,
  },
  "rukh-labs-stacked": {
    src: "/brand/rukh-labs-stacked.png",
    alt: "Rukh Labs",
    width: 1254,
    height: 1254,
  },
  "glass-squares": {
    src: "/brand/glass-squares-official.webp",
    alt: "Glass Squares OS",
    width: 900,
    height: 900,
  },
  farzin: {
    src: "/brand/farzin-official.webp",
    alt: "Farzin",
    width: 900,
    height: 900,
  },
};

type OfficialBrandArtProps = {
  brand: Brand;
  className?: string;
  priority?: boolean;
  decorative?: boolean;
};

export function OfficialBrandArt({
  brand,
  className,
  priority = false,
  decorative = false,
}: OfficialBrandArtProps) {
  const asset = brandAssets[brand];

  return (
    <Image
      src={asset.src}
      alt={decorative ? "" : asset.alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      className={cn("block h-auto max-w-full select-none", className)}
    />
  );
}
