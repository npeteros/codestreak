import { requireRoleOrRedirect } from "@/lib/auth/session";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoleOrRedirect("INSTRUCTOR");

  return <>{children}</>;
}
