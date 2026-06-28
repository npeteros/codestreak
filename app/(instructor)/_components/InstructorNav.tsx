"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutGrid, Code2, Users, BarChart3, Settings } from "lucide-react";

type NavItem = {
  segment: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { segment: "", label: "Overview", icon: LayoutGrid, exact: true },
  { segment: "challenges", label: "Challenges", icon: Code2 },
  { segment: "students", label: "Students", icon: Users },
  { segment: "sprint", label: "Sprint Board", icon: BarChart3 },
  { segment: "settings", label: "Settings", icon: Settings },
];

type Props = {
  variant?: "sidebar" | "bottom";
};

export function InstructorNav({ variant = "sidebar" }: Props) {
  const pathname = usePathname();
  const params = useParams<{ courseId: string }>();
  const base = `/dashboard/instructor/${params.courseId}`;

  if (variant === "bottom") {
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
                "flex flex-1 flex-col items-center gap-1 py-4 px-1 transition-colors",
                isActive ? "text-gold" : "text-text-secondary",
              ].join(" ")}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
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
