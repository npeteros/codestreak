import { redirect } from "next/navigation";
import { getJoinPageData } from "@/lib/actions/courses";
import { JoinClient } from "./JoinClient";
import { Logomark } from "@/components/brand/Logomark";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const data = await getJoinPageData(inviteCode);

  if (!data.success) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3">
            <Logomark className="w-8 h-8" />
            <span className="font-serif text-2xl text-text-primary">CodeStreak</span>
          </div>
          <div>
            <h1 className="font-serif text-[1.75rem] text-text-primary font-normal">
              Course not found
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              This invite link is invalid or has expired. Ask your instructor for a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data.authState === "enrolled") {
    redirect("/dashboard/student");
  }

  return (
    <JoinClient
      inviteCode={inviteCode}
      course={data.course}
      authState={data.authState}
    />
  );
}
