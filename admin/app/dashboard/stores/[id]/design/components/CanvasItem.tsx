"use client";

import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { PageComponent } from "@/types";
import { ComponentPreview } from "./ComponentPreview";

interface CanvasItemProps {
  comp: PageComponent;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onResize: (width: number, height: number) => void;
}

export function CanvasItem({
  comp,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onToggleVisibility,
  onResize,
}: CanvasItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: comp.id,
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const style: React.CSSProperties = {
    position: "absolute",
    left: comp.x ?? 0,
    top: comp.y ?? 0,
    width: comp.width ?? 200,
    height: comp.height ?? 100,
    zIndex: comp.zIndex ?? 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: comp.visible ? 1 : 0.4,
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: comp.width ?? 200,
      height: comp.height ?? 100,
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      onResize(Math.max(50, resizeStart.width + deltaX), Math.max(30, resizeStart.height + deltaY));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group transition-shadow ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:ring-1 hover:ring-primary/50"
      } ${isDragging ? "shadow-2xl z-50" : ""}`}
    >
      {/* 拖拽时的虚线框 */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5 pointer-events-none z-10">
          {/* 尺寸标注 */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {Math.round(comp.width ?? 200)} × {Math.round(comp.height ?? 100)}
          </div>
        </div>
      )}

      {/* 组件内容 */}
      <div
        className="w-full h-full overflow-hidden bg-white cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="w-full h-full overflow-hidden">
          <ComponentPreview component={comp} />
        </div>
      </div>

      {/* 选中时的工具栏 */}
      {isSelected && !isDragging && (
        <>
          {/* 顶部工具栏 */}
          <div className="absolute -top-8 left-0 flex items-center gap-1 bg-white rounded shadow-md px-1 py-0.5">
            <span className="text-xs text-muted-foreground px-1">{comp.title}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
            >
              {comp.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* 缩放手柄 */}
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full cursor-se-resize hover:scale-110 transition-transform"
            onMouseDown={handleResizeStart}
          />

          {/* 尺寸显示 */}
          <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground bg-white px-1 rounded shadow">
            {Math.round(comp.width ?? 200)} × {Math.round(comp.height ?? 100)}
          </div>
        </>
      )}
    </div>
  );
}
