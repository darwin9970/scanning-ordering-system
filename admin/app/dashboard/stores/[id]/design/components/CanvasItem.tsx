"use client";

import { useState, useEffect, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2, Lock, Copy } from "lucide-react";
import type { PageComponent } from "@/types";
import { ComponentPreview } from "./ComponentPreview";
import { CANVAS_WIDTH, CANVAS_MAX_HEIGHT } from "../constants";

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface CanvasItemProps {
  comp: PageComponent;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onResize: (width: number, height: number, x?: number, y?: number) => void;
  onResizeStart: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCopy: () => void;
}

export function CanvasItem({
  comp,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onToggleVisibility,
  onResize,
  onResizeStart,
  onContextMenu,
  onCopy,
}: CanvasItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: comp.id,
    disabled: comp.locked,
  });

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    direction: ResizeDirection | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startCompX: number;
    startCompY: number;
  }>({
    isResizing: false,
    direction: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startCompX: 0,
    startCompY: 0,
  });

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

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      if (comp.locked) return;
      e.stopPropagation();
      e.preventDefault();
      onResizeStart();
      setResizeState({
        isResizing: true,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: comp.width ?? 200,
        startHeight: comp.height ?? 100,
        startCompX: comp.x ?? 0,
        startCompY: comp.y ?? 0,
      });
    },
    [comp.locked, comp.width, comp.height, comp.x, comp.y, onResizeStart]
  );

  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      const dir = resizeState.direction;

      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;
      let newX = resizeState.startCompX;
      let newY = resizeState.startCompY;

      // 水平方向
      if (dir?.includes("e")) {
        // 向右拉伸，不能超出画布右边界
        const maxWidth = CANVAS_WIDTH - resizeState.startCompX;
        newWidth = Math.max(50, Math.min(maxWidth, resizeState.startWidth + deltaX));
      }
      if (dir?.includes("w")) {
        // 向左拉伸，不能超出画布左边界
        const maxDelta = resizeState.startCompX; // 最多移动到 x=0
        const widthDelta = Math.max(-maxDelta, Math.min(deltaX, resizeState.startWidth - 50));
        newWidth = resizeState.startWidth - widthDelta;
        newX = resizeState.startCompX + widthDelta;
      }

      // 垂直方向
      if (dir?.includes("s")) {
        // 向下拉伸，不能超出画布底部（TabBar 区域）
        // 组件底部（newY + newHeight）不能超过 CANVAS_MAX_HEIGHT
        const maxHeight = CANVAS_MAX_HEIGHT - resizeState.startCompY;
        newHeight = Math.max(30, Math.min(maxHeight, resizeState.startHeight + deltaY));
      }
      if (dir?.includes("n")) {
        // 向上拉伸，不能超出画布顶部
        const maxDelta = resizeState.startCompY;
        const heightDelta = Math.max(-maxDelta, Math.min(deltaY, resizeState.startHeight - 30));
        newHeight = resizeState.startHeight - heightDelta;
        newY = resizeState.startCompY + heightDelta;
      }

      // 限制边界（双重保险）
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      // 确保宽度不超出画布
      if (newX + newWidth > CANVAS_WIDTH) {
        newWidth = CANVAS_WIDTH - newX;
      }
      // 确保高度不超出画布（不能延伸到 TabBar 区域）
      if (newY + newHeight > CANVAS_MAX_HEIGHT) {
        newHeight = CANVAS_MAX_HEIGHT - newY;
      }

      onResize(newWidth, newHeight, newX, newY);
    };

    const handleMouseUp = () => {
      setResizeState((prev) => ({ ...prev, isResizing: false, direction: null }));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeState, onResize]);

  const handleContextMenuInternal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    onContextMenu(e);
  };

  // 缩放手柄样式
  const resizeHandleBase =
    "absolute bg-white border-2 border-primary z-20 hover:bg-primary hover:border-primary transition-colors";
  const resizeHandleCorner = `${resizeHandleBase} w-3 h-3 rounded-full`;
  const resizeHandleEdge = `${resizeHandleBase} rounded-sm`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onContextMenu={handleContextMenuInternal}
      className={`group transition-shadow ${
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:ring-1 hover:ring-primary/50"
      } ${isDragging ? "shadow-2xl z-50" : ""} ${comp.locked ? "cursor-not-allowed" : ""}`}
    >
      {/* 锁定遮罩 */}
      {comp.locked && (
        <div className="absolute inset-0 bg-black/5 z-10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground/50" />
        </div>
      )}

      {/* 拖拽时的虚线框 */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5 pointer-events-none z-10">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {Math.round(comp.width ?? 200)} × {Math.round(comp.height ?? 100)}
          </div>
        </div>
      )}

      {/* 组件内容 */}
      <div
        className={`w-full h-full overflow-hidden bg-white ${comp.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
        {...(comp.locked ? {} : { ...attributes, ...listeners })}
      >
        <div className="w-full h-full overflow-hidden">
          <ComponentPreview component={comp} />
        </div>
      </div>

      {/* 选中时的工具栏和缩放手柄 */}
      {isSelected && !isDragging && (
        <>
          {/* 顶部工具栏 */}
          <div className="absolute -top-9 left-0 flex items-center gap-1 bg-white rounded-lg shadow-md px-2 py-1 z-30">
            <span className="text-xs text-muted-foreground px-1 max-w-[100px] truncate">
              {comp.title}
            </span>
            <div className="w-px h-4 bg-border" />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              title="复制 (Ctrl+D)"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              title={comp.visible ? "隐藏" : "显示"}
            >
              {comp.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="删除 (Delete)"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* 八个方向的缩放手柄 */}
          {!comp.locked && (
            <>
              {/* 角落手柄 */}
              <div
                className={`${resizeHandleCorner} -top-1.5 -left-1.5 cursor-nw-resize`}
                onMouseDown={(e) => handleResizeStart(e, "nw")}
              />
              <div
                className={`${resizeHandleCorner} -top-1.5 -right-1.5 cursor-ne-resize`}
                onMouseDown={(e) => handleResizeStart(e, "ne")}
              />
              <div
                className={`${resizeHandleCorner} -bottom-1.5 -left-1.5 cursor-sw-resize`}
                onMouseDown={(e) => handleResizeStart(e, "sw")}
              />
              <div
                className={`${resizeHandleCorner} -bottom-1.5 -right-1.5 cursor-se-resize`}
                onMouseDown={(e) => handleResizeStart(e, "se")}
              />

              {/* 边缘手柄 */}
              <div
                className={`${resizeHandleEdge} -top-1 left-1/2 -translate-x-1/2 w-6 h-2 cursor-n-resize`}
                onMouseDown={(e) => handleResizeStart(e, "n")}
              />
              <div
                className={`${resizeHandleEdge} -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 cursor-s-resize`}
                onMouseDown={(e) => handleResizeStart(e, "s")}
              />
              <div
                className={`${resizeHandleEdge} -left-1 top-1/2 -translate-y-1/2 w-2 h-6 cursor-w-resize`}
                onMouseDown={(e) => handleResizeStart(e, "w")}
              />
              <div
                className={`${resizeHandleEdge} -right-1 top-1/2 -translate-y-1/2 w-2 h-6 cursor-e-resize`}
                onMouseDown={(e) => handleResizeStart(e, "e")}
              />
            </>
          )}

          {/* 尺寸和位置显示 */}
          <div className="absolute -bottom-7 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
            <span className="bg-white px-1 rounded shadow-sm">
              x:{Math.round(comp.x ?? 0)} y:{Math.round(comp.y ?? 0)}
            </span>
            <span className="bg-white px-1 rounded shadow-sm">
              {Math.round(comp.width ?? 200)} × {Math.round(comp.height ?? 100)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
