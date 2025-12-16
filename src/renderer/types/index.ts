/**
 * 类型定义统一导出
 */

// 从 store slices 导出类型
export type { OpenFile } from '../store/slices/fileSlice'
export type { ChatMode, Message, ToolCall, ContextStats } from '../store/slices/chatSlice'
export type { ProviderType, LLMConfig, AutoApproveSettings } from '../store/slices/settingsSlice'
export type { SidePanel, DiffView } from '../store/slices/uiSlice'

// 从 electron 类型导出
export type { FileItem, LLMStreamChunk, LLMToolCall, LLMResult, LLMError } from './electron'

// 从 provider 类型导出
export type { ProviderModelConfig } from './provider'
