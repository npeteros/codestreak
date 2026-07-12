"use client";

import { useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createSprintTask,
  updateSprintTask,
  deleteSprintTask,
  moveSprintTask,
} from "@/lib/actions/projects";
import type { SprintTask } from "@/lib/actions/projects";
import type { SprintTaskStatus } from "@/lib/firebase/types";

const COLUMNS: SprintTaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const COLUMN_LABELS: Record<SprintTaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const ModalMode = {
  New: "new",
  View: "view",
  Edit: "edit",
} as const;
type ModalMode = (typeof ModalMode)[keyof typeof ModalMode];

type ModalState =
  | { mode: typeof ModalMode.New }
  | { mode: typeof ModalMode.View | typeof ModalMode.Edit; task: SprintTask }
  | null;

type Board = Record<SprintTaskStatus, SprintTask[]>;

function formatDueDate(dueDate: string): string {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((due.getTime() - todayLocal.getTime()) / 86_400_000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 1 && diffDays <= 5) return `${diffDays} days from now`;
  if (diffDays < -1 && diffDays >= -5) return `${Math.abs(diffDays)} days ago`;

  return due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupTasks(tasks: SprintTask[]): Board {
  const board: Board = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
  for (const t of [...tasks].sort((a, b) => a.order - b.order)) {
    board[t.status].push(t);
  }
  return board;
}

interface Props {
  courseId: string;
  projectId: string;
  currentUserId: string;
  isInstructor: boolean;
  initialTasks: SprintTask[];
}

export function SprintBoardClient({
  courseId,
  projectId,
  currentUserId,
  isInstructor,
  initialTasks,
}: Props) {
  const [board, setBoard] = useState<Board>(() => groupTasks(initialTasks));
  const [overCol, setOverCol] = useState<SprintTaskStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{ from: SprintTaskStatus; id: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [, startTransition] = useTransition();

  function canManage(task: SprintTask) {
    return isInstructor || task.createdBy === currentUserId;
  }

  function onCardDragStart(status: SprintTaskStatus, id: string) {
    dragRef.current = { from: status, id };
    setDraggingId(id);
  }

  function onCardDragEnd() {
    setDraggingId(null);
    setOverCol(null);
  }

  function onColDragOver(e: React.DragEvent, col: SprintTaskStatus) {
    e.preventDefault();
    if (overCol !== col) setOverCol(col);
  }

  function moveLocally(
    taskId: string,
    from: SprintTaskStatus,
    to: SprintTaskStatus,
    insertBeforeId: string | null
  ) {
    setBoard((b) => {
      const fromArr = [...b[from]];
      const idx = fromArr.findIndex((t) => t.id === taskId);
      if (idx < 0) return b;
      const [task] = fromArr.splice(idx, 1);
      const toArr = from === to ? fromArr : [...b[to]];
      const insertIdx = insertBeforeId
        ? toArr.findIndex((t) => t.id === insertBeforeId)
        : -1;
      const movedTask = { ...task, status: to };
      const nextTo =
        insertIdx === -1
          ? [...toArr, movedTask]
          : [...toArr.slice(0, insertIdx), movedTask, ...toArr.slice(insertIdx)];
      if (from === to) return { ...b, [to]: nextTo };
      return { ...b, [from]: fromArr, [to]: nextTo };
    });
  }

  function onColDrop(e: React.DragEvent, to: SprintTaskStatus) {
    e.preventDefault();
    const d = dragRef.current;
    dragRef.current = null;
    setOverCol(null);
    setDraggingId(null);
    if (!d) return;
    moveLocally(d.id, d.from, to, null);
    moveSprintTask(courseId, projectId, d.id, { status: to, insertBeforeId: null }).catch(
      (err) => console.error("[sprint] moveSprintTask failed:", err)
    );
  }

  function onCardDrop(e: React.DragEvent, to: SprintTaskStatus, beforeId: string) {
    e.preventDefault();
    e.stopPropagation();
    const d = dragRef.current;
    dragRef.current = null;
    setOverCol(null);
    setDraggingId(null);
    if (!d || d.id === beforeId) return;
    moveLocally(d.id, d.from, to, beforeId);
    moveSprintTask(courseId, projectId, d.id, {
      status: to,
      insertBeforeId: beforeId,
    }).catch((err) => console.error("[sprint] moveSprintTask failed:", err));
  }

  function handleDelete(task: SprintTask) {
    setBoard((b) => ({
      ...b,
      [task.status]: b[task.status].filter((t) => t.id !== task.id),
    }));
    startTransition(async () => {
      const res = await deleteSprintTask(courseId, projectId, task.id);
      if (!res.success) {
        setBoard((b) => ({ ...b, [task.status]: [...b[task.status], task] }));
      }
    });
  }

  function handleSave(input: {
    id?: string;
    title: string;
    description: string;
    dueDate: string;
  }) {
    if (input.id) {
      const { id } = input;
      setBoard((b) => {
        const status = COLUMNS.find((s) => b[s].some((t) => t.id === id));
        if (!status) return b;
        return {
          ...b,
          [status]: b[status].map((t) =>
            t.id === id
              ? {
                  ...t,
                  title: input.title,
                  description: input.description,
                  dueDate: input.dueDate || null,
                }
              : t
          ),
        };
      });
      startTransition(async () => {
        await updateSprintTask(courseId, projectId, id, {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate || null,
        });
      });
    } else {
      const tempId = "temp_" + Date.now();
      const temp: SprintTask = {
        id: tempId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate || null,
        status: "TODO",
        order: 0,
        createdBy: currentUserId,
        createdByRole: isInstructor ? "INSTRUCTOR" : "STUDENT",
      };
      setBoard((b) => ({ ...b, TODO: [...b.TODO, temp] }));
      startTransition(async () => {
        const res = await createSprintTask(courseId, projectId, {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate || undefined,
        });
        if (res.success && res.id) {
          const newId = res.id;
          setBoard((b) => ({
            ...b,
            TODO: b.TODO.map((t) => (t.id === tempId ? { ...t, id: newId } : t)),
          }));
        } else {
          setBoard((b) => ({ ...b, TODO: b.TODO.filter((t) => t.id !== tempId) }));
        }
      });
    }
    setModal(null);
  }

  const total = COLUMNS.reduce((n, c) => n + board[c].length, 0);
  const donePct = total ? Math.round((board.DONE.length / total) * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <p className="text-text-muted text-sm m-0">
          Drag cards across columns to update status.
        </p>
        <button
          onClick={() => setModal({ mode: ModalMode.New })}
          className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer"
        >
          + Add task
        </button>
      </div>

      <div className="h-[5px] rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-300"
          style={{ width: `${donePct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {COLUMNS.map((col) => {
          const isOver = overCol === col;
          return (
            <div
              key={col}
              onDragOver={(e) => onColDragOver(e, col)}
              onDrop={(e) => onColDrop(e, col)}
              className="flex flex-col gap-[11px] p-[13px] rounded-[14px] min-h-[300px] transition-colors"
              style={{
                background: isOver
                  ? "color-mix(in srgb, #F5C842 7%, #101013)"
                  : "#101013",
                border: isOver
                  ? "1px solid color-mix(in srgb, #F5C842 50%, transparent)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="font-sans text-[13px] font-semibold text-[#D7D5CE]">
                  {COLUMN_LABELS[col]}
                </span>
                <span className="font-mono text-[11px] text-text-muted bg-white/[0.06] rounded-full px-[9px] py-[1px]">
                  {board[col].length}
                </span>
              </div>

              {board[col].map((task) => {
                const overdue =
                  !!task.dueDate && task.status !== "DONE" && task.dueDate < today;
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onCardDragStart(col, task.id)}
                    onDragEnd={onCardDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => onCardDrop(e, col, task.id)}
                    onClick={() => setModal({ mode: ModalMode.View, task })}
                    className="bg-[#17171b] rounded-[10px] p-[11px_12px] cursor-grab flex flex-col gap-2 transition-opacity"
                    style={{
                      opacity: draggingId === task.id ? 0.35 : 1,
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft:
                        task.createdByRole === "INSTRUCTOR"
                          ? "2px solid #F5C842"
                          : "2px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <span
                      className="self-start font-mono text-[9.5px] tracking-[.1em] px-[7px] py-[2px] rounded-[5px]"
                      style={{
                        color: task.createdByRole === "INSTRUCTOR" ? "#F5C842" : "#8C8A83",
                        border:
                          task.createdByRole === "INSTRUCTOR"
                            ? "1px solid color-mix(in srgb, #F5C842 40%, transparent)"
                            : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {task.createdByRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT"}
                    </span>
                    <span className="text-[13.5px] text-[#E4E2DB] leading-[1.45] font-medium">
                      {task.title}
                    </span>
                    {task.description && (
                      <div className="markdown-body text-[12.5px] text-[#A9A79F] leading-[1.5] line-clamp-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {task.description}
                        </ReactMarkdown>
                      </div>
                    )}
                    {task.dueDate && (
                      <span
                        className="self-start font-mono text-[10.5px] px-[7px] py-[2px] rounded-[5px]"
                        style={{
                          color: overdue ? "#F87171" : "#8C8A83",
                          border: overdue
                            ? "1px solid rgba(248,113,113,0.4)"
                            : "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        Due {formatDueDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {modal?.mode === ModalMode.View && (
        <TaskDetailModal
          task={modal.task}
          canManage={canManage(modal.task)}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: ModalMode.Edit, task: modal.task })}
          onDelete={() => {
            handleDelete(modal.task);
            setModal(null);
          }}
        />
      )}

      {(modal?.mode === ModalMode.New || modal?.mode === ModalMode.Edit) && (
        <TaskModal
          task={modal.mode === ModalMode.Edit ? modal.task : null}
          onCancel={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function TaskDetailModal({
  task,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  task: SprintTask;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-white/[0.08] rounded-[15px] p-[22px] w-full max-w-[520px] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-[1.3rem] text-text-primary font-normal m-0">
            {task.title}
          </h3>
          <span
            className="shrink-0 font-mono text-[9.5px] tracking-[.1em] px-[7px] py-[2px] rounded-[5px]"
            style={{
              color: task.createdByRole === "INSTRUCTOR" ? "#F5C842" : "#8C8A83",
              border:
                task.createdByRole === "INSTRUCTOR"
                  ? "1px solid color-mix(in srgb, #F5C842 40%, transparent)"
                  : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {task.createdByRole === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT"}
          </span>
        </div>
        {task.dueDate && (
          <span className="self-start font-mono text-[10.5px] px-[7px] py-[2px] rounded-[5px] text-[#8C8A83] border border-white/[0.12]">
            Due {formatDueDate(task.dueDate)}
          </span>
        )}
        <div className="markdown-body text-[13.5px] text-[#C2C0B9] leading-[1.6] max-h-[280px] overflow-y-auto bg-code-bg rounded-[9px] p-[13px] border border-white/10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {task.description || "*No description*"}
          </ReactMarkdown>
        </div>
        <div className="flex justify-end gap-2 mt-1">
          {canManage && (
            <button
              onClick={onDelete}
              className="text-[#E0795E] border border-[#E0795E]/40 rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] cursor-pointer bg-transparent mr-auto"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="text-text-muted border border-white/10 rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] cursor-pointer bg-transparent"
          >
            Close
          </button>
          {canManage && (
            <button
              onClick={onEdit}
              className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({
  task,
  onCancel,
  onSave,
}: {
  task: SprintTask | null;
  onCancel: () => void;
  onSave: (input: {
    id?: string;
    title: string;
    description: string;
    dueDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [preview, setPreview] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-white/[0.08] rounded-[15px] p-[22px] w-full max-w-[520px] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-[1.3rem] text-text-primary font-normal m-0">
          {task ? "Edit task" : "New task"}
        </h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
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
          <div className="markdown-body text-[13.5px] text-[#C2C0B9] leading-[1.6] min-h-[110px] max-h-[220px] overflow-y-auto bg-code-bg rounded-[9px] p-[13px] border border-white/10">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {description || "*Nothing to preview*"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Add details… supports Markdown"
            className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-mono text-[13px] outline-none resize-y placeholder:text-text-faint"
          />
        )}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13.5px] outline-none w-fit"
        />
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={onCancel}
            className="text-text-muted border border-white/10 rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] cursor-pointer bg-transparent"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              title.trim() &&
              onSave({ id: task?.id, title: title.trim(), description, dueDate })
            }
            disabled={!title.trim()}
            className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
