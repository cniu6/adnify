/**
 * Agent 核心模块导出
 * 重新导出所有子模块，保持向后兼容
 */

// 类型（从统一类型文件导出）
export * from '../types'

// Store
export {
    useAgentStore,
    selectCurrentThread,
    selectMessages,
    selectStreamState,
    selectContextItems,
    selectIsStreaming,
    selectIsAwaitingApproval,
} from '../store/AgentStore'

// 服务
export { AgentService } from '../services/AgentService'
export type { LLMCallConfig } from '../services/AgentService'

// 工具模块
export {
    toolRegistry,
    getToolDefinitions,
    getToolApprovalType,
    TOOL_DISPLAY_NAMES,
    getToolDisplayName,
} from '../tools'
export type {
    ToolDefinition,
    ToolExecutionResult,
    ToolExecutionContext as ToolContext,
    ValidationResult,
} from '../tools'

// 配置
export { getAgentConfig, isRetryableError } from '../utils/AgentConfig'
export type { AgentRuntimeConfig } from '../utils/AgentConfig'

// 上下文构建
export { buildContextContent, buildUserContent, calculateContextStats } from '../llm/ContextBuilder'

// XML 解析
export { parseXMLToolCalls, parsePartialArgs, generateToolCallId } from '../utils/XMLToolParser'

// 工具执行服务
export { toolExecutionService, ToolExecutionService } from '../services/ToolExecutionService'
export type { ToolExecutionContext } from '../services/ToolExecutionService'

// 消息构建
export { buildLLMMessages, compressContext } from '../llm/MessageBuilder'
