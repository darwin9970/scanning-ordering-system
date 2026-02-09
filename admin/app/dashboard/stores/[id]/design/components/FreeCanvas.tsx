'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import type { PageComponent } from '@/types'
import { CANVAS_MIN_HEIGHT, CANVAS_WIDTH, CANVAS_MAX_HEIGHT } from '../constants'
import { CanvasItem } from './CanvasItem'
import { AlignmentGuides } from './AlignmentGuides'
import { ContextMenu } from './ContextMenu'

interface FreeCanvasProps {
  components: PageComponent[]
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  deleteComponent: (id: string) => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  isDraggingNew: boolean
  activeId: string | null
  updateComponent: (id: string, updates: Partial<PageComponent>) => void
  startResize: (id: string) => void
  copyComponent: (id: string) => void
  pasteComponent: () => void
  duplicateComponent: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  hasClipboard: boolean
  draggedRect?: { x: number; y: number; width: number; height: number } | null
}

export function FreeCanvas({
  components,
  selectedId,
  setSelectedId,
  deleteComponent,
  toggleVisibility,
  toggleLock,
  isDraggingNew,
  activeId,
  updateComponent,
  startResize,
  copyComponent,
  pasteComponent,
  duplicateComponent,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  hasClipboard,
  draggedRect
}: FreeCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'preview-area'
  })

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    componentId: string
  } | null>(null)

  const selectedComponent = useMemo(
    () => components.find((c) => c.id === selectedId),
    [components, selectedId]
  )

  // 当前拖拽中组件的 rect
  const activeRect = useMemo(() => {
    if (!activeId || isDraggingNew) return null
    const comp = components.find((c) => c.id === activeId)
    if (!comp) return null
    return (
      draggedRect || {
        x: comp.x ?? 0,
        y: comp.y ?? 0,
        width: comp.width ?? 200,
        height: comp.height ?? 100
      }
    )
  }, [activeId, isDraggingNew, components, draggedRect])

  const handleContextMenu = (e: React.MouseEvent, compId: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      componentId: compId
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all ${
        isDraggingNew
          ? isOver
            ? 'bg-primary/5 ring-2 ring-primary ring-inset'
            : 'bg-blue-50/30'
          : ''
      }`}
      style={{
        minHeight: CANVAS_MIN_HEIGHT,
        width: CANVAS_WIDTH
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedId(null)
          closeContextMenu()
        }
      }}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
    >
      {/* 辅助线 */}
      {activeId && !isDraggingNew && (
        <AlignmentGuides
          components={components}
          activeId={activeId}
          activeRect={activeRect}
          snapThreshold={8}
        />
      )}

      {components.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <Plus className="h-12 w-12 mb-2" />
          <p>从左侧拖入组件</p>
          <p className="text-xs mt-1">或点击组件直接添加</p>
        </div>
      ) : (
        components.map((comp) => (
          <CanvasItem
            key={comp.id}
            comp={comp}
            isSelected={selectedId === comp.id}
            isDragging={activeId === comp.id}
            onSelect={() => {
              setSelectedId(comp.id)
              closeContextMenu()
            }}
            onDelete={() => deleteComponent(comp.id)}
            onToggleVisibility={() => toggleVisibility(comp.id)}
            onResize={(width, height, x, y) => {
              updateComponent(comp.id, {
                width,
                height,
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y })
              })
            }}
            onResizeStart={() => startResize(comp.id)}
            onContextMenu={(e) => handleContextMenu(e, comp.id)}
            onCopy={() => duplicateComponent(comp.id)}
          />
        ))
      )}

      {/* 放置提示 */}
      {isDraggingNew && isOver && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          松开放置组件
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && selectedComponent && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          component={selectedComponent}
          onClose={closeContextMenu}
          onCopy={() => copyComponent(contextMenu.componentId)}
          onPaste={pasteComponent}
          onDelete={() => deleteComponent(contextMenu.componentId)}
          onToggleVisibility={() => toggleVisibility(contextMenu.componentId)}
          onToggleLock={() => toggleLock(contextMenu.componentId)}
          onBringForward={() => bringForward(contextMenu.componentId)}
          onSendBackward={() => sendBackward(contextMenu.componentId)}
          onBringToFront={() => bringToFront(contextMenu.componentId)}
          onSendToBack={() => sendToBack(contextMenu.componentId)}
          canPaste={hasClipboard}
        />
      )}
    </div>
  )
}
