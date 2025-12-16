/**
 * 聊天输入组件
 */
import { useRef, useCallback, useMemo } from 'react'
import {
  Send,
  Sparkles,
  StopCircle,
  FileText,
  Image as ImageIcon,
  X,
  Code,
  GitBranch,
  Terminal,
  Database,
} from 'lucide-react'
import { useStore, ChatMode } from '../../store'
import { t } from '../../i18n'

export interface PendingImage {
  id: string
  file: File
  previewUrl: string
  base64?: string
}

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  images: PendingImage[]
  setImages: React.Dispatch<React.SetStateAction<PendingImage[]>>
  isStreaming: boolean
  hasApiKey: boolean
  hasPendingToolCall: boolean
  chatMode: ChatMode
  onSubmit: () => void
  onAbort: () => void
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onPaste: (e: React.ClipboardEvent) => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
  inputContainerRef: React.RefObject<HTMLDivElement>
}

export default function ChatInput({
  input,
  images,
  setImages,
  isStreaming,
  hasApiKey,
  hasPendingToolCall,
  chatMode,
  onSubmit,
  onAbort,
  onInputChange,
  onKeyDown,
  onPaste,
  textareaRef,
  inputContainerRef,
}: ChatInputProps) {
  const { language } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 文件引用检测
  const fileRefs = useMemo(() => {
    const refs: string[] = []
    const regex = /@(?:file:)?([^\s@]+\.[a-zA-Z0-9]+)/g
    let match
    while ((match = regex.exec(input)) !== null) {
      if (match[1] !== 'codebase') {
        refs.push(match[1])
      }
    }
    return refs
  }, [input])

  // 特殊上下文引用检测
  const hasCodebaseRef = useMemo(() => /@codebase\b/i.test(input), [input])
  const hasSymbolsRef = useMemo(() => /@symbols\b/i.test(input), [input])
  const hasGitRef = useMemo(() => /@git\b/i.test(input), [input])
  const hasTerminalRef = useMemo(() => /@terminal\b/i.test(input), [input])

  // 添加图片
  const addImage = useCallback(async (file: File) => {
    const id = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(file)

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, base64 } : img)))
    }
    reader.readAsDataURL(file)

    setImages((prev) => [...prev, { id, file, previewUrl }])
  }, [setImages])

  // 移除图片
  const removeImage = useCallback(
    (id: string) => {
      setImages((prev) => prev.filter((img) => img.id !== id))
    },
    [setImages]
  )

  return (
    <div ref={inputContainerRef} className="p-4 bg-background border-t border-border z-20">
      <div
        className={`
            relative group rounded-xl border transition-all duration-200
            ${
              isStreaming
                ? 'border-accent/50 bg-accent/5'
                : 'border-border-subtle bg-surface focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20 focus-within:shadow-glow'
            }
        `}
      >
        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex gap-2 p-3 pb-0 overflow-x-auto custom-scrollbar">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group/img flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border-subtle"
              >
                <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Context Chips */}
        {(fileRefs.length > 0 || hasCodebaseRef || hasSymbolsRef || hasGitRef || hasTerminalRef) && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {hasCodebaseRef && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-medium rounded-full border border-purple-500/20 animate-fade-in">
                <Database className="w-3 h-3" />
                @codebase
              </span>
            )}
            {hasSymbolsRef && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded-full border border-blue-500/20 animate-fade-in">
                <Code className="w-3 h-3" />
                @symbols
              </span>
            )}
            {hasGitRef && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-medium rounded-full border border-orange-500/20 animate-fade-in">
                <GitBranch className="w-3 h-3" />
                @git
              </span>
            )}
            {hasTerminalRef && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-medium rounded-full border border-green-500/20 animate-fade-in">
                <Terminal className="w-3 h-3" />
                @terminal
              </span>
            )}
            {fileRefs.map((ref, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-medium rounded-full border border-accent/20 animate-fade-in"
              >
                <FileText className="w-3 h-3" />
                {ref}
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={hasApiKey ? t('pasteImagesHint', language) : t('configureApiKey', language)}
          disabled={!hasApiKey || hasPendingToolCall}
          className="w-full bg-transparent border-none rounded-xl px-4 py-3 pr-12
                     text-sm text-text-primary placeholder-text-muted/60 resize-none
                     focus:ring-0 focus:outline-none leading-relaxed"
          rows={1}
          style={{ minHeight: '52px', maxHeight: '200px' }}
        />

        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(addImage)
              }
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            title={t('uploadImage', language)}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={isStreaming ? onAbort : onSubmit}
            disabled={
              !hasApiKey || ((!input.trim() && images.length === 0) && !isStreaming) || hasPendingToolCall
            }
            className={`p-2 rounded-lg transition-all flex items-center justify-center
                ${
                  isStreaming
                    ? 'bg-status-error/10 text-status-error hover:bg-status-error/20'
                    : input.trim() || images.length > 0
                      ? 'bg-accent text-white shadow-glow hover:bg-accent-hover'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                }
                `}
          >
            {isStreaming ? <StopCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          {chatMode === 'agent' && (
            <span className="flex items-center gap-1 text-accent">
              <Sparkles className="w-3 h-3" />
              {t('agentMode', language)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-muted opacity-50 font-mono">
          {t('returnToSend', language)}
        </span>
      </div>
    </div>
  )
}
