"use client";

import { useEffect } from "react";

export function NotFoundFocus() {
  useEffect(() => {
    document.getElementById("not-found-heading")?.focus();
  }, []);

  return null;
}
