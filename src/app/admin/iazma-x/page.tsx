import type { Metadata } from "next";
import { IazmaXWorkspace } from "@/components/tools/iazma-x-workspace";

export const metadata: Metadata = {
  title: "IAZMA X | Rukh Labs Admin",
  description: "Private local-first IAZMA network workspace for X.",
  robots: { index: false, follow: false },
};

export default function IazmaXPage() {
  return <IazmaXWorkspace />;
}
