"use client";

import { useEffect, useRef, useState } from "react";

// Shared toast-message state: clears itself after `durationMs`, and clears
// the pending timer on unmount so a delayed navigation away doesn't call
// setState on an unmounted component.
export function useToast(durationMs = 2200) {
  const [toast, setToast] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), durationMs);
  }

  return { toast, showToast };
}
