/**
 * 聊天消息组件
 * 显示单条用户或 AI 消息
 */
import { useState } from 'react'
import { Sparkles, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useStore, Message } from '../../store'
import { t } from '../../i18n'
import { getEditorConfig } from '../../config/editorConfig'

interface ChatMessageProps {
  message: Message
  onEdit?: (messageId: string, newContent: string) => void
  onRegenerate?: (messageId: string) => void
}

/**
 * 提取消息文本内容
 */
export function getMessageText(content: Message['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')
  }
  return ''
}

/**
 * 提取消息中的图片
 */
export function getMessageImages(content: Message['content']) {
  if (Array.isArray(content)) {
    return content.filter((c) => c.type === 'image')
  }
  return []
}

export default function ChatMessage({ message, onEdit, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const { language } = useStore()
  const editorConfig = getEditorConfig()
  const fontSize = Math.max(12, editorConfig.fontSize - 2)

  if (message.role === 'tool') {
    return null
  }

  const textContent = getMessageText(message.content)
  const images = getMessageImages(message.content)

  const handleStartEdit = () => {
    setEditContent(textContent)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  return (
    <div className="w-full px-4 py-3 group hover:bg-surface/30 transition-colors">
      {/* 用户/AI 标识行 */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`
          w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
          ${isUser ? 'bg-surface-active text-text-secondary' : 'bg-accent/20 text-accent'}
        `}
        >
          {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        </div>
        <span className="text-xs font-medium text-text-secondary">{isUser ? 'You' : 'Adnify'}</span>
      </div>

      {/* 消息内容 */}
      <div className="pl-8">
        {/* 图片预览 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img: any, i) => (
              <div
                key={i}
                className="rounded-lg overflow-hidden border border-border-subtle max-w-[200px]"
              >
                <img
                  src={
                    img.source.type === 'base64'
                      ? `data:${img.source.media_type};base64,${img.source.data}`
                      : img.source.data
                  }
                  alt="User upload"
                  className="max-w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-text-primary resize-none focus:outline-none focus:border-accent"
              style={{ fontSize }}
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {t('cancel', language)}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:bg-accent-hover transition-colors"
              >
                {t('saveAndResend', language)}
              </button>
            </div>
          </div>
        ) : (
          <>
            <ReactMarkdown
              className="prose prose-invert max-w-none break-words leading-relaxed text-text-primary"
              components={{
                code({ className, children, node, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const content = String(children)
                  const isCodeBlock =
                    match || node?.position?.start?.line !== node?.position?.end?.line
                  const isInline = !isCodeBlock && !content.includes('\n')

                  return isInline ? (
                    <code
                      className="bg-surface-active px-1.5 py-0.5 rounded text-accent font-mono text-[0.9em]"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <div className="relative group/code my-3 rounded-lg overflow-hidden border border-border-subtle bg-[#0a0a0b]">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border-subtle">
                        <span className="text-[10px] text-text-muted font-mono uppercase">
                          {match?.[1] || 'code'}
                        </span>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match?.[1]}
                        PreTag="div"
                        className="!bg-transparent !p-3 !m-0 custom-scrollbar"
                        customStyle={{ background: 'transparent', margin: 0, fontSize: fontSize - 1 }}
                        wrapLines={true}
                        wrapLongLines={true}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  )
                },
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0" style={{ fontSize }}>
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul
                    className="list-disc pl-4 mb-2 space-y-1 marker:text-text-muted"
                    style={{ fontSize }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    className="list-decimal pl-4 mb-2 space-y-1 marker:text-text-muted"
                    style={{ fontSize }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li style={{ fontSize }}>{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    className="text-accent hover:underline transition-colors"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent/50 pl-3 py-1 my-2 text-text-muted">
                    {children}
                  </blockquote>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
                ),
              }}
            >
              {textContent}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle rounded-sm" />
            )}

            {/* Message Actions */}
            {!message.isStreaming && (
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isUser && onEdit && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                    title={t('editMessage', language)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                )}
                {!isUser && onRegenerate && (
                  <button
                    onClick={() => onRegenerate(message.id)}
                    className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                    title={t('regenerateResponse', language)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
