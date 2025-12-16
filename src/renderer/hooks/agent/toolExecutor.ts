/**
 * 工具执行器
 * 处理工具调用的执行和审批
 */
import { ToolCall } from '../../store'
import { executeToolCall, getToolApprovalType } from '../../agent/tools'
import { checkpointService } from '../../agent/checkpointService'
import { ToolStatus, Checkpoint } from '../../agent/toolTypes'
import { LLMToolCall } from '../../types/electron'
import { LLMMessageForSend } from './llmClient'
import { toFullPath } from '../../utils/pathUtils'

export interface ToolExecutionContext {
  autoApprove: { edits: boolean; terminal: boolean; dangerous: boolean }
  workspacePath: string | null
  waitForApproval: (tc: ToolCall) => Promise<boolean>
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void
  addCheckpoint: (cp: Checkpoint) => void
}

/**
 * 处理单个工具调用（静默模式 - 不添加 tool 消息到 UI）
 * 工具结果在 ToolCallCard 中内联显示
 */
export async function processToolCall(
  toolCall: LLMToolCall,
  conversationMessages: LLMMessageForSend[],
  context: ToolExecutionContext
): Promise<boolean> {
  const { autoApprove, workspacePath, waitForApproval, updateToolCall, addCheckpoint } = context

  const approvalType = getToolApprovalType(toolCall.name)
  const toolCallWithApproval: ToolCall = {
    id: toolCall.id,
    name: toolCall.name,
    arguments: toolCall.arguments,
    status: 'running' as ToolStatus,
    approvalType,
  }

  // 检查是否需要审批
  let approved = true
  if (approvalType && !autoApprove[approvalType]) {
    updateToolCall(toolCall.id, { status: 'awaiting_user' as ToolStatus })
    approved = await waitForApproval(toolCallWithApproval)

    if (!approved) {
      updateToolCall(toolCall.id, {
        status: 'rejected' as ToolStatus,
        error: 'Rejected by user',
      })

      // 只添加到对话历史，不添加到 UI
      conversationMessages.push({
        role: 'tool',
        content: 'Tool call was rejected by the user.',
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      })

      return false
    }
  }

  // 执行工具
  updateToolCall(toolCall.id, { status: 'running' as ToolStatus })

  // 编辑类工具创建检查点
  if (approvalType === 'edits' && toolCall.arguments.path) {
    const relativePath = toolCall.arguments.path as string
    const fullPath = toFullPath(relativePath, workspacePath)

    const checkpoint = await checkpointService.createCheckpoint(
      'tool_edit',
      `Before ${toolCall.name}: ${relativePath}`,
      [fullPath]
    )
    addCheckpoint(checkpoint)
  }

  try {
    const toolResult = await executeToolCall(toolCall.name, toolCall.arguments, workspacePath)
    const resultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)

    updateToolCall(toolCall.id, {
      status: 'success' as ToolStatus,
      result: resultStr,
    })

    // 添加到对话历史（用于 LLM 上下文）
    conversationMessages.push({
      role: 'assistant',
      content: JSON.stringify(toolCall.arguments),
      toolCallId: toolCall.id,
      toolName: toolCall.name,
    })
    conversationMessages.push({
      role: 'tool',
      content: resultStr,
      toolCallId: toolCall.id,
      toolName: toolCall.name,
    })

    return true
  } catch (error: unknown) {
    const err = error as { message?: string }
    updateToolCall(toolCall.id, {
      status: 'error' as ToolStatus,
      error: err.message,
    })

    conversationMessages.push({
      role: 'tool',
      content: `Error: ${err.message}`,
      toolCallId: toolCall.id,
      toolName: toolCall.name,
    })

    return false
  }
}
