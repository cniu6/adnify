/**
 * Agent Hook
 * 管理 AI 对话和工具调用流程
 */

import { useCallback, useRef } from 'react'
import { useStore, ToolCall } from '../store'
import { getTools, executeToolCall, buildSystemPrompt, getToolApprovalType } from '../agent/tools'
import { checkpointService } from '../agent/checkpointService'
import { contextService, buildContextString } from '../agent/contextService'
import { ToolStatus } from '../agent/toolTypes'
import { LLMStreamChunk, LLMToolCall, LLMResult, LLMError } from '../types/electron'

const MAX_TOOL_LOOPS = 15
const REQUEST_TIMEOUT = 120000 // 2 分钟

export function useAgent() {
	const {
		chatMode,
		messages,
		llmConfig,
		workspacePath,
		autoApprove,
		pendingToolCall,
		addMessage,
		updateLastMessage,
		setIsStreaming,
		addToolCall,
		updateToolCall,
		setPendingToolCall,
		addCheckpoint,
	} = useStore()

	const abortRef = useRef(false)
	const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null)

	// 等待用户审批
	const waitForApproval = useCallback((toolCall: ToolCall): Promise<boolean> => {
		return new Promise((resolve) => {
			approvalResolverRef.current = resolve
			setPendingToolCall(toolCall)
		})
	}, [setPendingToolCall])

	// 审批工具调用
	const approveCurrentTool = useCallback(() => {
		if (approvalResolverRef.current) {
			approvalResolverRef.current(true)
			approvalResolverRef.current = null
		}
		setPendingToolCall(null)
	}, [setPendingToolCall])

	const rejectCurrentTool = useCallback(() => {
		if (approvalResolverRef.current) {
			approvalResolverRef.current(false)
			approvalResolverRef.current = null
		}
		setPendingToolCall(null)
	}, [setPendingToolCall])

	// 发送消息
	const sendMessage = useCallback(async (userMessage: string) => {
		if (!llmConfig.apiKey) {
			addMessage({
				role: 'assistant',
				content: '❌ Please configure your API key in Settings first.',
			})
			return
		}

		abortRef.current = false
		setIsStreaming(true)

		// 创建用户消息检查点
		if (workspacePath) {
			const checkpoint = await checkpointService.createCheckpoint(
				'user_message',
				`Before: "${userMessage.slice(0, 50)}..."`,
				[]
			)
			addCheckpoint(checkpoint)
		}

		// 处理 @file 引用，收集上下文
		const { files: contextFiles, cleanedMessage } = await contextService.collectContext(
			userMessage,
			{ includeActiveFile: true, includeOpenFiles: false }
		)

		// 构建带上下文的消息
		let messageWithContext = cleanedMessage
		if (contextFiles.length > 0) {
			messageWithContext += '\n\n' + buildContextString(contextFiles)
		}

		// 添加用户消息（显示原始消息，但发送带上下文的消息）
		addMessage({ role: 'user', content: userMessage })

		// 构建对话历史
		const conversationMessages = [
			...messages.map(m => ({
				role: m.role,
				content: m.content,
				toolCallId: m.toolCallId,
				toolName: m.toolName,
			})),
			{ role: 'user' as const, content: messageWithContext }
		]

		// Agent 循环
		let shouldContinue = true
		let loopCount = 0

		while (shouldContinue && loopCount < MAX_TOOL_LOOPS && !abortRef.current) {
			loopCount++
			shouldContinue = false

			// 添加助手响应占位符
			addMessage({ role: 'assistant', content: '', isStreaming: true })

			// 获取工具（仅 agent 模式）
			const tools = chatMode === 'agent' ? getTools() : undefined

			// 获取上下文信息
			const state = useStore.getState()
			const openFilePaths = state.openFiles.map(f => f.path)
			const activeFilePath = state.activeFilePath || undefined

			const systemPrompt = buildSystemPrompt(chatMode, workspacePath, {
				openFiles: openFilePaths,
				activeFile: activeFilePath,
			})

			// 等待 LLM 响应
			const result = await sendToLLM({
				config: llmConfig,
				messages: conversationMessages,
				tools,
				systemPrompt,
				onStream: (chunk) => {
					if (chunk.type === 'text' && chunk.content) {
						updateLastMessage(
							(useStore.getState().messages.at(-1)?.content || '') + chunk.content
						)
					}
				},
				onToolCall: (toolCall) => {
					const approvalType = getToolApprovalType(toolCall.name)
					addToolCall({
						id: toolCall.id,
						name: toolCall.name,
						arguments: toolCall.arguments,
						approvalType,
					})
				}
			})

			// 处理错误
			if (result.error) {
				const errorMessage = result.error.retryable
					? `❌ ${result.error.message}\n\nThis error may be temporary. Please try again.`
					: `❌ ${result.error.message}`

				updateLastMessage(errorMessage)
				setIsStreaming(false)
				return
			}

			// 更新对话历史
			const assistantContent = useStore.getState().messages.at(-1)?.content || ''
			conversationMessages.push({
				role: 'assistant' as const,
				content: assistantContent,
				toolCallId: undefined,
				toolName: undefined,
			})

			// 处理工具调用
			if (result.data?.toolCalls && result.data.toolCalls.length > 0 && chatMode === 'agent') {
				for (const toolCall of result.data.toolCalls) {
					if (abortRef.current) break

					shouldContinue = await processToolCall(
						toolCall,
						conversationMessages,
						autoApprove,
						waitForApproval,
						updateToolCall,
						addMessage,
						addCheckpoint
					)
				}
			}
		}

		if (loopCount >= MAX_TOOL_LOOPS) {
			addMessage({
				role: 'assistant',
				content: '⚠️ Reached maximum tool call limit. Please continue with a new message if needed.',
			})
		}

		setIsStreaming(false)
	}, [
		chatMode, messages, llmConfig, workspacePath, autoApprove,
		addMessage, updateLastMessage, setIsStreaming, addToolCall, updateToolCall,
		addCheckpoint, waitForApproval
	])

	// 中止
	const abort = useCallback(() => {
		abortRef.current = true
		window.electronAPI.abortMessage()
		setIsStreaming(false)

		if (approvalResolverRef.current) {
			approvalResolverRef.current(false)
			approvalResolverRef.current = null
		}
		setPendingToolCall(null)
	}, [setIsStreaming, setPendingToolCall])

	// 回滚到检查点
	const rollbackToCheckpoint = useCallback(async (checkpointId: string) => {
		const result = await checkpointService.rollbackTo(checkpointId)
		if (result.success) {
			addMessage({
				role: 'assistant',
				content: `✅ Rolled back to checkpoint. Restored ${result.restoredFiles.length} file(s).`,
			})
		} else {
			addMessage({
				role: 'assistant',
				content: `⚠️ Rollback completed with errors:\n${result.errors.join('\n')}`,
			})
		}
		return result
	}, [addMessage])

	return {
		sendMessage,
		abort,
		approveCurrentTool,
		rejectCurrentTool,
		rollbackToCheckpoint,
		pendingToolCall,
	}
}

/**
 * 发送请求到 LLM 并等待响应
 */
async function sendToLLM(params: {
	config: any
	messages: any[]
	tools?: any[]
	systemPrompt: string
	onStream: (chunk: LLMStreamChunk) => void
	onToolCall: (toolCall: LLMToolCall) => void
}): Promise<{ data?: LLMResult; error?: LLMError }> {
	return new Promise((resolve) => {
		let resolved = false
		const unsubscribers: (() => void)[] = []

		const cleanup = () => {
			if (!resolved) {
				resolved = true
				unsubscribers.forEach(unsub => unsub())
			}
		}

		// 监听流式响应
		unsubscribers.push(
			window.electronAPI.onLLMStream(params.onStream)
		)

		// 监听工具调用
		unsubscribers.push(
			window.electronAPI.onLLMToolCall(params.onToolCall)
		)

		// 监听完成
		unsubscribers.push(
			window.electronAPI.onLLMDone((result) => {
				cleanup()
				resolve({ data: result })
			})
		)

		// 监听错误
		unsubscribers.push(
			window.electronAPI.onLLMError((error) => {
				cleanup()
				resolve({ error })
			})
		)

		// 超时保护
		setTimeout(() => {
			if (!resolved) {
				cleanup()
				resolve({
					error: {
						message: 'Request timeout. Please try again.',
						code: 'TIMEOUT',
						retryable: true
					}
				})
			}
		}, REQUEST_TIMEOUT)

		// 发送请求
		window.electronAPI.sendMessage({
			config: params.config,
			messages: params.messages,
			tools: params.tools,
			systemPrompt: params.systemPrompt,
		}).catch((err) => {
			if (!resolved) {
				cleanup()
				resolve({
					error: {
						message: err.message || 'IPC call failed',
						code: 'IPC_ERROR',
						retryable: false
					}
				})
			}
		})
	})
}

/**
 * 处理单个工具调用
 */
async function processToolCall(
	toolCall: LLMToolCall,
	conversationMessages: any[],
	autoApprove: { edits: boolean; terminal: boolean; dangerous: boolean },
	waitForApproval: (tc: ToolCall) => Promise<boolean>,
	updateToolCall: (id: string, updates: Partial<ToolCall>) => void,
	addMessage: (msg: any) => void,
	addCheckpoint: (cp: any) => void
): Promise<boolean> {
	const approvalType = getToolApprovalType(toolCall.name)
	const toolCallWithApproval: ToolCall = {
		id: toolCall.id,
		name: toolCall.name,
		arguments: toolCall.arguments,
		status: 'pending' as ToolStatus,
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
				error: 'Rejected by user'
			})

			addMessage({
				role: 'tool',
				content: '❌ Tool call rejected by user',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
			})

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
		const checkpoint = await checkpointService.createCheckpoint(
			'tool_edit',
			`Before ${toolCall.name}: ${toolCall.arguments.path}`,
			[toolCall.arguments.path]
		)
		addCheckpoint(checkpoint)
	}

	try {
		const toolResult = await executeToolCall(toolCall.name, toolCall.arguments)
		const resultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)

		updateToolCall(toolCall.id, {
			status: 'success' as ToolStatus,
			result: resultStr
		})

		addMessage({
			role: 'tool',
			content: resultStr,
			toolCallId: toolCall.id,
			toolName: toolCall.name,
		})

		// 添加到对话历史
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

	} catch (error: any) {
		updateToolCall(toolCall.id, {
			status: 'error' as ToolStatus,
			error: error.message
		})

		addMessage({
			role: 'tool',
			content: `❌ Error: ${error.message}`,
			toolCallId: toolCall.id,
			toolName: toolCall.name,
		})

		conversationMessages.push({
			role: 'tool',
			content: `Error: ${error.message}`,
			toolCallId: toolCall.id,
			toolName: toolCall.name,
		})

		return false
	}
}
