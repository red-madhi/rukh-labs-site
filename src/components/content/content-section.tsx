import Link from "next/link";
import { Callout } from "@/components/content/callout";
import { Checklist } from "@/components/content/checklist";
import type { ContentSection as ContentSectionData } from "@/lib/content";

export function ContentSection({ section }: { section: ContentSectionData }) {
  return (
    <section id={section.id} className="scroll-mt-28">
      <h2 className="text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{section.title}</h2>
      <div className="mt-5 grid gap-5">
        {section.blocks.map((block, index) => {
          if (block.type === "paragraph") {
            return <p key={index} className="text-base leading-8 text-white/68">{block.content}</p>;
          }

          if (block.type === "list") {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={index} className={block.ordered ? "grid list-decimal gap-3 pl-5 text-white/68" : "grid list-disc gap-3 pl-5 text-white/68"}>
                {block.items.map((item) => <li key={item} className="pl-1 leading-7">{item}</li>)}
              </List>
            );
          }

          if (block.type === "checklist") return <Checklist key={index} items={block.items} />;

          if (block.type === "callout") {
            return <Callout key={index} title={block.title} tone={block.tone}>{block.content}</Callout>;
          }

          if (block.type === "table") {
            return (
              <div key={index} className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full border-collapse text-left text-sm">
                  {block.caption ? <caption className="border-b border-white/10 px-4 py-3 text-left text-white/58">{block.caption}</caption> : null}
                  <thead className="bg-white/[0.045] text-white">
                    <tr>{block.columns.map((column) => <th key={column} scope="col" className="px-4 py-3 font-semibold">{column}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/64">
                    {block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top leading-6">{cell}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            );
          }

          if (block.type === "model") {
            return (
              <figure key={index} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <figcaption className="font-semibold text-white">{block.caption}</figcaption>
                <div className="mt-5 grid gap-3" aria-label={`${block.dimensions.join(", ")} connect to ${block.fact}`}>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {block.dimensions.map((dimension) => <li key={dimension} className="rounded-lg border border-[#16c8ff]/25 bg-[#16c8ff]/5 px-4 py-3 text-sm text-white/72">{dimension}</li>)}
                  </ul>
                  <span aria-hidden className="text-center text-xl text-[#67e8f9]">↓</span>
                  <div className="rounded-lg border border-[#9a6dff]/35 bg-[#9a6dff]/8 px-4 py-3 text-center text-sm font-semibold text-white">{block.fact}</div>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/58">{block.description}</p>
              </figure>
            );
          }

          if (block.type === "code") {
            return (
              <figure key={index} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <figcaption className="font-semibold text-white">{block.title}</figcaption>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-[#050611] p-4 text-sm leading-7 text-[#c8f4ff]"><code data-language={block.language}>{block.content}</code></pre>
                {block.description ? <p className="mt-4 text-sm leading-7 text-white/58">{block.description}</p> : null}
              </figure>
            );
          }

          return (
            <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              {block.title ? <h3 className="font-semibold text-white">{block.title}</h3> : null}
              {block.links.map((link) => {
                const className = "group rounded-md text-sm leading-6 text-[#9feaff] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[color:var(--brand-red)]";
                const content = <><span className="font-medium">{link.label}</span>{link.description ? <span className="text-white/52"> — {link.description}</span> : null}</>;

                return link.external ? (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
                ) : (
                  <Link key={link.href} href={link.href} className={className}>{content}</Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
