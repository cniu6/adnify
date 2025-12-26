/**
 * Agent 模块统一类型定义
 * 
 * 所有 Agent 相关类型的单一来源
 */

// ============================================
// 从配置中心导入基础类型
// ============================================

export type {
    ToolCategory,
    ToolApprovalType,
    ToolMetadata,
    AgentRuntimeConfig,
} from '@/shared/config/agentConfig'

// ============================================
// 工具相关类型
// ============================================

/** 工具状态 */
export type ToolStatus =
    | 'pending'     // 等待执行/流式接收中
    | 'running'     // 正在执行
    | 'success'     // 执行成功
    | 'error'       // 执行失败
    | 'rejected'    // 用户拒绝
    | 'awaiting'    // 等待用户审批

/** 工具结果类型 */
export type ToolResultType =
    | 'tool_request'  // 等待用户审批
    | 'running_now'   // 正在执行
    | 'success'       // 执行成功
    | 'tool_error'    // 执行出错
    | 'rejected'      // 用户拒绝

/** 工具调用记录 */
export interface ToolCall {
    id: string
    name: string
    arguments: Record<string, unknown>
    status: ToolStatus
    result?: string
    error?: string
    rawParams?: Record<string, unknown>
}

/** 工具定义（发送给 LLM） */
export interface ToolDefinition {
    name: string
    description: string
    parameters: {
        type: 'object'
        properties: Record<string, {
            type: string
            description?: string
            enum?: string[]
            items?: any
        }>
        required?: string[]
    }
}

/** 工具执行结果 */
export interface ToolExecutionResult {
    success: boolean
    result: string
    error?: string
    meta?: Record<string, unknown>
}

/** 工具执行上下文 */
export interface ToolExecutionContext {
    workspacePath: string | null
    currentAssistantId?: string | null
}

/** 工具执行器函数类型 */
export type ToolExecutor = (
    args: Record<string, unknown>,
    context: ToolExecutionContext
) => Promise<ToolExecutionResult>

/** 工具验证结果 */
export interface ValidationResult<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

// ============================================
// 消息相关类型
// ============================================

/** 文本内容 */
export interface TextContent {
    type: 'text'
    text: string
}

/** 图片内容 */
export interface ImageContent {
    type: 'image'
    source: {
        type: 'base64' | 'url'
        media_type: string
        data: string
    }
}

/** 消息内容 */
export type MessageContent = string | Array<TextContent | ImageContent>

/** 文本部分 */
export interface TextPart {
    type: 'text'
    content: string
}

/** 推理部分 */
export interface ReasoningPart {
    type: 'reasoning'
    content: string
    startTime?: number
    isStreaming?: boolean
}

/** 工具调用部分 */
export interface ToolCallPart {
    type: 'tool_call'
    toolCall: ToolCall
}

/** 助手消息部分 */
export type AssistantPart = TextPart | ReasoningPart | ToolCallPart

/** Token 使用统计 */
export interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

/** 用户消息 */
export interface UserMessage {
    id: string
    role: 'user'
    content: MessageContent
    displayContent?: string
    timestamp: number
    contextItems?: ContextItem[]
}

/** 助手消息 */
export interface AssistantMessage {
    id: string
    role: 'assistant'
    content: string
    displayContent?: string
    timestamp: number
    isStreaming?: boolean
    parts: AssistantPart[]
    toolCalls?: ToolCall[]
    reasoning?: string
    reasoningStartTime?: number
    usage?: TokenUsage
}

/** 工具结果消息 */
export interface ToolResultMessage {
    id: string
    role: 'tool'
    toolCallId: string
    name: string
    content: string
    timestamp: number
    type: ToolResultType
    rawParams?: Record<string, unknown>
}

/** Checkpoint 消息 */
export interface CheckpointMessage {
    id: string
    role: 'checkpoint'
    type: 'user_message' | 'tool_edit'
    timestamp: number
    fileSnapshots: Record<string, FileSnapshot>
    userModifications?: Record<string, FileSnapshot>
}

/** 被中断的工具调用消息 */
export interface InterruptedToolMessage {
    id: string
    role: 'interrupted_tool'
    name: string
    timestamp: number
}

/** 聊天消息联合类型 */
export type ChatMessage =
    | UserMessage
    | AssistantMessage
    | ToolResultMessage
    | CheckpointMessage
    | InterruptedToolMessage

// ============================================
// Plan 相关类型
// ============================================

/** 计划项状态 */
export type PlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

/** 计划状态 */
export type PlanStatus = 'draft' | 'active' | 'completed' | 'failed'

/** 计划项 */
export interface PlanItem {
    id: string
    title: string
    description?: string
    status: PlanItemStatus
}

/** 计划 */
export interface Plan {
    id: string
    items: PlanItem[]
    status: PlanStatus
    currentStepId: string | null
    createdAt: number
    updatedAt: number
}

// ============================================
// 上下文相关类型
// ============================================

/** 上下文项类型 */
export type ContextItemType = 'File' | 'CodeSelection' | 'Folder' | 'Codebase' | 'Git' | 'Terminal' | 'Symbols' | 'Web'

export interface FileContext { type: 'File'; uri: string }
export interface CodeSelectionContext { type: 'CodeSelection'; uri: string; range: [number, number] }
export interface FolderContext { type: 'Folder'; uri: string }
export interface CodebaseContext { type: 'Codebase'; query?: string }
export interface GitContext { type: 'Git' }
export interface TerminalContext { type: 'Terminal' }
export interface SymbolsContext { type: 'Symbols' }
export interface WebContext { type: 'Web'; query?: string }

/** 上下文项联合类型 */
export type ContextItem =
    | FileContext
    | CodeSelectionContext
    | FolderContext
    | CodebaseContext
    | WebContext
    | GitContext
    | TerminalContext
    | SymbolsContext

// ============================================
// 线程和流状态类型
// ============================================

/** 线程状态 */
export interface ThreadState {
    currentCheckpointIdx: number | null
    isStreaming: boolean
    pendingToolCall?: ToolCall
    error?: string
}

/** 聊天线程 */
export interface ChatThread {
    id: string
    createdAt: number
    lastModified: number
    messages: ChatMessage[]
    contextItems: ContextItem[]
    state: ThreadState
}

/** 流阶段 */
export type StreamPhase = 'idle' | 'streaming' | 'tool_pending' | 'tool_running' | 'error'

/** 流状态 */
export interface StreamState {
    phase: StreamPhase
    currentToolCall?: ToolCall
    error?: string
    statusText?: string
}

// ============================================
// 文件和检查点类型
// ============================================

/** 文件快照 */
export interface FileSnapshot {
    fsPath?: string
    path?: string
    content: string | null
    timestamp?: number
}

/** 待确认的更改 */
export interface PendingChange {
    id: string
    filePath: string
    toolCallId: string
    toolName: string
    status: 'pending' | 'accepted' | 'rejected'
    snapshot: FileSnapshot
    timestamp: number
    linesAdded: number
    linesRemoved: number
}

/** 消息检查点 */
export interface MessageCheckpoint {
    id: string
    messageId: string
    timestamp: number
    fileSnapshots: Record<string, FileSnapshot>
    description: string
}

/** 检查点 */
export interface Checkpoint {
    id: string
    type: 'user_message' | 'tool_edit'
    timestamp: number
    snapshots: Record<string, FileSnapshot>
    description: string
    messageId?: string
}

// ============================================
// 服务相关类型
// ============================================

/** Lint 错误 */
export interface LintError {
    file: string
    line?: number
    column?: number
    message: string
    severity: 'error' | 'warning' | 'info'
    rule?: string
    code?: string
    startLine?: number
    endLine?: number
}

/** 流式编辑状态 */
export interface StreamingEditState {
    editId: string
    filePath: string
    originalContent: string
    currentContent: string
    isComplete: boolean
    startTime: number
    endTime?: number
}

/** 持久化终端 */
export interface PersistentTerminal {
    id: string
    name: string
    cwd: string
    isRunning: boolean
    lastOutput: string
    createdAt: number
    output: string[]
}

/** 终端命令结果 */
export interface TerminalCommandResult {
    success: boolean
    output: string
    exitCode: number
    duration: number
    terminalId?: string
    isComplete?: boolean
}

// ============================================
// 类型守卫函数
// ============================================

export function isUserMessage(msg: ChatMessage): msg is UserMessage {
    return msg.role === 'user'
}

export function isAssistantMessage(msg: ChatMessage): msg is AssistantMessage {
    return msg.role === 'assistant'
}

export function isToolResultMessage(msg: ChatMessage): msg is ToolResultMessage {
    return msg.role === 'tool'
}

export function isCheckpointMessage(msg: ChatMessage): msg is CheckpointMessage {
    return msg.role === 'checkpoint'
}

export function isInterruptedToolMessage(msg: ChatMessage): msg is InterruptedToolMessage {
    return msg.role === 'interrupted_tool'
}

export function isTextPart(part: AssistantPart): part is TextPart {
    return part.type === 'text'
}

export function isReasoningPart(part: AssistantPart): part is ReasoningPart {
    return part.type === 'reasoning'
}

export function isToolCallPart(part: AssistantPart): part is ToolCallPart {
    return part.type === 'tool_call'
}

// ============================================
// 工具函数
// ============================================

export function getMessageText(content: MessageContent): string {
    if (typeof content === 'string') return content
    return content
        .filter((c): c is TextContent => c.type === 'text')
        .map(c => c.text)
        .join('')
}

export function getMessageImages(content: MessageContent): ImageContent[] {
    if (typeof content === 'string') return []
    return content.filter((c): c is ImageContent => c.type === 'image')
}

export function getModifiedFilesFromMessages(messages: ChatMessage[]): string[] {
    const files = new Set<string>()
    for (const msg of messages) {
        if (isAssistantMessage(msg)) {
            for (const part of msg.parts) {
                if (isToolCallPart(part)) {
                    const tc = part.toolCall
                    if (['edit_file', 'write_file', 'create_file_or_folder'].includes(tc.name)) {
                        const path = (tc.arguments.path || (tc.arguments._meta as any)?.filePath) as string
                        if (path) files.add(path)
                    }
                }
            }
        }
    }
    return Array.from(files)
}

export function findLastCheckpointIndex(messages: ChatMessage[]): number {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (isCheckpointMessage(messages[i])) return i
    }
    return -1
}
