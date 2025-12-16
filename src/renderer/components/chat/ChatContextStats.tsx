/**
 * 上下文统计显示组件
 */
import { Database, History, FileText, Code } from 'lucide-react'
import { ContextStats } from '../../store'
import { Language } from '../../i18n'

interface ChatContextStatsProps {
  stats: ContextStats
  language: Language
}

export default function ChatContextStats({ stats, language }: ChatContextStatsProps) {
  const usagePercent = stats.totalChars / stats.maxChars

  return (
    <div className="px-4 py-1.5 border-b border-border-subtle bg-surface/30 flex items-center gap-4 text-[10px] text-text-muted">
      {/* 上下文使用量 */}
      <div
        className="flex items-center gap-1.5"
        title={language === 'zh' ? '上下文使用量' : 'Context usage'}
      >
        <Database className="w-3 h-3" />
        <span>
          {(stats.totalChars / 1000).toFixed(1)}K / {(stats.maxChars / 1000).toFixed(0)}K
        </span>
        <div className="w-16 h-1 bg-surface-active rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent > 0.95
                ? 'bg-status-error'
                : usagePercent > 0.8
                  ? 'bg-status-warning'
                  : 'bg-accent'
            }`}
            style={{ width: `${Math.min(100, usagePercent * 100)}%` }}
          />
        </div>
      </div>

      {/* 历史消息 */}
      <div
        className="flex items-center gap-1.5"
        title={language === 'zh' ? '历史消息' : 'History messages'}
      >
        <History className="w-3 h-3" />
        <span>
          {stats.messageCount} / {stats.maxMessages}
        </span>
      </div>

      {/* 上下文文件 */}
      {stats.fileCount > 0 && (
        <div
          className="flex items-center gap-1.5"
          title={language === 'zh' ? '上下文文件' : 'Context files'}
        >
          <FileText className="w-3 h-3" />
          <span>
            {stats.fileCount} / {stats.maxFiles}
          </span>
        </div>
      )}

      {/* 语义搜索结果 */}
      {stats.semanticResultCount > 0 && (
        <div
          className="flex items-center gap-1.5"
          title={language === 'zh' ? '语义搜索结果' : 'Semantic results'}
        >
          <Code className="w-3 h-3" />
          <span>{stats.semanticResultCount}</span>
        </div>
      )}
    </div>
  )
}
