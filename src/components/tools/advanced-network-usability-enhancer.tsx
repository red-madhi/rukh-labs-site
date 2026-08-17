"use client";

import { useEffect } from "react";

const WORKSPACE_ID = "iazma-pro-workspace";
const HANDLE_PATTERN = /@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)/gi;

type EnhancementState = {
  xpAutoOpened: boolean;
};

function singleBlueskyHandle(text: string) {
  const handles = Array.from(text.matchAll(HANDLE_PATTERN))
    .map((match) => match[1]?.toLowerCase())
    .filter((handle): handle is string => Boolean(handle?.includes(".")));
  const unique = Array.from(new Set(handles));
  return unique.length === 1 ? unique[0] : null;
}

function markProfileHotlinks(root: HTMLElement) {
  const elements = root.querySelectorAll<HTMLElement>("p, span, code, small, strong");

  for (const element of elements) {
    if (element.closest('a[href*="bsky.app/profile/"]')) continue;
    if (element.childElementCount > 0) continue;

    const text = element.textContent?.trim() ?? "";
    const handle = text.length <= 180 ? singleBlueskyHandle(text) : null;

    if (!handle) {
      if (element.dataset.iazmaProfileHandle) {
        delete element.dataset.iazmaProfileHandle;
        element.removeAttribute("title");
        if (element.dataset.iazmaProfileKeyboard === "true") {
          element.removeAttribute("role");
          element.removeAttribute("tabindex");
          element.removeAttribute("aria-label");
          delete element.dataset.iazmaProfileKeyboard;
        }
      }
      continue;
    }

    element.dataset.iazmaProfileHandle = handle;
    element.title = `Open @${handle} on Bluesky`;

    if (!element.closest("button, summary")) {
      element.setAttribute("role", "link");
      element.tabIndex = 0;
      element.setAttribute("aria-label", `Open @${handle} on Bluesky`);
      element.dataset.iazmaProfileKeyboard = "true";
    }
  }
}

function markRecommendationLayout(root: HTMLElement) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>("article"));

  for (const card of cards) {
    const hasRecommendationDetails = Array.from(card.querySelectorAll("summary")).some(
      (summary) => summary.textContent?.trim() === "See details",
    );
    if (!hasRecommendationDetails) continue;

    const rankText = card.firstElementChild?.firstElementChild?.textContent?.trim() ?? "";
    const rank = Number(rankText);
    if (!Number.isInteger(rank) || rank < 1) continue;

    const column = card.parentElement;
    const grid = column?.parentElement;
    if (!column || !grid || grid.children.length !== 2) continue;

    grid.dataset.iazmaRecommendationGrid = "true";
    for (const child of Array.from(grid.children)) {
      if (child instanceof HTMLElement) child.dataset.iazmaRecommendationColumn = "true";
    }

    card.dataset.iazmaRecommendationCard = "true";
    card.style.setProperty("--iazma-rank", String(rank));
  }
}

function markPremiumXp(root: HTMLElement, state: EnhancementState) {
  const xpButton = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    button.textContent?.includes("View the XP chart"),
  );

  if (xpButton) {
    const xpPanel = xpButton.parentElement;
    if (xpPanel) xpPanel.dataset.iazmaXpPanel = "true";

    if (!state.xpAutoOpened) {
      state.xpAutoOpened = true;
      if (xpButton.getAttribute("aria-expanded") !== "true") {
        window.requestAnimationFrame(() => xpButton.click());
      }
    }
  }

  const xpHeading = Array.from(root.querySelectorAll<HTMLHeadingElement>("h3")).find((heading) =>
    heading.textContent?.includes("Where your Network Level XP came from"),
  );
  const chartSurface = xpHeading?.parentElement?.parentElement?.parentElement;
  if (chartSurface instanceof HTMLElement) chartSurface.dataset.iazmaXpChart = "true";
}

function enhance(root: HTMLElement, state: EnhancementState) {
  markProfileHotlinks(root);
  markRecommendationLayout(root);
  markPremiumXp(root, state);
}

function openProfile(handle: string) {
  const opened = window.open(
    `https://bsky.app/profile/${encodeURIComponent(handle)}`,
    "_blank",
    "noopener,noreferrer",
  );
  if (opened) opened.opener = null;
}

export function AdvancedNetworkUsabilityEnhancer() {
  useEffect(() => {
    const root = document.getElementById(WORKSPACE_ID);
    if (!root) return;

    const state: EnhancementState = { xpAutoOpened: false };
    let frame = 0;
    const scheduleEnhance = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        enhance(root, state);
      });
    };

    enhance(root, state);

    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-expanded"],
    });

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const hotlink = target?.closest<HTMLElement>("[data-iazma-profile-handle]");
      if (!hotlink || !root.contains(hotlink)) return;
      if (target?.closest('a[href*="bsky.app/profile/"]')) return;

      const handle = hotlink.dataset.iazmaProfileHandle;
      if (!handle) return;

      event.preventDefault();
      event.stopPropagation();
      openProfile(handle);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target instanceof Element ? event.target : null;
      const hotlink = target?.closest<HTMLElement>("[data-iazma-profile-handle]");
      if (!hotlink || !root.contains(hotlink)) return;
      if (hotlink.closest("button, summary")) return;

      const handle = hotlink.dataset.iazmaProfileHandle;
      if (!handle) return;

      event.preventDefault();
      event.stopPropagation();
      openProfile(handle);
    };

    root.addEventListener("click", onClick, true);
    root.addEventListener("keydown", onKeyDown, true);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return (
    <style>{`
      #${WORKSPACE_ID} [data-iazma-profile-handle] {
        cursor: pointer;
        text-decoration-line: underline;
        text-decoration-style: dotted;
        text-decoration-color: rgba(140, 232, 255, 0.42);
        text-underline-offset: 3px;
        transition: color 160ms ease, text-decoration-color 160ms ease;
      }

      #${WORKSPACE_ID} [data-iazma-profile-handle]:hover,
      #${WORKSPACE_ID} [data-iazma-profile-handle]:focus-visible {
        color: #b9f1ff !important;
        text-decoration-color: rgba(185, 241, 255, 0.9);
        outline: none;
      }

      #${WORKSPACE_ID} [data-iazma-profile-handle]::after {
        content: " ↗";
        display: inline;
        font-size: 0.82em;
        font-weight: 700;
        color: #8ce8ff;
        opacity: 0.62;
        text-decoration: none;
      }

      #${WORKSPACE_ID} [data-iazma-xp-panel="true"] {
        position: relative;
        overflow: hidden;
        border-color: rgba(170, 99, 255, 0.28) !important;
        background:
          radial-gradient(circle at 18% 0%, rgba(22, 200, 255, 0.10), transparent 34%),
          radial-gradient(circle at 86% 4%, rgba(170, 99, 255, 0.17), transparent 42%),
          linear-gradient(155deg, rgba(15, 12, 22, 0.98), rgba(7, 8, 12, 0.98)) !important;
        box-shadow:
          0 22px 70px rgba(0, 0, 0, 0.28),
          0 0 44px rgba(170, 99, 255, 0.055),
          inset 0 1px 0 rgba(255, 255, 255, 0.045);
      }

      #${WORKSPACE_ID} [data-iazma-xp-panel="true"]::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.028) 48%, transparent 72%);
      }

      #${WORKSPACE_ID} [data-iazma-xp-panel="true"] > * {
        position: relative;
        z-index: 1;
      }

      #${WORKSPACE_ID} [data-iazma-xp-chart="true"] {
        border-color: rgba(170, 99, 255, 0.24) !important;
        background:
          radial-gradient(circle at 8% 0%, rgba(22, 200, 255, 0.07), transparent 32%),
          radial-gradient(circle at 92% 0%, rgba(170, 99, 255, 0.10), transparent 36%),
          rgba(0, 0, 0, 0.22) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.025), 0 18px 55px rgba(0,0,0,0.20);
      }

      #${WORKSPACE_ID} [data-iazma-premium-map="true"] svg {
        filter: saturate(1.08) contrast(1.025);
      }

      #${WORKSPACE_ID} [data-iazma-premium-map="true"] button,
      #${WORKSPACE_ID} [data-iazma-premium-map="true"] a {
        transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, transform 160ms ease;
      }

      #${WORKSPACE_ID} [data-iazma-premium-map="true"] button:hover,
      #${WORKSPACE_ID} [data-iazma-premium-map="true"] a:hover {
        transform: translateY(-1px);
      }

      @media (max-width: 1023px) {
        #${WORKSPACE_ID} [data-iazma-recommendation-grid="true"] {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.75rem !important;
        }

        #${WORKSPACE_ID} [data-iazma-recommendation-column="true"] {
          display: contents !important;
        }

        #${WORKSPACE_ID} [data-iazma-recommendation-card="true"] {
          order: var(--iazma-rank, 999) !important;
        }
      }
    `}</style>
  );
}