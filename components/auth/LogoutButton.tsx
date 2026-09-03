"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { logOut } from "@/lib/actions/auth";

type Props = {
  showLabel?: boolean;
};

export function LogoutButton({ showLabel = false }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logOut();
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm text-text-muted hover:text-text-primary transition-colors w-full disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 size={16} className="shrink-0 animate-spin" />
      ) : (
        <LogOut size={16} className="shrink-0" />
      )}
      <span className={showLabel ? "inline" : "hidden lg:inline"}>
        {isPending ? "Logging out…" : "Log out"}
      </span>
    </button>
  );
}
