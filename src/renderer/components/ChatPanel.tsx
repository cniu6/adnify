/**
 * 聊天面板主组件
 * 整合所有聊天相关子组件
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { Logo } from './Logo'
import { useStore } from '../store'
import { useAgent } from '../hooks/useAgent'
import { t } from '../i18n'
import { toFullPath, normalizePath } from '../utils/pathUtils'

import {
  ChatMessage,
  ChatHeader,
  ChatContextStats,
  ChatInput,
  PendingImage,
  getMessageText,
} from './chat'
import ToolCallInline from './ToolCallInline'
import SessionList from './SessionList'
import FileMentionPopup from './FileMentionPopup'
import { sessionService } from '../agent/sessionService'
import { checkpointService } from '../agent/checkpointService'

export default function ChatPanel() {
  const {
    chatMode,
    setChatMode,
    messages,
    isStreaming,
    currentToolCalls,
    clearMessages,
    llmConfig,
    pendingToolCall,
    setCurrentSessionId,
    addMessage,
    workspacePath,
    openFile,
    setActiveFile,
    inputPrompt,
    setInputPrompt,
    editMessage,
    deleteMessagesAfter,
    language,
    contextStats,
  } = useStore()

  const { sendMessage, abort, approveCurrentTool, rejectCurrentTool } = useAgent()

  const [input, setInput] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [showFileMention, setShowFileMention] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)

  // External prompt (from Command Palette)
  useEffect(() => {
    if (inputPrompt) {
      setInput(inputPrompt)
      setInputPrompt('')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [inputPrompt, setInputPrompt])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentToolCalls])

  // Tool file click handler
  const handleToolFileClick = useCallback(
    async (filePath: string) => {
      const fullPath = toFullPath(filePath, workspacePath)
      const currentContent = await window.electronAPI.readFile(fullPath)
      if (currentContent === null) return

      // Find original content from checkpoints
      const serviceCheckpoints = checkpointService.getCheckpoints()
      const { checkpoints: storeCheckpoints } = useStore.getState()
      const allCheckpoints = [...serviceCheckpoints, ...storeCheckpoints]
      let originalContent: string | undefined

      const normalizedFullPath = normalizePath(fullPath)
      const normalizedFilePath = normalizePath(filePath)

      for (let i = allCheckpoints.length - 1; i >= 0; i--) {
        const checkpoint = allCheckpoints[i]
        if (!checkpoint.snapshots) continue

        for (const snapshotPath of Object.keys(checkpoint.snapshots)) {
          const normalizedSnapshotPath = normalizePath(snapshotPath)
          if (
            normalizedSnapshotPath === normalizedFullPath ||
            normalizedSnapshotPath === normalizedFilePath ||
            normalizedSnapshotPath.endsWith('/' + normalizedFilePath) ||
            normalizedFullPath.endsWith(
              '/' + normalizePath(snapshotPath.split(/[\\/]/).pop() || '')
            )
          ) {
            originalContent = checkpoint.snapshots[snapshotPath].content
            break
          }
        }
        if (originalContent) break
      }

      if (originalContent && originalContent !== currentContent) {
        openFile(fullPath, currentContent, originalContent)
      } else {
        openFile(fullPath, currentContent)
      }
      setActiveFile(fullPath)
    },
    [workspacePath, openFile, setActiveFile]
  )

  // Image handling
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
  }, [])

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) addImage(file)
        }
      }
    },
    [addImage]
  )

  // Drag and Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))

      if (imageFiles.length > 0) {
        imageFiles.forEach(addImage)
        return
      }

      // Handle file paths
      let paths: string[] = []
      const internalPath = e.dataTransfer.getData('application/adnify-file-path')
      if (internalPath) {
        paths.push(internalPath)
      } else {
        const nonImages = files.filter((f) => !f.type.startsWith('image/'))
        if (nonImages.length > 0) {
          paths = nonImages
            .map((f) => (f as File & { path?: string }).path)
            .filter((p): p is string => Boolean(p))
        }
      }

      if (paths.length > 0) {
        setInput((prev) => {
          const prefix = prev.trim() ? prev + ' ' : ''
          const mentions = paths.map((p) => `@${p.split(/[\\/]/).pop()}`).join(' ')
          return prefix + mentions + ' '
        })
        textareaRef.current?.focus()
      }
    },
    [addImage]
  )

  // Input change handler with file mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setInput(value)

    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

    if (atMatch) {
      setMentionQuery(atMatch[1])
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect()
        setMentionPosition({ x: rect.left + 16, y: rect.top })
      }
      setShowFileMention(true)
    } else {
      setShowFileMention(false)
      setMentionQuery('')
    }
  }, [])

  // File selection from mention popup
  const handleSelectFile = useCallback(
    (filePath: string) => {
      const cursorPos = textareaRef.current?.selectionStart || input.length
      const textBeforeCursor = input.slice(0, cursorPos)
      const textAfterCursor = input.slice(cursorPos)

      const atIndex = textBeforeCursor.lastIndexOf('@')
      if (atIndex !== -1) {
        const newInput = textBeforeCursor.slice(0, atIndex) + '@' + filePath + ' ' + textAfterCursor
        setInput(newInput)
      }

      setShowFileMention(false)
      setMentionQuery('')
      textareaRef.current?.focus()
    },
    [input]
  )

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if ((!input.trim() && images.length === 0) || isStreaming) return

    let userMessage: string | any[] = input.trim()

    if (images.length > 0) {
      const readyImages = images.filter((img) => img.base64)
      if (readyImages.length !== images.length) {
        console.warn('Waiting for image processing...')
        return
      }

      userMessage = [
        { type: 'text', text: input.trim() },
        ...readyImages.map((img) => ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.file.type,
            data: img.base64,
          },
        })),
      ]
    }

    setInput('')
    setImages([])
    await sendMessage(userMessage as any)
  }, [input, images, isStreaming, sendMessage])

  // Load session
  const handleLoadSession = useCallback(
    async (sessionId: string) => {
      const session = await sessionService.getSession(sessionId)
      if (session) {
        clearMessages()
        setChatMode(session.mode)
        session.messages.forEach((msg) => {
          addMessage({
            role: msg.role,
            content: msg.content as any,
            toolCallId: msg.toolCallId,
            toolName: msg.toolName,
          })
        })
        setCurrentSessionId(sessionId)
        setShowSessions(false)
      }
    },
    [clearMessages, setChatMode, addMessage, setCurrentSessionId]
  )

  // Edit message and resend
  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      deleteMessagesAfter(messageId)
      editMessage(messageId, newContent)
      await sendMessage(newContent)
    },
    [deleteMessagesAfter, editMessage, sendMessage]
  )

  // Regenerate response
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId)
      if (msgIndex <= 0) return

      let userMsgIndex = msgIndex - 1
      while (userMsgIndex >= 0 && messages[userMsgIndex].role !== 'user') {
        userMsgIndex--
      }

      if (userMsgIndex < 0) return

      const userMsg = messages[userMsgIndex]
      const userContent = getMessageText(userMsg.content)

      deleteMessagesAfter(userMsg.id)
      await sendMessage(userContent)
    },
    [messages, deleteMessagesAfter, sendMessage]
  )

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showFileMention) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setShowFileMention(false)
          setMentionQuery('')
        }
        if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
          e.preventDefault()
          return
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [showFileMention, handleSubmit]
  )

  const hasApiKey = !!llmConfig.apiKey

  return (
    <div
      className={`w-full h-full flex flex-col relative z-10 bg-[#09090b] transition-colors ${
        isDragging ? 'bg-accent/5 ring-2 ring-inset ring-accent' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <ChatHeader
        chatMode={chatMode}
        setChatMode={setChatMode}
        showSessions={showSessions}
        setShowSessions={setShowSessions}
        onClearMessages={clearMessages}
      />

      {/* Context Stats Bar */}
      {contextStats && messages.length > 0 && (
        <ChatContextStats stats={contextStats} language={language} />
      )}

      {/* Session List Overlay */}
      {showSessions && (
        <div className="absolute top-12 right-0 left-0 bottom-0 bg-background/95 backdrop-blur-md z-30 overflow-hidden animate-slide-in p-4">
          <SessionList onClose={() => setShowSessions(false)} onLoadSession={handleLoadSession} />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-0 pb-4 bg-background">
        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="m-4 p-4 border border-warning/20 bg-warning/5 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <span className="font-medium text-sm text-warning block mb-1">
                {t('setupRequired', language)}
              </span>
              <p className="text-xs text-text-muted leading-relaxed">
                {t('setupRequiredDesc', language)}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && hasApiKey && (
          <div className="h-full flex flex-col items-center justify-center opacity-40 select-none pointer-events-none gap-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-surface to-surface-active border border-border-subtle flex items-center justify-center shadow-2xl">
              <Logo className="w-12 h-12" glow />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary mb-1">Adnify Agent</p>
              <p className="text-sm text-text-muted">{t('howCanIHelp', language)}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-0 pb-4">
          {messages.map((msg) => {
            if (msg.role === 'tool') return null

            const textContent = getMessageText(msg.content)
            
            // 获取与此消息关联的工具调用
            const linkedToolCalls = msg.toolCallIds
              ? currentToolCalls.filter((tc) => msg.toolCallIds?.includes(tc.id))
              : []
            
            const hasContent = textContent.trim() || msg.isStreaming || linkedToolCalls.length > 0

            if (msg.role === 'assistant' && !hasContent) return null

            return (
              <div key={msg.id}>
                {(textContent.trim() || msg.isStreaming || msg.role === 'user') && (
                  <ChatMessage
                    message={msg}
                    onEdit={handleEditMessage}
                    onRegenerate={handleRegenerate}
                  />
                )}

                {/* 内联显示与此消息关联的工具调用 */}
                {linkedToolCalls.length > 0 && (
                  <div className="px-4 py-2 pl-12">
                    {linkedToolCalls.map((toolCall) => (
                      <ToolCallInline
                        key={toolCall.id}
                        toolCall={toolCall}
                        onApprove={
                          pendingToolCall?.id === toolCall.id ? approveCurrentTool : undefined
                        }
                        onReject={
                          pendingToolCall?.id === toolCall.id ? rejectCurrentTool : undefined
                        }
                        onFileClick={handleToolFileClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Tool calls without messages (fallback) */}
          {messages.length === 0 && currentToolCalls.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center bg-accent/20 text-accent">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-text-secondary">Adnify</span>
              </div>
              <div className="pl-8">
                {currentToolCalls.map((toolCall) => (
                  <ToolCallInline
                    key={toolCall.id}
                    toolCall={toolCall}
                    onApprove={pendingToolCall?.id === toolCall.id ? approveCurrentTool : undefined}
                    onReject={pendingToolCall?.id === toolCall.id ? rejectCurrentTool : undefined}
                    onFileClick={handleToolFileClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* File Mention Popup */}
      {showFileMention && (
        <FileMentionPopup
          position={mentionPosition}
          searchQuery={mentionQuery}
          onSelect={handleSelectFile}
          onClose={() => {
            setShowFileMention(false)
            setMentionQuery('')
          }}
        />
      )}

      {/* Input Area */}
      <ChatInput
        input={input}
        setInput={setInput}
        images={images}
        setImages={setImages}
        isStreaming={isStreaming}
        hasApiKey={hasApiKey}
        hasPendingToolCall={!!pendingToolCall}
        chatMode={chatMode}
        onSubmit={handleSubmit}
        onAbort={abort}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        textareaRef={textareaRef}
        inputContainerRef={inputContainerRef}
      />
    </div>
  )
}
