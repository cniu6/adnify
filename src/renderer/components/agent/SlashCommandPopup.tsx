/**
 * 斜杠命令弹出菜单
 * 当用户输入 / 时显示可用命令
 */

import { useState, useEffect, useRef } from 'react'
import { Command, Sparkles, FileCode, Wrench, Bug, Zap, MessageSquare, Code } from 'lucide-react'
import { slashCommandService, SlashCommand } from '@/renderer/services/slashCommandService'

interface SlashCommandPopupProps {
    query: string // 包含 / 的输入
    onSelect: (command: SlashCommand) => void
    onClose: () => void
    position: { x: number; y: number }
}

const COMMAND_ICONS: Record<string, typeof Command> = {
    test: FileCode,
    explain: MessageSquare,
    refactor: Wrench,
    fix: Bug,
    optimize: Zap,
    comment: MessageSquare,
    type: Code,
}

export default function SlashCommandPopup({ query, onSelect, onClose, position }: SlashCommandPopupProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const matchingCommands = slashCommandService.findMatching(query)

    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, matchingCommands.length - 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, 0))
            } else if (e.key === 'Enter' && matchingCommands.length > 0) {
                e.preventDefault()
                onSelect(matchingCommands[selectedIndex])
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, matchingCommands, onSelect, onClose])

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    if (matchingCommands.length === 0) return null

    return (
        <div
            ref={containerRef}
            className="absolute bg-surface border border-border-subtle rounded-lg shadow-xl py-1 z-50 min-w-[240px] max-h-[280px] overflow-y-auto"
            style={{
                bottom: position.y,
                left: position.x,
            }}
        >
            <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                Commands
            </div>
            {matchingCommands.map((cmd, index) => {
                const Icon = COMMAND_ICONS[cmd.name] || Sparkles
                return (
                    <button
                        key={cmd.name}
                        onClick={() => onSelect(cmd)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 ${index === selectedIndex
                                ? 'bg-accent/20 text-accent'
                                : 'text-text-primary hover:bg-surface-hover'
                            }`}
                    >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">/{cmd.name}</div>
                            <div className="text-xs text-text-muted truncate">{cmd.description}</div>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
