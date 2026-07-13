"use client";

import { useEffect, useState } from "react";
import { getSprintTasks } from "@/lib/actions/projects";
import type { Project, SprintTask } from "@/lib/actions/projects";
import { SprintBoardClient } from "@/components/sprint/SprintBoardClient";
import { SprintBoardSkeleton } from "@/components/sprint/SprintBoardSkeleton";
import { ProjectDescriptionPanel } from "@/components/sprint/ProjectDescriptionPanel";

interface Props {
  courseId: string;
  currentUserId: string;
  initialProjects: Project[];
}

export function SprintClient({ courseId, currentUserId, initialProjects }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  );
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoadingTasks(true);
    getSprintTasks(courseId, selectedId).then((res) => {
      if (cancelled) return;
      setTasks(res.success ? res.tasks : []);
      setLoadingTasks(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, selectedId]);

  const selected = initialProjects.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Sprint Board
        </h1>
        <p className="text-text-muted text-sm">
          Switch between your class and personal projects.
        </p>
      </div>

      {initialProjects.length === 0 ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No projects yet. Your instructor hasn&apos;t created one for you.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap border-b border-white/[0.07] pb-2">
            {initialProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="px-3 py-[7px] rounded-[8px] font-sans text-[13px] cursor-pointer border-none"
                style={
                  selectedId === p.id
                    ? { background: "#F5C842", color: "#0B0B0D", fontWeight: 600 }
                    : { background: "transparent", color: "#8C8A83" }
                }
              >
                {p.name}
              </button>
            ))}
          </div>

          {selected?.description && (
            <ProjectDescriptionPanel title={selected.name} description={selected.description} />
          )}

          {selected && !loadingTasks && (
            <SprintBoardClient
              key={selected.id}
              courseId={courseId}
              projectId={selected.id}
              currentUserId={currentUserId}
              isInstructor={false}
              initialTasks={tasks}
            />
          )}
          {loadingTasks && <SprintBoardSkeleton />}
        </>
      )}
    </div>
  );
}
