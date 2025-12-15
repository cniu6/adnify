/**
 * 会话列表组件
 * 显示和管理保存的对话历史
 */

import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Download, Upload, Plus, X, Clock, Bot, Zap } from 'lucide-react'
import { sessionService, SessionSummary } from '../agent/sessionService'
import { useStore } from '../store'

interface SessionListProps {
	onClose: () => void
	onLoadSession: (sessionId: string) => void
}

export default function SessionList({ onClose, onLoadSession }: SessionListProps) {
	const [sessions, setSessions] = useState<SessionSummary[]>([])
	const [loading, setLoading] = useState(true)
	const { messages, chatMode, currentSessionId, setCurrentSessionId, clearMessages } = useStore()

	useEffect(() => {
		loadSessions()
	}, [])

	const loadSessions = async () => {
		setLoading(true)
		const data = await sessionService.getSessions()
		setSessions(data)
		setLoading(false)
	}

	const handleSaveCurrentSession = async () => {
		if (messages.length === 0) return
		
		const id = await sessionService.saveSession(messages, chatMode, currentSessionId || undefined)
		setCurrentSessionId(id)
		await loadSessions()
	}

	const handleLoadSession = async (id: string) => {
		const session = await sessionService.getSession(id)
		if (session) {
			onLoadSession(id)
		}
	}

	const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation()
		if (confirm('Delete this session?')) {
			await sessionService.deleteSession(id)
			if (currentSessionId === id) {
				setCurrentSessionId(null)
			}
			await loadSessions()
		}
	}

	const handleNewSession = () => {
		clearMessages()
		setCurrentSessionId(null)
		onClose()
	}

	const handleExportSession = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation()
		const json = await sessionService.exportSession(id)
		if (json) {
			const blob = new Blob([json], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `session-${id.slice(0, 8)}.json`
			a.click()
			URL.revokeObjectURL(url)
		}
	}

	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp)
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		
		if (diff < 60000) return 'Just now'
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
		if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
		return date.toLocaleDateString()
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
				<div className="flex items-center gap-2">
					<MessageSquare className="w-4 h-4 text-accent" />
					<span className="font-medium text-sm">Sessions</span>
					<span className="text-xs text-text-muted">({sessions.length})</span>
				</div>
				<button
					onClick={onClose}
					className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Actions */}
			<div className="flex gap-2 p-3 border-b border-border-subtle">
				<button
					onClick={handleNewSession}
					className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-sm transition-colors"
				>
					<Plus className="w-3.5 h-3.5" />
					New
				</button>
				<button
					onClick={handleSaveCurrentSession}
					disabled={messages.length === 0}
					className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Download className="w-3.5 h-3.5" />
					Save
				</button>
			</div>

			{/* Session List */}
			<div className="flex-1 overflow-y-auto custom-scrollbar">
				{loading ? (
					<div className="flex items-center justify-center h-32">
						<div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
					</div>
				) : sessions.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-32 text-text-muted">
						<MessageSquare className="w-8 h-8 mb-2 opacity-30" />
						<span className="text-sm">No saved sessions</span>
					</div>
				) : (
					<div className="p-2 space-y-1">
						{sessions.map((session) => (
							<div
								key={session.id}
								onClick={() => handleLoadSession(session.id)}
								className={`
									group p-3 rounded-lg cursor-pointer transition-all
									${currentSessionId === session.id 
										? 'bg-accent/10 border border-accent/20' 
										: 'hover:bg-surface-hover border border-transparent'}
								`}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											{session.mode === 'agent' ? (
												<Zap className="w-3 h-3 text-purple-400" />
											) : (
												<Bot className="w-3 h-3 text-accent" />
											)}
											<span className="text-xs font-medium text-text-primary truncate">
												{session.name}
											</span>
										</div>
										<p className="text-xs text-text-muted line-clamp-2">
											{session.preview || 'Empty session'}
										</p>
										<div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
											<span className="flex items-center gap-1">
												<Clock className="w-3 h-3" />
												{formatDate(session.updatedAt)}
											</span>
											<span>{session.messageCount} messages</span>
										</div>
									</div>
									
									<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											onClick={(e) => handleExportSession(session.id, e)}
											className="p-1 rounded hover:bg-surface-active text-text-muted hover:text-text-primary"
											title="Export"
										>
											<Upload className="w-3 h-3" />
										</button>
										<button
											onClick={(e) => handleDeleteSession(session.id, e)}
											className="p-1 rounded hover:bg-status-error/10 text-text-muted hover:text-status-error"
											title="Delete"
										>
											<Trash2 className="w-3 h-3" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
