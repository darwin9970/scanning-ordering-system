'use client'

import { useMemo } from 'react'
import type { PageComponent } from '@/types'
import { CANVAS_WIDTH } from '../constants'

interface AlignmentGuidesProps {
  components: PageComponent[]
  activeId: string | null
  activeRect: { x: number; y: number; width: number; height: number } | null
  snapThreshold?: number
}

interface GuideLine {
  type: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
  label?: string
}

export interface SnapResult {
  x: number
  y: number
  snappedX: boolean
  snappedY: boolean
}

// 计算对齐辅助线
export function calculateAlignmentGuides(
  components: PageComponent[],
  activeId: string | null,
  activeRect: { x: number; y: number; width: number; height: number } | null,
  snapThreshold: number = 5
): { guides: GuideLine[]; snap: SnapResult | null } {
  if (!activeId || !activeRect) {
    return { guides: [], snap: null }
  }

  const guides: GuideLine[] = []
  let snapX: number | null = null
  let snapY: number | null = null
  let snappedX = false
  let snappedY = false

  const activeLeft = activeRect.x
  const activeRight = activeRect.x + activeRect.width
  const activeCenterX = activeRect.x + activeRect.width / 2
  const activeTop = activeRect.y
  const activeBottom = activeRect.y + activeRect.height
  const activeCenterY = activeRect.y + activeRect.height / 2

  // 画布中心线
  const canvasCenterX = CANVAS_WIDTH / 2

  // 检查画布中心对齐
  if (Math.abs(activeCenterX - canvasCenterX) < snapThreshold) {
    guides.push({
      type: 'vertical',
      position: canvasCenterX,
      start: 0,
      end: 1000,
      label: '画布中心'
    })
    snapX = canvasCenterX - activeRect.width / 2
    snappedX = true
  }

  // 检查与其他组件的对齐
  components.forEach((comp) => {
    if (comp.id === activeId) return

    const compLeft = comp.x ?? 0
    const compRight = (comp.x ?? 0) + (comp.width ?? 100)
    const compCenterX = (comp.x ?? 0) + (comp.width ?? 100) / 2
    const compTop = comp.y ?? 0
    const compBottom = (comp.y ?? 0) + (comp.height ?? 100)
    const compCenterY = (comp.y ?? 0) + (comp.height ?? 100) / 2

    // 垂直对齐检查（左-左、左-右、右-左、右-右、中心-中心）
    const vAlignments = [
      { active: activeLeft, comp: compLeft, label: '左对齐' },
      { active: activeLeft, comp: compRight, label: '左-右对齐' },
      { active: activeRight, comp: compLeft, label: '右-左对齐' },
      { active: activeRight, comp: compRight, label: '右对齐' },
      { active: activeCenterX, comp: compCenterX, label: '中心对齐' }
    ]

    vAlignments.forEach(({ active, comp, label }) => {
      if (Math.abs(active - comp) < snapThreshold && !snappedX) {
        guides.push({
          type: 'vertical',
          position: comp,
          start: Math.min(activeTop, compTop),
          end: Math.max(activeBottom, compBottom),
          label
        })
        if (label === '左对齐' || label === '左-右对齐') {
          snapX = comp
        } else if (label === '右对齐' || label === '右-左对齐') {
          snapX = comp - activeRect.width
        } else {
          snapX = comp - activeRect.width / 2
        }
        snappedX = true
      }
    })

    // 水平对齐检查（上-上、上-下、下-上、下-下、中心-中心）
    const hAlignments = [
      { active: activeTop, comp: compTop, label: '上对齐' },
      { active: activeTop, comp: compBottom, label: '上-下对齐' },
      { active: activeBottom, comp: compTop, label: '下-上对齐' },
      { active: activeBottom, comp: compBottom, label: '下对齐' },
      { active: activeCenterY, comp: compCenterY, label: '中心对齐' }
    ]

    hAlignments.forEach(({ active, comp, label }) => {
      if (Math.abs(active - comp) < snapThreshold && !snappedY) {
        guides.push({
          type: 'horizontal',
          position: comp,
          start: Math.min(activeLeft, compLeft),
          end: Math.max(activeRight, compRight),
          label
        })
        if (label === '上对齐' || label === '上-下对齐') {
          snapY = comp
        } else if (label === '下对齐' || label === '下-上对齐') {
          snapY = comp - activeRect.height
        } else {
          snapY = comp - activeRect.height / 2
        }
        snappedY = true
      }
    })
  })

  return {
    guides,
    snap:
      snapX !== null || snapY !== null
        ? {
            x: snapX ?? activeRect.x,
            y: snapY ?? activeRect.y,
            snappedX,
            snappedY
          }
        : null
  }
}

export function AlignmentGuides({
  components,
  activeId,
  activeRect,
  snapThreshold = 5
}: AlignmentGuidesProps) {
  const { guides } = useMemo(
    () => calculateAlignmentGuides(components, activeId, activeRect, snapThreshold),
    [components, activeId, activeRect, snapThreshold]
  )

  if (guides.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <pattern id="guide-pattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0L4 4M4 0L0 4" stroke="#ff6b35" strokeWidth="0.5" />
        </pattern>
      </defs>
      {guides.map((guide, index) => (
        <g key={index}>
          {guide.type === 'vertical' ? (
            <>
              <line
                x1={guide.position}
                y1={guide.start - 10}
                x2={guide.position}
                y2={guide.end + 10}
                stroke="#ff6b35"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {/* 端点标记 */}
              <circle cx={guide.position} cy={guide.start - 10} r="3" fill="#ff6b35" />
              <circle cx={guide.position} cy={guide.end + 10} r="3" fill="#ff6b35" />
            </>
          ) : (
            <>
              <line
                x1={guide.start - 10}
                y1={guide.position}
                x2={guide.end + 10}
                y2={guide.position}
                stroke="#ff6b35"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {/* 端点标记 */}
              <circle cx={guide.start - 10} cy={guide.position} r="3" fill="#ff6b35" />
              <circle cx={guide.end + 10} cy={guide.position} r="3" fill="#ff6b35" />
            </>
          )}
        </g>
      ))}
    </svg>
  )
}
