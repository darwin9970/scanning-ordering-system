import { useEffect, useCallback } from 'react'

interface UseKeyboardShortcutsOptions {
  selectedId: string | null
  onDelete: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onUndo: () => void
  onRedo: () => void
  onSelectAll: () => void
  onDeselect: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  selectedId,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onUndo,
  onRedo,
  onSelectAll,
  onDeselect,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  enabled = true
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 检查是否在输入框中
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Delete / Backspace - 删除
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        onDelete()
        return
      }

      // Escape - 取消选择
      if (e.key === 'Escape') {
        e.preventDefault()
        onDeselect()
        return
      }

      // Ctrl/Cmd + C - 复制
      if (cmdOrCtrl && e.key === 'c' && selectedId) {
        e.preventDefault()
        onCopy()
        return
      }

      // Ctrl/Cmd + V - 粘贴
      if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault()
        onPaste()
        return
      }

      // Ctrl/Cmd + D - 复制组件
      if (cmdOrCtrl && e.key === 'd' && selectedId) {
        e.preventDefault()
        onDuplicate()
        return
      }

      // Ctrl/Cmd + Z - 撤销
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo()
        return
      }

      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y - 重做
      if ((cmdOrCtrl && e.shiftKey && e.key === 'z') || (cmdOrCtrl && e.key === 'y')) {
        e.preventDefault()
        onRedo()
        return
      }

      // Ctrl/Cmd + A - 全选
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault()
        onSelectAll()
        return
      }

      // Ctrl/Cmd + ] - 上移一层
      if (cmdOrCtrl && e.key === ']' && selectedId) {
        e.preventDefault()
        onBringForward()
        return
      }

      // Ctrl/Cmd + [ - 下移一层
      if (cmdOrCtrl && e.key === '[' && selectedId) {
        e.preventDefault()
        onSendBackward()
        return
      }

      // Ctrl/Cmd + Shift + ] - 置顶
      if (cmdOrCtrl && e.shiftKey && e.key === ']' && selectedId) {
        e.preventDefault()
        onBringToFront()
        return
      }

      // Ctrl/Cmd + Shift + [ - 置底
      if (cmdOrCtrl && e.shiftKey && e.key === '[' && selectedId) {
        e.preventDefault()
        onSendToBack()
        return
      }

      // Ctrl/Cmd + L - 锁定/解锁
      if (cmdOrCtrl && e.key === 'l' && selectedId) {
        e.preventDefault()
        onToggleLock()
        return
      }

      // 方向键移动组件（Shift 加速由调用方处理）
      if (selectedId && !cmdOrCtrl) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            onMoveUp()
            break
          case 'ArrowDown':
            e.preventDefault()
            onMoveDown()
            break
          case 'ArrowLeft':
            e.preventDefault()
            onMoveLeft()
            break
          case 'ArrowRight':
            e.preventDefault()
            onMoveRight()
            break
        }
      }
    },
    [
      selectedId,
      onDelete,
      onCopy,
      onPaste,
      onDuplicate,
      onUndo,
      onRedo,
      onSelectAll,
      onDeselect,
      onBringForward,
      onSendBackward,
      onBringToFront,
      onSendToBack,
      onToggleLock,
      onMoveUp,
      onMoveDown,
      onMoveLeft,
      onMoveRight
    ]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// 快捷键提示列表
export const KEYBOARD_SHORTCUTS = [
  { key: 'Delete / Backspace', action: '删除组件' },
  { key: 'Escape', action: '取消选择' },
  { key: 'Ctrl/⌘ + C', action: '复制组件' },
  { key: 'Ctrl/⌘ + V', action: '粘贴组件' },
  { key: 'Ctrl/⌘ + D', action: '复制组件' },
  { key: 'Ctrl/⌘ + Z', action: '撤销' },
  { key: 'Ctrl/⌘ + Shift + Z', action: '重做' },
  { key: 'Ctrl/⌘ + A', action: '全选' },
  { key: 'Ctrl/⌘ + ]', action: '上移一层' },
  { key: 'Ctrl/⌘ + [', action: '下移一层' },
  { key: 'Ctrl/⌘ + Shift + ]', action: '置顶' },
  { key: 'Ctrl/⌘ + Shift + [', action: '置底' },
  { key: 'Ctrl/⌘ + L', action: '锁定/解锁' },
  { key: '↑ ↓ ← →', action: '移动组件 (1px)' },
  { key: 'Shift + ↑ ↓ ← →', action: '移动组件 (10px)' }
]
