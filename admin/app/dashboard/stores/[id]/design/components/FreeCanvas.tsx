"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { PageComponent } from "@/types";
import { CANVAS_HEIGHT } from "../constants";
import { CanvasItem } from "./CanvasItem";

interface FreeCanvasProps {
  components: PageComponent[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  deleteComponent: (id: string) => void;
  toggleVisibility: (id: string) => void;
  isDraggingNew: boolean;
  activeId: string | null;
  updateComponent: (id: string, updates: Partial<PageComponent>) => void;
}

export function FreeCanvas({
  components,
  selectedId,
  setSelectedId,
  deleteComponent,
  toggleVisibility,
  isDraggingNew,
  activeId,
  updateComponent,
}: FreeCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "preview-area",
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all ${
        isDraggingNew
          ? isOver
            ? "bg-primary/5 ring-2 ring-primary ring-inset"
            : "bg-blue-50/30"
          : ""
      }`}
      style={{ minHeight: CANVAS_HEIGHT }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedId(null);
        }
      }}
    >
      {components.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Plus className="h-12 w-12 mb-2" />
          <p>从左侧拖入组件</p>
          <p className="text-xs mt-1">自由放置到画布任意位置</p>
        </div>
      ) : (
        components.map((comp) => (
          <CanvasItem
            key={comp.id}
            comp={comp}
            isSelected={selectedId === comp.id}
            isDragging={activeId === comp.id}
            onSelect={() => setSelectedId(comp.id)}
            onDelete={() => deleteComponent(comp.id)}
            onToggleVisibility={() => toggleVisibility(comp.id)}
            onResize={(width, height) => updateComponent(comp.id, { width, height })}
          />
        ))
      )}

      {/* 放置提示 */}
      {isDraggingNew && isOver && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          松开放置组件
        </div>
      )}
    </div>
  );
}
