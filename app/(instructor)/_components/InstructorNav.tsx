"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutGrid, Code2, Library, Users, BarChart3, Settings } from "lucide-react";
import { MobileMoreSheet } from "@/components/ui/MobileMoreSheet";
import { LogoutButton } from "@/components/auth/LogoutButton";

type NavItem = {
  segment: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { segment: "", label: "Overview", icon: LayoutGrid, exact: true },
  { segment: "challenges", label: "Daily Challenge", icon: Code2 },
  { segment: "practice", label: "Practice", icon: Library },
  { segment: "students", label: "Students", icon: Users },
  { segment: "sprint", label: "Sprint Board", icon: BarChart3 },
  { segment: "settings", label: "Settings", icon: Settings },
];

const BOTTOM_PRIMARY_SEGMENTS = ["", "challenges", "students"];

type Props = {
  variant?: "sidebar" | "bottom";
};

export function InstructorNav({ variant = "sidebar" }: Props) {
  const pathname = usePathname();
  const params = useParams<{ courseId: string }>();
  const base = `/dashboard/instructor/${params.courseId}`;

  if (variant === "bottom") {
    const primaryItems = navItems.filter((item) => BOTTOM_PRIMARY_SEGMENTS.includes(item.segment));
    const moreItems = navItems.filter((item) => !BOTTOM_PRIMARY_SEGMENTS.includes(item.segment));
    const isMoreActive = moreItems.some(({ segment, exact }) => {
      const href = segment ? `${base}/${segment}` : base;
      return exact ? pathname === href : pathname.startsWith(href);
    });

    return (
      <>
        {primaryItems.map(({ segment, label, icon: Icon, exact }) => {
          const href = segment ? `${base}/${segment}` : base;
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
          items={moreItems.map(({ segment, label, icon }) => ({
            href: segment ? `${base}/${segment}` : base,
            label,
            icon,
          }))}
        >
          <LogoutButton showLabel />
        </MobileMoreSheet>
      </>
    );
  }

  return (
    <>
      {navItems.map(({ segment, label, icon: Icon, exact }) => {
        const href = segment ? `${base}/${segment}` : base;
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
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
