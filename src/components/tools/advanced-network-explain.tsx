"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  Eye,
  HelpCircle,
  Lightbulb,
  MousePointerClick,
  Play,
  X,
} from "lucide-react";

export type AdvancedNetworkPurpose =
  | "action"
  | "automatic"
  | "insight"
  | "strategy"
  | "demo";

const PURPOSES = {
  action: {
    label: "Action",
    Icon: MousePointerClick,
    className:
      "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200",
  },
  automatic: {
    label: "Automatic",
    Icon: Bot,
    className: "border-[#16c8ff]/20 bg-[#16c8ff]/[0.055] text-[#9cecff]",
  },
  insight: {
    label: "Insight",
    Icon: Eye,
    className: "border-[#aa63ff]/20 bg-[#aa63ff]/[0.05] text-[#d8b5ff]",
  },
  strategy: {
    label: "Strategy",
    Icon: Lightbulb,
    className: "border-[#e6bd73]/20 bg-[#e6bd73]/[0.05] text-[#f1d49a]",
  },
  demo: {
    label: "Interactive demo",
    Icon: Play,
    className: "border-white/14 bg-white/[0.045] text-white/70",
  },
} as const;

export function PurposeBadge({
  kind,
  className = "",
}: {
  kind: AdvancedNetworkPurpose;
  className?: string;
}) {
  const purpose = PURPOSES[kind];
  const Icon = purpose.Icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${purpose.className} ${className}`}
    >
      <Icon className="size-3" aria-hidden />
      {purpose.label}
    </span>
  );
}

type FloatingPosition = {
  left: number;
  top: number;
  width: number;
};

const HELP_OPEN_EVENT = "rukh:iazma-help-open";

export function HelpPopover({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const rawId = useId();
  const popoverId = `iazma-help-${rawId.replaceAll(":", "")}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition>({
    left: 12,
    top: 12,
    width: 288,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const placePanel = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const gutter = 12;
    const gap = 8;
    const width = Math.min(320, Math.max(240, window.innerWidth - gutter * 2));
    const estimatedHeight = panelRef.current?.offsetHeight ?? 170;
    const below = rect.bottom + gap;
    const above = rect.top - estimatedHeight - gap;
    const top =
      below + estimatedHeight <= window.innerHeight - gutter || above < gutter
        ? Math.min(below, window.innerHeight - estimatedHeight - gutter)
        : Math.max(gutter, above);
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(gutter, Math.min(centered, window.innerWidth - width - gutter));

    setPosition({ left, top: Math.max(gutter, top), width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
    const frame = window.requestAnimationFrame(placePanel);
    return () => window.cancelAnimationFrame(frame);
  }, [open, placePanel]);

  useEffect(() => {
    if (!open) return;

    const onOtherHelp = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>;
      if (custom.detail?.id !== popoverId) setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onViewportChange = () => placePanel();

    window.addEventListener(HELP_OPEN_EVENT, onOtherHelp as EventListener);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener(HELP_OPEN_EVENT, onOtherHelp as EventListener);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, placePanel, popoverId]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        window.dispatchEvent(
          new CustomEvent(HELP_OPEN_EVENT, { detail: { id: popoverId } }),
        );
      }
      return next;
    });
  }

  return (
    <span className={`inline-flex align-middle ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`Explain ${label}`}
        aria-expanded={open}
        aria-controls={popoverId}
        className="inline-grid size-5 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.035] text-white/42 outline-none transition hover:border-[#16c8ff]/35 hover:bg-[#16c8ff]/[0.065] hover:text-[#b9f1ff] focus-visible:border-[#16c8ff]/50 focus-visible:text-[#b9f1ff]"
      >
        <HelpCircle className="size-3" aria-hidden />
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              id={popoverId}
              role="dialog"
              aria-label={label}
              style={position}
              className="fixed z-[120] rounded-2xl border border-[#16c8ff]/22 bg-[#080b10]/98 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8ce8ff]">
                    What this means
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-white">{label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/8 text-white/38 transition hover:border-white/18 hover:text-white"
                  aria-label="Close explanation"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
              <div className="mt-3 text-xs leading-5 text-white/58">{children}</div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

export function PurposeExplanation({
  kind,
  title,
  children,
  className = "",
}: {
  kind: AdvancedNetworkPurpose;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/8 bg-black/18 p-3.5 ${className}`}
    >
      <PurposeBadge kind={kind} />
      <p className="mt-2 text-xs font-semibold text-white/78">{title}</p>
      <div className="mt-1.5 text-[11px] leading-5 text-white/42">{children}</div>
    </div>
  );
}
