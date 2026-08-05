"use client";

import type { ComponentProps, MouseEvent } from "react";
import Link from "next/link";
import {
  trackEvent,
  type AnalyticsEventName,
} from "@/lib/analytics";

type TrackingProps = {
  eventName: AnalyticsEventName;
  eventProperties: Record<string, string | number | boolean | null | undefined>;
};

type TrackedLinkProps = ComponentProps<typeof Link> & TrackingProps;

export function TrackedLink({
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackEvent(eventName, eventProperties as never);
    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}

type TrackedAnchorProps = ComponentProps<"a"> & TrackingProps;

export function TrackedAnchor({
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackEvent(eventName, eventProperties as never);
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
