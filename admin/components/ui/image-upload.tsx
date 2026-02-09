'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  disabled?: boolean
  className?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function ImageUpload({ value, onChange, disabled, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 显示消息，3秒后自动隐藏
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        showMessage('error', '请选择图片文件')
        return
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', '图片大小不能超过 5MB')
        return
      }

      setUploading(true)
      setMessage(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE}/api/upload/image`, {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        // 兼容两种响应格式: { success: true, data: { url } } 或 { code: 200, data: { url } }
        if ((result.success || result.code === 200) && result.data?.url) {
          onChange(result.data.url)
          showMessage('success', '上传成功')
        } else {
          showMessage('error', result.message || '上传失败')
        }
      } catch (error) {
        console.error('Upload error:', error)
        showMessage('error', '上传失败，请重试')
      } finally {
        setUploading(false)
      }
    },
    [onChange]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleRemove = () => {
    onChange(undefined)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const imageUrl = value ? (value.startsWith('http') ? value : `${API_BASE}${value}`) : null

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative inline-block">
          <img src={imageUrl} alt="商品图片" className="h-32 w-32 rounded-lg object-cover border" />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="mt-2 text-xs text-muted-foreground">点击或拖拽上传</span>
            </>
          )}
        </div>
      )}

      {/* 提示消息 */}
      {message && (
        <div
          className={cn(
            'flex items-center gap-2 text-xs px-2 py-1 rounded',
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {message.text}
        </div>
      )}

      <p className="text-xs text-muted-foreground">支持 JPG、PNG、GIF、WEBP，最大 5MB</p>
    </div>
  )
}
