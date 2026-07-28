"use client";

import { useState } from "react";

type AtelierCategory = "All" | "Identity" | "Objects" | "Spaces";

const categories = ["All", "Identity", "Objects", "Spaces"] as const;

const projects = [
  {
    title: "Quiet House",
    type: "Identity + Spaces",
    year: "2026",
    description:
      "A quiet identity system for a Catskills residency built around pauses, thresholds, and hand-set type.",
    categories: ["Identity", "Spaces"] as const,
    art: (
      <div className="relative aspect-[4/3] overflow-hidden bg-[#3d4034]">
        <div className="absolute inset-y-0 left-[13%] w-[38%] bg-[#d6c6ab]" />
        <div className="absolute bottom-0 right-0 h-[58%] w-[56%] bg-[#7d2a24]" />
        <div className="absolute left-[27%] top-[18%] size-[24%] rounded-full border border-[#eee7d8]/75" />
        <span className="absolute bottom-5 left-5 [font-family:Georgia,'Times_New_Roman',serif] text-3xl italic text-[#fff9eb]">
          QH
        </span>
      </div>
    ),
  },
  {
    title: "Arden Objects",
    type: "Identity + Objects",
    year: "2025",
    description:
      "A restrained launch language for furniture made from salvaged hardwood.",
    categories: ["Identity", "Objects"] as const,
    art: (
      <div className="relative aspect-[4/3] overflow-hidden bg-[#c7b08d]">
        <div className="absolute inset-x-[17%] bottom-[12%] h-[15%] bg-[#382b22]" />
        <div className="absolute bottom-[26%] left-[24%] h-[44%] w-[11%] bg-[#7d2a24]" />
        <div className="absolute bottom-[26%] right-[24%] h-[44%] w-[11%] bg-[#7d2a24]" />
        <div className="absolute right-5 top-5 border-l border-[#211c18]/55 pl-3 text-[10px] uppercase tracking-[0.18em] text-[#211c18]/65">
          Salvaged / 05
        </div>
      </div>
    ),
  },
  {
    title: "Field Notes No. 7",
    type: "Identity + Editorial",
    year: "2025",
    description:
      "A seasonal journal connecting growers, cooks, and regional material culture.",
    categories: ["Identity"] as const,
    art: (
      <div className="relative aspect-[4/3] overflow-hidden bg-[#e8ddc8]">
        <div className="absolute inset-y-[8%] left-[9%] w-[40%] rotate-[-4deg] border border-[#211c18]/20 bg-[#f7f0df] shadow-[12px_16px_0_rgba(125,42,36,0.18)]">
          <span className="absolute left-4 top-4 [font-family:Georgia,'Times_New_Roman',serif] text-2xl italic">
            Field
          </span>
          <span className="absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.16em] text-[#7d2a24]">
            Notes 07
          </span>
        </div>
        <div className="absolute right-[9%] top-[14%] aspect-square w-[31%] rounded-full bg-[#8d9a78]" />
        <div className="absolute bottom-[16%] right-[18%] h-[34%] w-[15%] bg-[#b86d5d]" />
      </div>
    ),
  },
  {
    title: "Still Room",
    type: "Spaces + Editorial",
    year: "2024",
    description:
      "Titles, publication, and gallery graphics for an exhibition on domestic memory.",
    categories: ["Spaces"] as const,
    art: (
      <div className="relative aspect-[4/3] overflow-hidden bg-[#26231f]">
        <div className="absolute inset-y-[12%] left-[12%] w-px bg-[#eee7d8]/65" />
        <div className="absolute inset-x-[12%] top-[22%] h-px bg-[#eee7d8]/65" />
        <div className="absolute bottom-[13%] right-[13%] h-[51%] w-[48%] border border-[#eee7d8]/25 bg-[#7d2a24]/75" />
        <span className="absolute left-[17%] top-[27%] [font-family:Georgia,'Times_New_Roman',serif] text-4xl italic text-[#eee7d8]">
          Still
        </span>
      </div>
    ),
  },
] as const;

export function AtelierProjectGallery() {
  const [category, setCategory] = useState<AtelierCategory>("All");
  const visibleProjects =
    category === "All"
      ? projects
      : projects.filter((project) => {
          const projectCategories: readonly string[] = project.categories;
          return projectCategories.includes(category);
        });

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-x-2 gap-y-3 border-y border-[#211c18]/20 py-4">
        {categories.map((item) => {
          const active = item === category;

          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item)}
              className={`min-h-11 border px-5 text-xs font-semibold uppercase tracking-[0.14em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#7d2a24] ${
                active
                  ? "border-[#7d2a24] bg-[#7d2a24] text-[#fff8ea]"
                  : "border-transparent text-[#211c18]/54 hover:border-[#211c18]/24 hover:text-[#211c18]"
              }`}
            >
              {item}
            </button>
          );
        })}
        <span className="ml-auto hidden items-center text-xs uppercase tracking-[0.13em] text-[#211c18]/42 sm:flex">
          <span aria-live="polite">
            {visibleProjects.length} project
            {visibleProjects.length === 1 ? "" : "s"}
          </span>
        </span>
      </div>

      <div className="mt-10 grid gap-x-7 gap-y-12 md:grid-cols-2">
        {visibleProjects.map((project, index) => (
          <article
            key={project.title}
            className={index % 2 === 1 ? "md:mt-20" : ""}
          >
            <a
              href="#atelier-case-study"
              aria-label={`View the featured ${project.title} case study section`}
              className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-[#7d2a24]"
            >
              <div className="overflow-hidden">
                <div className="transition duration-500 group-hover:scale-[1.015]">
                  {project.art}
                </div>
              </div>
              <div className="mt-5 flex items-start justify-between gap-5 border-t border-[#211c18]/22 pt-4">
                <div>
                  <h3 className="[font-family:Georgia,'Times_New_Roman',serif] text-2xl italic">
                    {project.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-[#211c18]/58">
                    {project.description}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.14em] text-[#211c18]/45">
                  <span className="block">{project.type}</span>
                  <span className="mt-1 block">{project.year}</span>
                </div>
              </div>
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
