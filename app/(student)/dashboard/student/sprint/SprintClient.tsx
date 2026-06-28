"use client";

import { useRef, useState } from "react";
import { createSprintCard, updateCardStatus } from "@/lib/actions/sprint";

type ColumnKey = "todo" | "inprogress" | "done";

interface Card {
  id: string;
  title: string;
  isInstructorSeeded: boolean;
}

interface Board {
  todo: Card[];
  inprogress: Card[];
  done: Card[];
}

const COL_STATUS: Record<ColumnKey, "TODO" | "IN_PROGRESS" | "DONE"> = {
  todo: "TODO",
  inprogress: "IN_PROGRESS",
  done: "DONE",
};

const COL_LABELS: Record<ColumnKey, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

const COL_KEYS: ColumnKey[] = ["todo", "inprogress", "done"];

function statusToCol(status: string): ColumnKey {
  if (status === "IN_PROGRESS") return "inprogress";
  if (status === "DONE") return "done";
  return "todo";
}

interface Props {
  courseId: string;
  initialCards: Array<{
    id: string;
    title: string;
    status: string;
    isInstructorSeeded: boolean;
  }>;
}

export function SprintClient({ courseId, initialCards }: Props) {
  const initial: Board = { todo: [], inprogress: [], done: [] };
  for (const c of initialCards) {
    initial[statusToCol(c.status)].push({
      id: c.id,
      title: c.title,
      isInstructorSeeded: c.isInstructorSeeded,
    });
  }

  const [board, setBoard] = useState<Board>(initial);
  const [newTask, setNewTask] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ColumnKey | null>(null);
  const dragRef = useRef<{ col: ColumnKey; id: string } | null>(null);

  async function addTask() {
    const title = newTask.trim();
    if (!title) return;
    setNewTask("");
    const tempId = "temp_" + Date.now();
    setBoard((b) => ({
      ...b,
      todo: [{ id: tempId, title, isInstructorSeeded: false }, ...b.todo],
    }));
    const result = await createSprintCard(courseId, { title });
    if (result.success) {
      setBoard((b) => ({
        ...b,
        todo: b.todo.map((c) => (c.id === tempId ? { ...c, id: result.id } : c)),
      }));
    } else {
      setBoard((b) => ({
        ...b,
        todo: b.todo.filter((c) => c.id !== tempId),
      }));
    }
  }

  function onCardDragStart(col: ColumnKey, id: string) {
    dragRef.current = { col, id };
    setDraggingId(id);
  }

  function onCardDragEnd() {
    setDraggingId(null);
    setOverCol(null);
  }

  function onColDragOver(e: React.DragEvent, col: ColumnKey) {
    e.preventDefault();
    if (overCol !== col) setOverCol(col);
  }

  function onColDrop(e: React.DragEvent, to: ColumnKey) {
    e.preventDefault();
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.col === to) {
      setOverCol(null);
      setDraggingId(null);
      return;
    }
    const cardId = d.id;
    setBoard((b) => {
      const from = [...b[d.col]];
      const idx = from.findIndex((c) => c.id === cardId);
      if (idx < 0) return b;
      const [card] = from.splice(idx, 1);
      return { ...b, [d.col]: from, [to]: [...b[to], card] };
    });
    setOverCol(null);
    setDraggingId(null);
    updateCardStatus(courseId, cardId, COL_STATUS[to]).catch((err) =>
      console.error("[sprint] updateCardStatus failed:", err)
    );
  }

  const total = board.todo.length + board.inprogress.length + board.done.length;
  const donePct = total ? Math.round((board.done.length / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
            Sprint Board
          </h1>
          <p className="text-text-muted text-sm">
            Drag cards across columns.{" "}
            <span className="text-gold">Gold</span> = instructor milestone.
          </p>
        </div>
        {/* Add task */}
        <div className="flex gap-2 items-center">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task…"
            className="bg-code-bg text-text-primary border border-white/10 rounded-[9px] px-[13px] py-[9px] font-sans text-[13.5px] outline-none w-[200px] placeholder:text-text-faint"
          />
          <button
            onClick={addTask}
            className="bg-gold text-bg border-none rounded-[9px] px-4 py-[9px] font-sans text-[13.5px] font-semibold cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[5px] rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-300"
          style={{ width: `${donePct}%` }}
        />
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        {COL_KEYS.map((col) => {
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
              {/* Column header */}
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="font-sans text-[13px] font-semibold text-[#D7D5CE]">
                  {COL_LABELS[col]}
                </span>
                <span className="font-mono text-[11px] text-text-muted bg-white/[0.06] rounded-full px-[9px] py-[1px]">
                  {board[col].length}
                </span>
              </div>

              {/* Cards */}
              {board[col].map((card) => {
                const isMilestone = card.isInstructorSeeded;
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => onCardDragStart(col, card.id)}
                    onDragEnd={onCardDragEnd}
                    className="bg-[#17171b] rounded-[10px] p-[11px_12px] cursor-grab flex flex-col gap-2 transition-opacity"
                    style={{
                      opacity: draggingId === card.id ? 0.35 : 1,
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: isMilestone
                        ? "2px solid #F5C842"
                        : "2px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <span
                      className="self-start font-mono text-[9.5px] tracking-[.1em] px-[7px] py-[2px] rounded-[5px]"
                      style={{
                        color: isMilestone ? "#F5C842" : "#8C8A83",
                        border: isMilestone
                          ? "1px solid color-mix(in srgb, #F5C842 40%, transparent)"
                          : "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {isMilestone ? "INSTRUCTOR" : "YOU"}
                    </span>
                    <span className="text-[13.5px] text-[#E4E2DB] leading-[1.45]">
                      {card.title}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
