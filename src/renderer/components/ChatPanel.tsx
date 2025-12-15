import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, User, Sparkles, Zap, MessageSquare,
  Trash2, StopCircle, Terminal, FileEdit, Search,
  FolderOpen, FileText, Check, X, AlertTriangle,
  FolderTree, History, ChevronRight, ChevronDown
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useStore, Message, ToolCall } from '../store'
import { useAgent } from '../hooks/useAgent'
import { t } from '../i18n'
import CheckpointPanel from './CheckpointPanel'
import ToolResultViewer from './ToolResultViewer'

const ToolIcon = ({ name }: { name: string }) => {
  const icons: Record<string, typeof Terminal> = {
    read_file: FileText,
    write_file: FileEdit,
    edit_file: FileEdit,
    search_files: Search,
    search_in_file: Search,
    list_directory: FolderOpen,
    get_dir_tree: FolderTree,
    create_file_or_folder: FolderOpen,
    delete_file_or_folder: Trash2,
    run_command: Terminal,
    open_terminal: Terminal,
    run_in_terminal: Terminal,
    get_terminal_output: Terminal,
    list_terminals: Terminal,
    get_lint_errors: AlertTriangle,
  }
  const Icon = icons[name] || Terminal
  return <Icon className="w-3.5 h-3.5" />
}

function ToolCallDisplay({
  toolCall,
  onApprove,
  onReject,
}: {
  toolCall: ToolCall
  onApprove?: () => void
  onReject?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  
  const statusConfig = {
    pending: { color: 'text-text-muted', bg: 'bg-surface', border: 'border-border-subtle', label: 'Pending' },
    awaiting_user: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Approval Required' },
    running: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', label: 'Running...' },
    success: { color: 'text-status-success', bg: 'bg-surface', border: 'border-border-subtle', label: 'Completed' },
    error: { color: 'text-status-error', bg: 'bg-status-error/10', border: 'border-status-error/20', label: 'Failed' },
    rejected: { color: 'text-status-warning', bg: 'bg-surface', border: 'border-border-subtle', label: 'Rejected' },
  }

  const config = statusConfig[toolCall.status] || statusConfig.pending
  const isAwaiting = toolCall.status === 'awaiting_user'

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden transition-all duration-200 my-2`}>
      {/* Header / Summary */}
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`p-1 rounded ${config.color === 'text-accent' ? 'bg-accent/20' : 'bg-surface-active'}`}>
             <ToolIcon name={toolCall.name} />
          </div>
          <span className="font-mono text-xs font-medium text-text-primary truncate">{toolCall.name}</span>
          <span className="text-xs text-text-muted truncate hidden sm:block">
            {Object.keys(toolCall.arguments).length > 0 ? '(...)' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
            {toolCall.status === 'running' && <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
            {toolCall.status === 'success' && <Check className="w-3.5 h-3.5 text-status-success" />}
            {toolCall.status === 'error' && <X className="w-3.5 h-3.5 text-status-error" />}
            <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
          <div className="border-t border-white/5 bg-black/20 p-3">
             {/* Arguments */}
            <div className="mb-3">
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1 block">Input</span>
                <pre className="text-xs font-mono text-text-secondary bg-black/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(toolCall.arguments, null, 2)}
                </pre>
            </div>

            {/* Approval Actions */}
            {isAwaiting && onApprove && onReject && (
                <div className="flex items-center gap-2 mb-3 bg-warning/5 p-2 rounded border border-warning/10">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs text-warning flex-1">Allow this action?</span>
                    <button onClick={(e) => { e.stopPropagation(); onReject() }} className="px-2 py-1 rounded bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary text-xs transition-colors">Deny</button>
                    <button onClick={(e) => { e.stopPropagation(); onApprove() }} className="px-2 py-1 rounded bg-accent text-white hover:bg-accent-hover text-xs transition-colors shadow-glow">Allow</button>
                </div>
            )}

            {/* Result */}
            {(toolCall.result || toolCall.error) && (
                <div>
                     <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1 block">Output</span>
                     <ToolResultViewer toolName={toolCall.name} result={toolCall.result || ''} error={toolCall.error} />
                </div>
            )}
          </div>
      )}
    </div>
  )
}

function ChatMessage({ message }: { message: Message }) {
  const { language } = useStore()
  const isUser = message.role === 'user'

  return (
    <div className={`group flex gap-4 py-4 px-2 animate-fade-in ${isUser ? '' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
        ${isUser ? 'bg-accent/20 text-accent' : 'bg-purple-500/20 text-purple-400'}
      `}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-medium text-text-primary opacity-90">{isUser ? 'You' : 'Assistant'}</span>
             <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                 {new Date(message.timestamp).toLocaleTimeString()}
             </span>
         </div>

        <div className={`text-sm leading-relaxed text-text-secondary ${isUser ? 'text-text-primary' : ''}`}>
          {message.role === 'tool' ? (
             <div className="text-xs text-text-muted italic flex items-center gap-2 border-l-2 border-border-subtle pl-2">
                <ToolIcon name={message.toolName || 'tool'} />
                <span>Tool output for <span className="font-mono text-accent">{message.toolName}</span></span>
             </div>
          ) : (
            <ReactMarkdown
              className="prose prose-invert prose-sm max-w-none"
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const inline = !match
                  return inline ? (
                    <code className="bg-surface-active px-1 py-0.5 rounded text-accent font-mono text-xs" {...props}>
                      {children}
                    </code>
                  ) : (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="!bg-background-secondary !border !border-border-subtle !rounded-lg !my-3 !text-xs"
                      customStyle={{ background: 'transparent' }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-3 bg-accent animate-pulse ml-1 align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const {
    chatMode, setChatMode, messages, isStreaming, currentToolCalls,
    clearMessages, llmConfig, language, pendingToolCall, checkpoints,
    setTerminalVisible, terminalVisible
  } = useStore()
  const {
    sendMessage,
    abort,
    approveCurrentTool,
    rejectCurrentTool,
  } = useAgent()
  const [input, setInput] = useState('')
  const [showCheckpoints, setShowCheckpoints] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentToolCalls])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const userMessage = input.trim()
    setInput('')
    await sendMessage(userMessage)
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasApiKey = !!llmConfig.apiKey

  return (
    <div className="w-[400px] bg-background border-l border-border-subtle flex flex-col relative shadow-xl z-10">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border-subtle bg-background/50 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
            <div className="flex bg-surface rounded-lg p-0.5 border border-border-subtle">
                <button
                onClick={() => setChatMode('chat')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    chatMode === 'chat'
                    ? 'bg-background text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                >
                Chat
                </button>
                <button
                onClick={() => setChatMode('agent')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    chatMode === 'agent'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 shadow-sm border border-purple-500/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                >
                Agent
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-1">
          {chatMode === 'agent' && checkpoints.length > 0 && (
            <button
              onClick={() => setShowCheckpoints(!showCheckpoints)}
              className={`p-1.5 rounded hover:bg-surface-hover transition-colors ${showCheckpoints ? 'text-accent' : 'text-text-muted'}`}
              title="History"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
           <button
            onClick={clearMessages}
            className="p-1.5 rounded hover:bg-surface-hover hover:text-status-error transition-colors"
            title={t('clearChat', language)}
          >
            <Trash2 className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Checkpoint Panel Overlay */}
      {showCheckpoints && (
        <div className="absolute top-10 right-0 left-0 bottom-0 bg-background/95 backdrop-blur-md z-30 overflow-hidden animate-slide-in">
             <div className="h-full overflow-y-auto">
                 <CheckpointPanel onClose={() => setShowCheckpoints(false)} />
             </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-0 pb-4">
        {!hasApiKey && (
          <div className="m-4 p-4 border border-warning/20 bg-warning/5 rounded-lg">
             <div className="flex items-center gap-2 text-warning mb-1">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="font-medium text-sm">API Key Missing</span>
             </div>
             <p className="text-xs text-text-muted">Please configure your LLM provider settings to start chatting.</p>
          </div>
        )}

        {messages.length === 0 && hasApiKey && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
             <Sparkles className="w-12 h-12 text-text-muted mb-4" />
             <p className="text-sm font-medium">How can I help you today?</p>
          </div>
        )}

        <div className="divide-y divide-border-subtle/30">
            {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
            ))}
        </div>

        {/* Current Tool Calls Area */}
        {currentToolCalls.length > 0 && (
            <div className="px-4 py-2 bg-surface/30 border-y border-border-subtle/50 my-2">
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2 block">Active Tools</span>
                {currentToolCalls.map((toolCall) => (
                    <ToolCallDisplay
                    key={toolCall.id}
                    toolCall={toolCall}
                    onApprove={pendingToolCall?.id === toolCall.id ? approveCurrentTool : undefined}
                    onReject={pendingToolCall?.id === toolCall.id ? rejectCurrentTool : undefined}
                    />
                ))}
            </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border-subtle">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? (chatMode === 'agent' ? "Instruct the agent..." : "Type a message...") : "Configure API Key..."}
            disabled={!hasApiKey || !!pendingToolCall}
            className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 pr-10
                     text-sm text-text-primary placeholder-text-muted resize-none
                     focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                     transition-all shadow-sm group-hover:border-border-highlight"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <div className="absolute right-2 bottom-2">
            <button
                onClick={isStreaming ? abort : handleSubmit}
                disabled={!hasApiKey || (!input.trim() && !isStreaming) || !!pendingToolCall}
                className={`p-1.5 rounded-lg transition-all
                ${isStreaming
                    ? 'bg-status-error/10 text-status-error hover:bg-status-error/20'
                    : input.trim() ? 'bg-accent text-white shadow-glow' : 'text-text-muted hover:text-text-primary'}
                `}
            >
                {isStreaming ? (
                <StopCircle className="w-4 h-4" />
                ) : (
                <Send className="w-4 h-4" />
                )}
            </button>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted px-1">
            <span>{chatMode === 'agent' ? "Agent Mode: Can read/write files & run commands" : "Chat Mode: Conversation only"}</span>
            <span className="opacity-50">↵ to send, ⇧↵ for new line</span>
        </div>
      </div>
    </div>
  )
}
