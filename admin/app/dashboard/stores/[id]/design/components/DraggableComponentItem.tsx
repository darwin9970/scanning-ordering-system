'use client'

import { useDraggable } from '@dnd-kit/core'
import type { PageComponent, PageComponentType } from '@/types'
import { getDefaultProps } from '../constants'
import { ComponentPreview } from './ComponentPreview'

interface DraggableComponentItemProps {
  type: PageComponentType
  label: string
  onAdd: () => void
}

export function DraggableComponentItem({ type, label, onAdd }: DraggableComponentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-${type}`
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined

  // 创建一个临时组件用于预览
  const previewComponent: PageComponent = {
    id: `preview-${type}`,
    type,
    title: label,
    visible: true,
    props: getDefaultProps(type)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onAdd}
      className={`cursor-grab active:cursor-grabbing rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all overflow-hidden ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      {/* 组件预览缩略图 */}
      <div className="h-16 overflow-hidden bg-gray-50 border-b">
        <div className="transform scale-[0.3] origin-top-left w-[333%]">
          <ComponentPreview component={previewComponent} />
        </div>
      </div>
      {/* 组件名称 */}
      <div className="p-2 text-center">
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  )
}
