/**
 * 工具系统类型定义
 * 统一管理所有工具相关的类型
 */

// ===== 工具审批类型 =====
// 从 shared/config/agentConfig.ts 导入，保持单一来源
export type { ToolApprovalType, ToolCategory, ToolMetadata } from '@/shared/config/agentConfig'

// ===== 工具定义（发送给 LLM）=====

import type { ToolApprovalType } from '@/shared/config/agentConfig'

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
    /** 审批类型（可选，用于标记需要用户确认的工具） */
    approvalType?: ToolApprovalType
}

// ===== 工具执行 =====

export interface ToolExecutionResult {
    success: boolean
    result: string
    error?: string
    meta?: Record<string, unknown>
}

export interface ToolExecutionContext {
    workspacePath: string | null
    currentAssistantId?: string | null
}

export type ToolExecutor = (
    args: Record<string, unknown>,
    context: ToolExecutionContext
) => Promise<ToolExecutionResult>

// ===== 工具验证 =====

export interface ValidationResult<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

// ===== 工具调用状态 =====

export type ToolStatus =
    | 'pending'     // 等待执行/流式接收中
    | 'running'     // 正在执行
    | 'success'     // 执行成功
    | 'error'       // 执行失败
    | 'rejected'    // 用户拒绝
    | 'awaiting'    // 等待用户审批

export type ToolResultType =
    | 'tool_request'  // 等待用户审批
    | 'running_now'   // 正在执行
    | 'success'       // 执行成功
    | 'tool_error'    // 执行出错
    | 'rejected'      // 用户拒绝

// ===== 工具调用记录 =====

export interface ToolCall {
    id: string
    name: string
    arguments: Record<string, unknown>
    status: ToolStatus
    result?: string
    error?: string
    rawParams?: Record<string, unknown>
}
