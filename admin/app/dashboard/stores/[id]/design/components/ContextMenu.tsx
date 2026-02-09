'use client'

import { useEffect, useRef } from 'react'
import {
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Clipboard
} from 'lucide-react'
import type { PageComponent } from '@/types'

interface ContextMenuProps {
  x: number
  y: number
  component: PageComponent
  onClose: () => void
  onCopy: () => void
  onPaste: () => void
  onDelete: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  canPaste: boolean
}

interface MenuItem {
  icon: React.ReactNode
  label: string
  shortcut?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

export function ContextMenu({
  x,
  y,
  component,
  onClose,
  onCopy,
  onPaste,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  canPaste
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 调整菜单位置，确保不超出视口
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`
      }
    }
  }, [x, y])

  const menuItems: MenuItem[] = [
    {
      icon: <Copy className="h-4 w-4" />,
      label: '复制',
      shortcut: 'Ctrl+C',
      onClick: () => {
        onCopy()
        onClose()
      }
    },
    {
      icon: <Clipboard className="h-4 w-4" />,
      label: '粘贴',
      shortcut: 'Ctrl+V',
      onClick: () => {
        onPaste()
        onClose()
      },
      disabled: !canPaste,
      divider: true
    },
    {
      icon: component.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
      label: component.visible ? '隐藏' : '显示',
      onClick: () => {
        onToggleVisibility()
        onClose()
      }
    },
    {
      icon: component.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />,
      label: component.locked ? '解锁' : '锁定',
      onClick: () => {
        onToggleLock()
        onClose()
      },
      divider: true
    },
    {
      icon: <ChevronsUp className="h-4 w-4" />,
      label: '置顶',
      onClick: () => {
        onBringToFront()
        onClose()
      }
    },
    {
      icon: <ArrowUp className="h-4 w-4" />,
      label: '上移一层',
      shortcut: 'Ctrl+]',
      onClick: () => {
        onBringForward()
        onClose()
      }
    },
    {
      icon: <ArrowDown className="h-4 w-4" />,
      label: '下移一层',
      shortcut: 'Ctrl+[',
      onClick: () => {
        onSendBackward()
        onClose()
      }
    },
    {
      icon: <ChevronsDown className="h-4 w-4" />,
      label: '置底',
      onClick: () => {
        onSendToBack()
        onClose()
      },
      divider: true
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: '删除',
      shortcut: 'Del',
      onClick: () => {
        onDelete()
        onClose()
      },
      danger: true
    }
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-white rounded-lg shadow-xl border py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {/* 组件名称 */}
      <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-1">
        {component.title || component.type}
      </div>

      {menuItems.map((item, index) => (
        <div key={index}>
          <button
            className={`w-full px-3 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 transition-colors ${
              item.danger ? 'text-destructive hover:bg-destructive/10' : ''
            } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={item.disabled ? undefined : item.onClick}
            disabled={item.disabled}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
          {item.divider && <div className="border-t my-1" />}
        </div>
      ))}
    </div>
  )
}
