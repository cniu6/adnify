/**
 * 会话管理服务
 * 保存和加载对话历史
 */

import { Message, ChatMode, LLMConfig } from '../store'

export interface ChatSession {
	id: string
	name: string
	mode: ChatMode
	messages: Message[]
	createdAt: number
	updatedAt: number
	config?: Partial<LLMConfig>
}

export interface SessionSummary {
	id: string
	name: string
	mode: ChatMode
	messageCount: number
	createdAt: number
	updatedAt: number
	preview: string // 第一条用户消息的预览
}

const SESSIONS_KEY = 'chat_sessions'
const MAX_SESSIONS = 50

/**
 * 提取消息文本内容
 */
function getMessageText(content: Message['content']): string {
	if (typeof content === 'string') return content
	return content
		.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
		.map(c => c.text)
		.join('')
}

/**
 * 生成会话名称
 */
function generateSessionName(messages: Message[]): string {
	const firstUserMessage = messages.find(m => m.role === 'user')
	if (firstUserMessage) {
		const text = getMessageText(firstUserMessage.content)
		const preview = text.slice(0, 50)
		return preview.length < text.length ? preview + '...' : preview
	}
	return `Session ${new Date().toLocaleString()}`
}

/**
 * 获取消息预览
 */
function getMessagePreview(messages: Message[]): string {
	const firstUserMessage = messages.find(m => m.role === 'user')
	if (firstUserMessage) {
		return getMessageText(firstUserMessage.content).slice(0, 100)
	}
	return ''
}

class SessionService {
	/**
	 * 获取所有会话摘要
	 */
	async getSessions(): Promise<SessionSummary[]> {
		try {
			const data = await window.electronAPI.getSetting(SESSIONS_KEY)
			if (!data || typeof data !== 'string') return []
			
			const sessions: ChatSession[] = JSON.parse(data)
			return sessions.map(s => ({
				id: s.id,
				name: s.name,
				mode: s.mode,
				messageCount: s.messages.length,
				createdAt: s.createdAt,
				updatedAt: s.updatedAt,
				preview: getMessagePreview(s.messages),
			})).sort((a, b) => b.updatedAt - a.updatedAt)
		} catch {
			return []
		}
	}

	/**
	 * 获取单个会话
	 */
	async getSession(id: string): Promise<ChatSession | null> {
		try {
			const data = await window.electronAPI.getSetting(SESSIONS_KEY)
			if (!data || typeof data !== 'string') return null
			
			const sessions: ChatSession[] = JSON.parse(data)
			return sessions.find(s => s.id === id) || null
		} catch {
			return null
		}
	}

	/**
	 * 保存会话
	 */
	async saveSession(
		messages: Message[],
		mode: ChatMode,
		existingId?: string,
		config?: Partial<LLMConfig>
	): Promise<string> {
		const data = await window.electronAPI.getSetting(SESSIONS_KEY)
		let sessions: ChatSession[] = data && typeof data === 'string' ? JSON.parse(data) : []
		
		const now = Date.now()
		
		if (existingId) {
			// 更新现有会话
			const idx = sessions.findIndex(s => s.id === existingId)
			if (idx >= 0) {
				sessions[idx] = {
					...sessions[idx],
					messages,
					mode,
					updatedAt: now,
					config,
				}
				await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify(sessions))
				return existingId
			}
		}
		
		// 创建新会话
		const newSession: ChatSession = {
			id: crypto.randomUUID(),
			name: generateSessionName(messages),
			mode,
			messages,
			createdAt: now,
			updatedAt: now,
			config,
		}
		
		sessions.unshift(newSession)
		
		// 限制会话数量
		if (sessions.length > MAX_SESSIONS) {
			sessions = sessions.slice(0, MAX_SESSIONS)
		}
		
		await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify(sessions))
		return newSession.id
	}

	/**
	 * 删除会话
	 */
	async deleteSession(id: string): Promise<boolean> {
		try {
			const data = await window.electronAPI.getSetting(SESSIONS_KEY)
			if (!data || typeof data !== 'string') return false
			
			let sessions: ChatSession[] = JSON.parse(data)
			const initialLength = sessions.length
			sessions = sessions.filter(s => s.id !== id)
			
			if (sessions.length < initialLength) {
				await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify(sessions))
				return true
			}
			return false
		} catch {
			return false
		}
	}

	/**
	 * 重命名会话
	 */
	async renameSession(id: string, name: string): Promise<boolean> {
		try {
			const data = await window.electronAPI.getSetting(SESSIONS_KEY)
			if (!data || typeof data !== 'string') return false
			
			const sessions: ChatSession[] = JSON.parse(data)
			const session = sessions.find(s => s.id === id)
			
			if (session) {
				session.name = name
				session.updatedAt = Date.now()
				await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify(sessions))
				return true
			}
			return false
		} catch {
			return false
		}
	}

	/**
	 * 清除所有会话
	 */
	async clearAllSessions(): Promise<void> {
		await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify([]))
	}

	/**
	 * 导出会话为 JSON
	 */
	async exportSession(id: string): Promise<string | null> {
		const session = await this.getSession(id)
		if (!session) return null
		return JSON.stringify(session, null, 2)
	}

	/**
	 * 导入会话
	 */
	async importSession(jsonStr: string): Promise<string | null> {
		try {
			const session: ChatSession = JSON.parse(jsonStr)
			
			// 验证必要字段
			if (!session.messages || !Array.isArray(session.messages)) {
				throw new Error('Invalid session format')
			}
			
			// 生成新 ID
			session.id = crypto.randomUUID()
			session.createdAt = Date.now()
			session.updatedAt = Date.now()
			
			const data = await window.electronAPI.getSetting(SESSIONS_KEY)
			const sessions: ChatSession[] = data && typeof data === 'string' ? JSON.parse(data) : []
			
			sessions.unshift(session)
			await window.electronAPI.setSetting(SESSIONS_KEY, JSON.stringify(sessions))
			
			return session.id
		} catch {
			return null
		}
	}
}

export const sessionService = new SessionService()
