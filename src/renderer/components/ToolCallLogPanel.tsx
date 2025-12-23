/**
 * Tool Call Log Panel
 * 显示 LLM 工具调用的请求和响应日志，便于调试
 */

import { useState, useEffect, useRef } from 'react'
import { Code2, Trash2, Download, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Button } from './ui'
import { JsonHighlight } from '@/renderer/utils/jsonHighlight'

interface ToolCallLogEntry {
    id: string
    timestamp: Date
    type: 'request' | 'response'
    toolName: string
    data: unknown
    duration?: number
}

interface ToolCallLogPanelProps {
    isOpen: boolean
    onClose: () => void
    language?: 'en' | 'zh'
}

// 全局日志存储
let logEntries: ToolCallLogEntry[] = []
const MAX_LOGS = 100

// 添加日志的公共函数
export function addToolCallLog(entry: Omit<ToolCallLogEntry, 'id' | 'timestamp'>) {
    const newEntry: ToolCallLogEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date()
    }
    logEntries.unshift(newEntry)
    if (logEntries.length > MAX_LOGS) {
        logEntries = logEntries.slice(0, MAX_LOGS)
    }
    // 触发更新订阅者
    logSubscribers.forEach(fn => fn([...logEntries]))
}

// 订阅日志更新
const logSubscribers: ((logs: ToolCallLogEntry[]) => void)[] = []
function subscribeToLogs(callback: (logs: ToolCallLogEntry[]) => void) {
    logSubscribers.push(callback)
    return () => {
        const idx = logSubscribers.indexOf(callback)
        if (idx >= 0) logSubscribers.splice(idx, 1)
    }
}

export function clearToolCallLogs() {
    logEntries = []
    logSubscribers.forEach(fn => fn([]))
}

export default function ToolCallLogPanel({ isOpen, onClose, language = 'zh' }: ToolCallLogPanelProps) {
    const [logs, setLogs] = useState<ToolCallLogEntry[]>(logEntries)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [filter, setFilter] = useState<'all' | 'request' | 'response'>('all')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const unsubscribe = subscribeToLogs(setLogs)
        return unsubscribe
    }, [])

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedIds(newExpanded)
    }

    const handleCopy = async (id: string, data: unknown) => {
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tool-call-logs-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(log => log.type === filter)

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-[800px] max-w-[90vw] max-h-[80vh] bg-surface rounded-xl border border-border shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                        <Code2 className="w-5 h-5 text-accent" />
                        <h3 className="text-sm font-medium text-text-primary">
                            {language === 'zh' ? '工具调用日志' : 'Tool Call Logs'}
                        </h3>
                        <span className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">
                            {filteredLogs.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value as 'all' | 'request' | 'response')}
                            className="px-2 py-1 text-xs bg-surface border border-border-subtle rounded text-text-secondary"
                        >
                            <option value="all">{language === 'zh' ? '全部' : 'All'}</option>
                            <option value="request">{language === 'zh' ? '请求' : 'Request'}</option>
                            <option value="response">{language === 'zh' ? '响应' : 'Response'}</option>
                        </select>
                        <Button variant="ghost" size="sm" onClick={handleExport} title={language === 'zh' ? '导出日志' : 'Export'}>
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearToolCallLogs} title={language === 'zh' ? '清除日志' : 'Clear'}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Logs */}
                <div ref={containerRef} className="flex-1 overflow-auto p-2 space-y-1">
                    {filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                            {language === 'zh' ? '暂无日志' : 'No logs yet'}
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="border border-border-subtle rounded-lg overflow-hidden">
                                {/* Log Header */}
                                <button
                                    onClick={() => toggleExpand(log.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface/80 transition-colors text-left"
                                >
                                    {expandedIds.has(log.id)
                                        ? <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                                    }
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${log.type === 'request'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {log.type === 'request' ? 'REQ' : 'RES'}
                                    </span>
                                    <span className="text-xs font-medium text-text-primary truncate">{log.toolName}</span>
                                    {log.duration && (
                                        <span className="text-[10px] text-text-muted">{log.duration}ms</span>
                                    )}
                                    <span className="ml-auto text-[10px] text-text-muted">
                                        {log.timestamp.toLocaleTimeString()}
                                    </span>
                                </button>

                                {/* Log Content */}
                                {expandedIds.has(log.id) && (
                                    <div className="relative border-t border-border-subtle">
                                        <button
                                            onClick={() => handleCopy(log.id, log.data)}
                                            className="absolute top-2 right-2 p-1 hover:bg-surface rounded transition-colors"
                                            title={language === 'zh' ? '复制' : 'Copy'}
                                        >
                                            {copiedId === log.id
                                                ? <Check className="w-3.5 h-3.5 text-green-400" />
                                                : <Copy className="w-3.5 h-3.5 text-text-muted" />
                                            }
                                        </button>
                                        <div className="p-3 overflow-auto max-h-64 bg-surface/50">
                                            <JsonHighlight data={log.data} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
