"use client";

import { useState } from "react";

type MenuCategory = "Bakery" | "Breakfast & Lunch" | "Drinks";

const menu = {
  Bakery: [
    {
      name: "Brown Butter Morning Bun",
      description: "Cultured butter, orange sugar, sea salt",
      price: "$5",
    },
    {
      name: "Seeded Country Loaf",
      description: "Sourdough, sunflower, sesame, flax",
      price: "$9",
    },
    {
      name: "Lemon Olive Oil Cake",
      description: "Meyer lemon, local olive oil, soft cream",
      price: "$6",
    },
    {
      name: "Cheddar Chive Scone",
      description: "Aged cheddar, garden chive, cracked pepper",
      price: "$5",
    },
  ],
  "Breakfast & Lunch": [
    {
      name: "Market Toast",
      description: "Ricotta, roasted tomato, herbs, country bread",
      price: "$12",
    },
    {
      name: "Egg & Jammy Pepper Biscuit",
      description: "Soft egg, sweet pepper relish, sharp cheddar",
      price: "$11",
    },
    {
      name: "Juniper Granola",
      description: "Oats, seeds, seasonal fruit, cultured yogurt",
      price: "$9",
    },
    {
      name: "Little Breakfast",
      description: "Soft egg, toast fingers, fruit, morning bun half",
      price: "$8",
    },
  ],
  Drinks: [
    {
      name: "House Coffee",
      description: "Rotating locally roasted filter coffee",
      price: "$4",
    },
    {
      name: "Salted Maple Latte",
      description: "Espresso, maple, sea salt, milk of choice",
      price: "$6",
    },
    {
      name: "Cardamom Cold Brew",
      description: "Slow-steeped coffee, cardamom cream",
      price: "$6",
    },
    {
      name: "Citrus Sparkler",
      description: "Lemon, orange, rosemary, sparkling water",
      price: "$5",
    },
  ],
} as const satisfies Record<
  MenuCategory,
  readonly { name: string; description: string; price: string }[]
>;

const categories = Object.keys(menu) as MenuCategory[];

export function MainStreetMenu() {
  const [category, setCategory] = useState<MenuCategory>("Bakery");
  const items = menu[category];

  return (
    <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#173f32]/16 bg-[#fffdf7] shadow-[0_24px_70px_rgba(23,63,50,0.08)]">
      <div
        aria-label="Menu categories"
        className="flex flex-wrap gap-2 border-b border-[#173f32]/14 bg-[#f3e5c9] p-3 sm:p-4"
      >
        {categories.map((item) => {
          const active = item === category;

          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item)}
              className={`min-h-11 rounded-full px-5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#173f32] ${
                active
                  ? "bg-[#173f32] text-[#fff8e9]"
                  : "text-[#173f32]/62 hover:bg-white/70 hover:text-[#173f32]"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[0.56fr_1.44fr]">
        <div className="relative min-h-64 overflow-hidden bg-[#efb84c] p-7 sm:p-9">
          <div
            aria-hidden
            className="absolute right-[-2rem] top-[-2rem] size-48 rounded-[42%_58%_56%_44%] bg-[#d9673f]"
          />
          <div
            aria-hidden
            className="absolute bottom-[-3rem] left-[-2rem] size-52 rounded-[62%_38%_43%_57%] border-[18px] border-[#fff8e9]/55"
          />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#173f32]/58">
              Today&apos;s {category.toLowerCase()}
            </p>
            <h3 className="mt-4 max-w-[9ch] text-4xl font-black leading-[0.92] tracking-[-0.05em] text-[#173f32] sm:text-5xl">
              Made before the doors open.
            </h3>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#173f32]/68">
              Small batches mean the counter changes through the day. Come early
              for the widest choice.
            </p>
          </div>
        </div>

        <div aria-live="polite" className="grid sm:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.name}
              className="grid min-h-40 grid-cols-[1fr_auto] content-start gap-x-5 border-b border-[#173f32]/12 p-6 odd:border-r-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <h4 className="text-lg font-extrabold tracking-[-0.025em] text-[#173f32]">
                {item.name}
              </h4>
              <span className="text-base font-black text-[#d35b35]">{item.price}</span>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#173f32]/58">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
