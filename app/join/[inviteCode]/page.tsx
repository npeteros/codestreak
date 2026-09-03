import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getJoinPageData } from "@/lib/actions/courses";
import { JoinClient } from "./JoinClient";
import { Logomark } from "@/components/brand/Logomark";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<Metadata> {
  const { inviteCode } = await params;
  const data = await getJoinPageData(inviteCode);

  if (!data.success) {
    return buildMetadata({
      title: "Invite not found — CodeStreak",
      description: "This invite link is invalid or has expired.",
      path: `/join/${inviteCode}`,
      ogImage: null, // opengraph-image.tsx sibling supplies the og:image tags
    });
  }

  return buildMetadata({
    title: `Join ${data.course.name} — CodeStreak`,
    description: `You've been invited to join ${data.course.name} on CodeStreak.`,
    path: `/join/${inviteCode}`,
    ogImage: null, // opengraph-image.tsx sibling supplies the og:image tags
  });
}

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
