"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Pencil, Archive as ArchiveIcon } from "lucide-react";
import {
  createProject,
  updateProject,
  toggleProjectArchive,
  getSprintTasks,
} from "@/lib/actions/projects";
import type { Project, SprintTask } from "@/lib/actions/projects";
import type { ProjectScope } from "@/lib/firebase/types";
import { SprintBoardClient } from "@/components/sprint/SprintBoardClient";
import { SprintBoardSkeleton } from "@/components/sprint/SprintBoardSkeleton";
import { ProjectDescriptionPanel } from "@/components/sprint/ProjectDescriptionPanel";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

const Scope = {
  AllStudents: "ALL_STUDENTS",
  Students: "STUDENTS",
} as const satisfies Record<string, ProjectScope>;

const ProjectFormMode = {
  New: "new",
  Edit: "edit",
} as const;

type ProjectFormState =
  | { mode: typeof ProjectFormMode.New }
  | { mode: typeof ProjectFormMode.Edit; project: Project }
  | null;

interface StudentOption {
  id: string;
  name: string;
}

interface Props {
  courseId: string;
  currentUserId: string;
  initialProjects: Project[];
  students: StudentOption[];
}

export function ProjectsSprintClient({
  courseId,
  currentUserId,
  initialProjects,
  students,
}: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  );
  const [studentOverrideId, setStudentOverrideId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [formState, setFormState] = useState<ProjectFormState>(null);
  const [, startTransition] = useTransition();

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const boardMembers = useMemo(() => {
    if (!selected) return [];
    return selected.scope === Scope.Students
      ? students.filter((s) => selected.studentIds.includes(s.id))
      : students;
  }, [selected, students]);

  const selectedStudentId =
    studentOverrideId && boardMembers.some((m) => m.id === studentOverrideId)
      ? studentOverrideId
      : boardMembers[0]?.id ?? null;

  useEffect(() => {
    if (!selectedId || !selectedStudentId) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoadingTasks(true);
    getSprintTasks(courseId, selectedId, selectedStudentId).then((res) => {
      if (cancelled) return;
      setTasks(res.success ? res.tasks : []);
      setLoadingTasks(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, selectedId, selectedStudentId]);

  function handleCreated(project: Project) {
    setProjects((p) => [...p, project].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(project.id);
    setFormState(null);
  }

  function handleUpdated(project: Project) {
    setProjects((prev) =>
      prev
        .map((p) => (p.id === project.id ? project : p))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setFormState(null);
  }

  function handleArchive(projectId: string) {
    startTransition(async () => {
      const res = await toggleProjectArchive(courseId, projectId);
      if (res.success && res.isArchived) {
        setProjects((prev) => {
          const remaining = prev.filter((pr) => pr.id !== projectId);
          if (selectedId === projectId) {
            setSelectedId(remaining[0]?.id ?? null);
          }
          return remaining;
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
            Sprint Board
          </h1>
          <p className="text-text-muted text-sm">
            Projects group Sprint Tasks for the whole class or one student.
          </p>
        </div>
        <button
          onClick={() => setFormState({ mode: ProjectFormMode.New })}
          className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer"
        >
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[22px]">
          <p className="text-text-muted text-sm m-0">
            No projects yet. Create one to start a Sprint Board.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap border-b border-white/[0.07] pb-2">
            {projects.map((p) => {
              const isSelected = selectedId === p.id;
              const iconColorClass = isSelected
                ? "text-bg/60 hover:text-bg hover:bg-black/10"
                : "text-text-faint hover:text-text-primary hover:bg-white/10";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.25 rounded-lg font-sans text-[13px] cursor-pointer"
                  style={
                    isSelected
                      ? { background: "#F5C842", color: "#0B0B0D", fontWeight: 600 }
                      : { background: "transparent", color: "#8C8A83" }
                  }
                  onClick={() => setSelectedId(p.id)}
                >
                  <span>{p.name}</span>
                  {isSelected && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormState({ mode: ProjectFormMode.Edit, project: p });
                        }}
                        title="Edit project"
                        aria-label="Edit project"
                        className={`bg-transparent border-none cursor-pointer p-1 rounded-md flex items-center ${iconColorClass}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(p.id);
                        }}
                        title="Archive project"
                        aria-label="Archive project"
                        className="bg-transparent border-none cursor-pointer p-1 rounded-md flex items-center text-bg/60 hover:text-red-700 hover:bg-black/10"
                      >
                        <ArchiveIcon size={13} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-text-faint font-mono uppercase tracking-wide">
                Viewing progress for
              </span>
              {boardMembers.length === 0 ? (
                <span className="text-text-faint text-[12.5px]">
                  No students assigned to this project yet
                </span>
              ) : (
                <StudentNavCombobox
                  students={boardMembers}
                  selectedId={selectedStudentId}
                  onSelect={setStudentOverrideId}
                />
              )}
            </div>
          )}

          {selected?.description && (
            <ProjectDescriptionPanel title={selected.name} description={selected.description} />
          )}

          {selected && selectedStudentId && !loadingTasks && (
            <SprintBoardClient
              key={`${selected.id}:${selectedStudentId}`}
              courseId={courseId}
              projectId={selected.id}
              currentUserId={currentUserId}
              isInstructor
              initialTasks={tasks}
              studentId={selectedStudentId}
            />
          )}
          {loadingTasks && <SprintBoardSkeleton />}
        </>
      )}

      {formState && (
        <ProjectFormModal
          courseId={courseId}
          project={formState.mode === ProjectFormMode.Edit ? formState.project : null}
          students={students}
          onCancel={() => setFormState(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

function ProjectFormModal({
  courseId,
  project,
  students,
  onCancel,
  onCreated,
  onUpdated,
}: {
  courseId: string;
  project: Project | null;
  students: StudentOption[];
  onCancel: () => void;
  onCreated: (project: Project) => void;
  onUpdated: (project: Project) => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [scope, setScope] = useState<ProjectScope>(project?.scope ?? Scope.AllStudents);
  const [studentIds, setStudentIds] = useState<string[]>(project?.studentIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    if (scope === Scope.Students && studentIds.length === 0) {
      setError("Select at least one student");
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description,
      scope,
      studentIds: scope === Scope.Students ? studentIds : undefined,
    };

    if (project) {
      const res = await updateProject(courseId, project.id, payload);
      setSubmitting(false);
      if (!res.success) {
        setError("Failed to save — try again");
        return;
      }
      onUpdated({
        id: project.id,
        name: payload.name,
        description: payload.description,
        scope,
        studentIds: scope === Scope.Students ? studentIds : [],
        isArchived: project.isArchived,
      });
    } else {
      const res = await createProject(courseId, payload);
      setSubmitting(false);
      if (!res.success || !res.id) {
        setError("Failed to create — try again");
        return;
      }
      onCreated({
        id: res.id,
        name: payload.name,
        description: payload.description,
        scope,
        studentIds: scope === Scope.Students ? studentIds : [],
        isArchived: false,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-white/[0.08] rounded-[15px] p-[22px] w-full max-w-[480px] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-[1.3rem] text-text-primary font-normal m-0">
          {project ? "Edit project" : "New project"}
        </h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13.5px] outline-none placeholder:text-text-faint"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-faint font-mono">
            Description (Markdown)
          </span>
          <button
            onClick={() => setPreview((p) => !p)}
            className="text-[11px] text-gold bg-transparent border-none cursor-pointer p-0"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="markdown-body text-[13.5px] text-[#C2C0B9] leading-[1.6] min-h-[75px] max-h-[220px] overflow-y-auto bg-code-bg rounded-[9px] p-[13px] border border-white/10">
            <Markdown>{description || "*Nothing to preview*"}</Markdown>
          </div>
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description (optional) — supports Markdown"
            className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13.5px] outline-none resize-y placeholder:text-text-faint"
          />
        )}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[13.5px] text-text-primary cursor-pointer">
            <input
              type="radio"
              checked={scope === Scope.AllStudents}
              onChange={() => setScope(Scope.AllStudents)}
            />
            All students
          </label>
          <label className="flex items-center gap-2 text-[13.5px] text-text-primary cursor-pointer">
            <input
              type="radio"
              checked={scope === Scope.Students}
              onChange={() => setScope(Scope.Students)}
            />
            Select students
          </label>
          {scope === Scope.Students && (
            <StudentCombobox
              students={students}
              selectedIds={studentIds}
              onChange={setStudentIds}
            />
          )}
        </div>
        {error && <p className="text-[12px] text-red-400 m-0">{error}</p>}
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={onCancel}
            className="text-text-muted border border-white/10 rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] cursor-pointer bg-transparent"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentNavCombobox({
  students,
  selectedId,
  onSelect,
}: {
  students: StudentOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = students.find((s) => s.id === selectedId) ?? null;
  const options = students.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function select(id: string) {
    onSelect(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-[240px]">
      <input
        value={open ? query : (selected?.name ?? "")}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => {
          setQuery("");
          setOpen(true);
          e.target.select();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search students…"
        className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[7px] font-sans text-[13px] outline-none w-full placeholder:text-text-faint"
      />
      {open && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#17171b] border border-white/10 rounded-[9px] max-h-[220px] overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-[13px] py-[9px] font-sans text-[13px] text-text-faint">
              No matching students
            </div>
          ) : (
            options.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s.id)}
                className="block w-full text-left px-[13px] py-[9px] font-sans text-[13.5px] bg-transparent border-none cursor-pointer hover:bg-white/[0.06]"
                style={
                  s.id === selectedId
                    ? { color: "#F5C842", fontWeight: 600 }
                    : { color: "#E4E2DB" }
                }
              >
                {s.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StudentCombobox({
  students,
  selectedIds,
  onChange,
}: {
  students: StudentOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = students.filter((s) => selectedIds.includes(s.id));
  const options = students.filter(
    (s) =>
      !selectedIds.includes(s.id) &&
      s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function select(id: string) {
    onChange([...selectedIds, id]);
    setQuery("");
  }

  function remove(id: string) {
    onChange(selectedIds.filter((sid) => sid !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1.5 bg-code-bg border border-white/10 rounded-full pl-[10px] pr-[6px] py-[3px] text-[12px] text-text-primary"
            >
              {s.name}
              <button
                onClick={() => remove(s.id)}
                aria-label={`Remove ${s.name}`}
                className="text-text-faint hover:text-red-400 bg-transparent border-none cursor-pointer leading-none text-[14px] px-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search students…"
          className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13.5px] outline-none w-full placeholder:text-text-faint"
        />
        {open && options.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#17171b] border border-white/10 rounded-[9px] max-h-[180px] overflow-y-auto">
            {options.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s.id)}
                className="block w-full text-left px-[13px] py-[9px] font-sans text-[13.5px] text-text-primary bg-transparent border-none cursor-pointer hover:bg-white/[0.06]"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {open && options.length === 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#17171b] border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13px] text-text-faint">
            No matching students
          </div>
        )}
      </div>
    </div>
  );
}
