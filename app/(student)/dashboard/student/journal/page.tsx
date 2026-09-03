import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUidOrRedirect } from "@/lib/auth/session";
import { listEnrolledCourses } from "@/lib/repositories/enrollments";
import { getJournalEntries } from "@/lib/actions/journal";

const TRIGGER_SOURCE: Record<string, string> = {
  CHALLENGE: "Daily Challenge",
  CHECKIN: "Check-In",
  SPRINT_CARD: "Sprint Board",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const msDiff = now.getTime() - date.getTime();
  const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (daysDiff === 0) return `Today, ${timeStr}`;
  if (daysDiff === 1) return `Yesterday, ${timeStr}`;
  return `${daysDiff} days ago`;
}

export default async function StudentJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const uid = await requireUidOrRedirect();

  const { courseId: queryCourseId } = await searchParams;
  const hub = await listEnrolledCourses(uid);

  const courseIds = hub.map(({ data: d }) => d.courseId).filter((id): id is string => Boolean(id));
  const validIds = new Set(courseIds);
  const courseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : (courseIds[0] ?? "");

  if (!courseId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          AI Journal
        </h1>
        <p className="text-text-muted text-sm">
          You&apos;re not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  const result = await getJournalEntries(courseId);
  const entries = result.success ? result.entries : [];
  const [latest, ...rest] = entries;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          AI Journal
        </h1>
        <p className="text-text-muted text-sm">
          A short reflection written after each activity you log.
        </p>
      </div>

      {!latest ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-5.5">
          <p className="text-text-muted text-sm m-0">
            No reflections yet. Submit a challenge, check in, or complete a
            sprint card to generate your first reflection.
          </p>
        </div>
      ) : (
        <>
          {/* Latest reflection — highlighted card */}
          <div
            className="border rounded-2xl p-[24px_26px] flex flex-col gap-3.5"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, #F5C842 9%, #141417), #141417)",
              borderColor: "color-mix(in srgb, #F5C842 30%, transparent)",
            }}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.25">
                <span
                  className="w-1.75 h-1.75 rounded-xs inline-block"
                  style={{ background: "#F5C842" }}
                />
                <span className="font-mono text-[11px] tracking-[.12em] text-gold">
                  LATEST REFLECTION
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                {TRIGGER_SOURCE[latest.triggerType] ?? latest.triggerType} ·{" "}
                {formatRelativeTime(latest.createdAt)}
              </span>
            </div>
            <div className="markdown-body font-serif italic text-[21px] leading-normal text-[#F0EEE7]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {latest.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Earlier entries */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2.75">
              <h3 className="font-mono text-[11px] tracking-[.12em] text-text-muted m-0">
                EARLIER
              </h3>
              <div className="flex flex-col gap-3">
                {rest.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-surface border border-white/6 rounded-xl px-4.5 py-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="font-mono text-[11px] text-gold">
                        {TRIGGER_SOURCE[entry.triggerType] ?? entry.triggerType}
                      </span>
                      <span className="font-mono text-[11px] text-text-faint">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    <div className="markdown-body text-[14px] text-[#C2C0B9] leading-[1.65]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {entry.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
