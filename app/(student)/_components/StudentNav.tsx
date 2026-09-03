"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, Zap, CircleCheck, BarChart3, BookOpen, Compass, Library } from "lucide-react";
import { MobileMoreSheet } from "@/components/ui/MobileMoreSheet";
import { LogoutButton } from "@/components/auth/LogoutButton";

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { path: "/dashboard/student", label: "Overview", icon: LayoutGrid, exact: true },
  { path: "/", label: "Browse Courses", icon: Compass, exact: true },
  { path: "/dashboard/student/challenge", label: "Daily Challenge", icon: Zap },
  { path: "/dashboard/student/practice", label: "Practice", icon: Library },
  { path: "/dashboard/student/checkin", label: "Check-in", icon: CircleCheck },
  { path: "/dashboard/student/sprint", label: "Sprint Board", icon: BarChart3 },
  { path: "/dashboard/student/journal", label: "AI Journal", icon: BookOpen },
];

const BOTTOM_PRIMARY_PATHS = [
  "/dashboard/student",
  "/dashboard/student/challenge",
  "/dashboard/student/checkin",
];

type Props = {
  variant?: "sidebar" | "bottom";
};

export function StudentNav({ variant = "sidebar" }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");

  function href(path: string) {
    return courseId ? `${path}?courseId=${courseId}` : path;
  }

  if (variant === "bottom") {
    const primaryItems = navItems.filter((item) => BOTTOM_PRIMARY_PATHS.includes(item.path));
    const moreItems = navItems.filter((item) => !BOTTOM_PRIMARY_PATHS.includes(item.path));
    const isMoreActive = moreItems.some(({ path, exact, disabled }) =>
      !disabled && (exact ? pathname === path : pathname.startsWith(path))
    );

    return (
      <>
        {primaryItems.map(({ path, label, icon: Icon, exact, disabled }) => {
          const isActive = !disabled && (exact ? pathname === path : pathname.startsWith(path));

          if (disabled) {
            return (
              <div
                key={path}
                title="Coming Soon"
                className="flex flex-1 flex-col items-center gap-1 py-4 px-1 opacity-40 cursor-not-allowed"
              >
                <Icon size={20} className="shrink-0" />
                <span className="text-[10px] font-medium text-text-faint leading-none text-center">{label}</span>
              </div>
            );
          }

          return (
            <Link
              key={path}
              href={href(path)}
              className={[
                "flex flex-1 flex-col items-center gap-1 py-6 px-1 transition-colors",
                isActive ? "text-gold" : "text-text-secondary",
              ].join(" ")}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-[10px] font-medium leading-none text-center">{label}</span>
            </Link>
          );
        })}
        <MobileMoreSheet
          active={isMoreActive}
          items={moreItems.map(({ path, label, icon }) => ({ href: href(path), label, icon }))}
        >
          <LogoutButton showLabel />
        </MobileMoreSheet>
      </>
    );
  }

  return (
    <>
      {navItems.map(({ path, label, icon: Icon, exact, disabled }) => {
        const isActive = !disabled && (exact ? pathname === path : pathname.startsWith(path));

        if (disabled) {
          return (
            <div
              key={path}
              title="Coming Soon"
              className={[
                "relative flex items-center gap-2.75 px-3.25 py-2.5 rounded-[10px]",
                "text-sm whitespace-nowrap shrink-0 lg:w-full",
                "text-text-faint font-medium cursor-not-allowed opacity-50",
                "group",
              ].join(" ")}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden sm:inline lg:inline">{label}</span>
              <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-surface border border-white/[0.07] px-2 py-1 text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden lg:block">
                Coming Soon
              </span>
            </div>
          );
        }

        return (
          <Link
            key={path}
            href={href(path)}
            className={[
              "flex items-center gap-2.75 px-3.25 py-2.5 rounded-[10px]",
              "text-sm whitespace-nowrap transition-colors shrink-0 lg:w-full",
              isActive
                ? "bg-gold text-bg font-semibold"
                : "text-text-secondary font-medium hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden sm:inline lg:inline">{label}</span>
          </Link>
        );
      })}
    </>
  );
}
