"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";

type MembershipPlan = "free" | "supporting";

const plans = {
  free: {
    name: "Free reader",
    price: "Free",
    description: "Public essays, selected notes, and every new issue by email.",
    benefits: [
      "The Thursday Letter",
      "All public essays",
      "Selected field notes",
    ],
  },
  supporting: {
    name: "Supporting member",
    price: "$8 / month · sample price",
    description:
      "The complete publication, audio editions, and the full searchable archive.",
    benefits: [
      "Every essay and field note",
      "Complete searchable archive",
      "Audio editions",
    ],
  },
} as const;

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white";

export function DispatchMembershipDemo() {
  const [plan, setPlan] = useState<MembershipPlan>("free");
  const [email, setEmail] = useState("");
  const [complete, setComplete] = useState(false);
  const selectedPlan = plans[plan];

  if (complete) {
    return (
      <div
        role="status"
        className="rounded-[1.7rem] bg-[#fbfaf7] p-7 text-[#151a18] sm:p-9"
      >
        <span className="grid size-12 place-items-center rounded-full bg-[#e8efe9] text-[#1e5748]">
          <Check aria-hidden className="size-5" strokeWidth={2.5} />
        </span>
        <p className="mt-7 text-xs font-semibold text-[#a83b2b]">
          Demo membership preview
        </p>
        <h3 className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-4xl font-bold leading-[0.98] tracking-[-0.045em]">
          You chose {selectedPlan.name.toLocaleLowerCase()}.
        </h3>
        <p className="mt-5 text-sm leading-7 text-[#151a18]/66">
          A production site would now create the membership and send a
          confirmation. This concept kept everything in your browser and did
          not submit <strong>{email}</strong>.
        </p>
        <button
          type="button"
          onClick={() => setComplete(false)}
          className="mt-7 min-h-11 rounded-full bg-[#151a18] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b8402d]"
        >
          Try the other plan
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setComplete(true);
      }}
      className="rounded-[1.7rem] border border-white/12 bg-white/[0.055] p-5 sm:p-7"
    >
      <fieldset>
        <legend className="text-xs font-semibold text-white/68">
          Choose a membership preview
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(plans) as MembershipPlan[]).map((planId) => {
            const option = plans[planId];
            const active = planId === plan;

            return (
              <button
                key={planId}
                type="button"
                aria-pressed={active}
                onClick={() => setPlan(planId)}
                className={`rounded-2xl border p-4 text-left transition ${focus} ${
                  active
                    ? "border-white bg-white text-[#151a18]"
                    : "border-white/14 bg-transparent text-white hover:border-white/32"
                }`}
              >
                <span
                  className={`block text-xs font-semibold ${
                    active ? "text-[#a83b2b]" : "text-[#f1a08a]"
                  }`}
                >
                  {option.name}
                </span>
                <strong className="mt-2 block text-sm">
                  {option.price}
                </strong>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 rounded-2xl bg-black/14 p-5">
        <h3 className="[font-family:Georgia,'Times_New_Roman',serif] text-3xl font-bold">
          {selectedPlan.name}
        </h3>
        <p className="mt-3 text-sm leading-7 text-white/68">
          {selectedPlan.description}
        </p>
        <ul className="mt-5 grid gap-2">
          {selectedPlan.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 text-sm text-white/68"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-[#f1a08a]"
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <label className="mt-6 block">
        <span className="text-xs font-semibold text-white/68">
          Email address
        </span>
        <span className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-white/16 bg-white/[0.07] px-4 focus-within:border-white/46 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white">
          <Mail aria-hidden className="size-4 shrink-0 text-white/54" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="reader@example.com"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </span>
      </label>

      <button
        type="submit"
        className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#b8402d] px-5 text-sm font-semibold text-white transition hover:bg-[#9d3324] ${focus}`}
      >
        Preview joining {plan === "free" ? "for free" : "as a supporter"}
        <ArrowRight aria-hidden className="size-4" />
      </button>
      <p className="mt-4 text-[11px] leading-5 text-white/58">
        Demo only. The address stays in this page and is never submitted,
        stored, or added to a mailing list.
      </p>
    </form>
  );
}
