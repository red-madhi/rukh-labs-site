import type { ReactNode } from "react";

export default function IazmaProAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] {
            display: flex !important;
            flex-direction: column;
            gap: 0.75rem;
          }

          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div {
            display: contents;
          }

          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(1) { order: 1; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(1) { order: 2; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(2) { order: 3; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(2) { order: 4; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(3) { order: 5; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(3) { order: 6; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(4) { order: 7; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(4) { order: 8; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(5) { order: 9; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(5) { order: 10; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(6) { order: 11; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(6) { order: 12; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(7) { order: 13; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(7) { order: 14; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(8) { order: 15; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(8) { order: 16; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(9) { order: 17; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(9) { order: 18; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(10) { order: 19; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(10) { order: 20; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(11) { order: 21; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(11) { order: 22; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(1) > article:nth-child(12) { order: 23; }
          div[class~="bg-[#05070a]"][class~="lg:grid-cols-2"] > div:nth-child(2) > article:nth-child(12) { order: 24; }
        }
      `}</style>
      {children}
    </>
  );
}
