/**
 * IPC 共享类型定义
 * 注意：分组 API 类型由 electronAPI.ts 从实现推断
 * 原始 ElectronAPI 类型定义在 src/renderer/types/electron.d.ts
 */

// 从 electron.d.ts 重新导出常用类型，方便 shared 层使用
export type {
  FileItem,
  SearchFilesOptions,
  SearchFileResult,
  WorkspaceConfig,
  LLMStreamChunk,
  LLMToolCall,
  LLMResult,
  LLMError,
  LLMConfig,
  LLMMessage,
  LLMSendMessageParams,
  MessageContent,
  MessageContentPart,
  ToolDefinition,
  IndexStatus,
  IndexSearchResult,
  EmbeddingProvider,
  EmbeddingConfigInput,
  AuditLog,
  SecureCommandRequest,
  DebugConfig,
  DebugBreakpoint,
  DebugStackFrame,
  DebugScope,
  DebugVariable,
  DebugSessionState,
  DebugEvent,
  LspDiagnostic,
  LspRange,
  LspPosition,
  LspLocation,
  LspHover,
  LspCompletionItem,
  LspCompletionList,
  LspTextEdit,
  LspWorkspaceEdit,
  LspCodeAction,
} from '@renderer/types/electron'
