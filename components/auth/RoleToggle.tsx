"use client";

import { GraduationCap, BookOpen } from "lucide-react";
import type { UserRole } from "@/lib/types";

interface RoleToggleProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const OPTIONS = [
  {
    role: "STUDENT" as UserRole,
    Icon: GraduationCap,
    label: "I'm a Student",
    description: "Join a course and track your progress",
  },
  {
    role: "INSTRUCTOR" as UserRole,
    Icon: BookOpen,
    label: "I'm an Instructor",
    description: "Create a course and manage your students",
  },
];

export function RoleToggle({ value, onChange }: RoleToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map(({ role, Icon, label, description }) => {
        const selected = value === role;
        return (
          <div
            key={role}
            onClick={() => onChange(role)}
            className={[
              "p-3 rounded-xl border cursor-pointer transition-all",
              selected
                ? "border-gold bg-gold/[0.06]"
                : "border-white/10 hover:border-white/20",
            ].join(" ")}
          >
            <Icon
              size={16}
              className={selected ? "text-gold" : "text-text-muted"}
            />
            <p
              className={[
                "font-mono text-[11px] mt-2 font-medium",
                selected ? "text-gold" : "text-text-secondary",
              ].join(" ")}
            >
              {label}
            </p>
            <p className="text-[10px] text-text-faint mt-0.5 leading-snug">
              {description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
