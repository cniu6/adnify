/**
 * 文件引用弹出菜单
 * 在输入 @ 时显示文件列表供选择
 */

import { useState, useEffect, useRef } from 'react'
import { FileText, Search } from 'lucide-react'
import { useStore } from '../store'

interface FileMentionPopupProps {
	position: { x: number; y: number }
	searchQuery: string
	onSelect: (filePath: string) => void
	onClose: () => void
}

interface FileOption {
	name: string
	path: string
	isDirectory: boolean
	relativePath: string
}

export default function FileMentionPopup({
	position,
	searchQuery,
	onSelect,
	onClose,
}: FileMentionPopupProps) {
	const [files, setFiles] = useState<FileOption[]>([])
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [loading, setLoading] = useState(true)
	const listRef = useRef<HTMLDivElement>(null)
	const { workspacePath, openFiles } = useStore()

	// 加载文件列表
	useEffect(() => {
		loadFiles()
	}, [workspacePath])

	const loadFiles = async () => {
		if (!workspacePath) {
			setFiles([])
			setLoading(false)
			return
		}

		setLoading(true)
		try {
			const allFiles = await collectFiles(workspacePath, workspacePath, 3)
			setFiles(allFiles)
		} catch (e) {
			console.error('Failed to load files:', e)
			setFiles([])
		}
		setLoading(false)
	}

	// 递归收集文件
	const collectFiles = async (
		dirPath: string,
		rootPath: string,
		maxDepth: number,
		currentDepth = 0
	): Promise<FileOption[]> => {
		if (currentDepth >= maxDepth) return []

		const items = await window.electronAPI.readDir(dirPath)
		if (!items) return []

		const result: FileOption[] = []
		const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv']

		for (const item of items) {
			// 跳过隐藏文件和忽略的目录
			if (item.name.startsWith('.') && item.name !== '.env') continue
			if (item.isDirectory && ignoreDirs.includes(item.name)) continue

			const relativePath = item.path.replace(rootPath, '').replace(/^[/\\]/, '')

			if (!item.isDirectory) {
				result.push({
					name: item.name,
					path: item.path,
					isDirectory: false,
					relativePath,
				})
			} else if (currentDepth < maxDepth - 1) {
				// 递归子目录
				const subFiles = await collectFiles(item.path, rootPath, maxDepth, currentDepth + 1)
				result.push(...subFiles)
			}
		}

		return result
	}

	// 过滤文件
	const filteredFiles = files.filter(file => {
		if (!searchQuery) return true
		const query = searchQuery.toLowerCase()
		return (
			file.name.toLowerCase().includes(query) ||
			file.relativePath.toLowerCase().includes(query)
		)
	}).slice(0, 10) // 最多显示 10 个

	// 优先显示打开的文件
	const sortedFiles = [...filteredFiles].sort((a, b) => {
		const aOpen = openFiles.some(f => f.path === a.path)
		const bOpen = openFiles.some(f => f.path === b.path)
		if (aOpen && !bOpen) return -1
		if (!aOpen && bOpen) return 1
		return a.relativePath.localeCompare(b.relativePath)
	})

	// 键盘导航 - 使用 capture 阶段来优先处理
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					e.stopPropagation()
					setSelectedIndex(i => Math.min(i + 1, sortedFiles.length - 1))
					break
				case 'ArrowUp':
					e.preventDefault()
					e.stopPropagation()
					setSelectedIndex(i => Math.max(i - 1, 0))
					break
				case 'Enter':
					e.preventDefault()
					e.stopPropagation()
					if (sortedFiles[selectedIndex]) {
						onSelect(sortedFiles[selectedIndex].relativePath)
					}
					break
				case 'Escape':
					e.preventDefault()
					e.stopPropagation()
					onClose()
					break
				case 'Tab':
					e.preventDefault()
					e.stopPropagation()
					if (sortedFiles[selectedIndex]) {
						onSelect(sortedFiles[selectedIndex].relativePath)
					}
					break
			}
		}

		// 使用 capture: true 来在冒泡阶段之前捕获事件
		window.addEventListener('keydown', handleKeyDown, true)
		return () => window.removeEventListener('keydown', handleKeyDown, true)
	}, [sortedFiles, selectedIndex, onSelect, onClose])

	// 滚动到选中项
	useEffect(() => {
		if (listRef.current) {
			const selectedEl = listRef.current.children[selectedIndex] as HTMLElement
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: 'nearest' })
			}
		}
	}, [selectedIndex])

	// 重置选中索引
	useEffect(() => {
		setSelectedIndex(0)
	}, [searchQuery])

	return (
		<div
			className="fixed z-50 bg-surface border border-border-subtle rounded-lg shadow-xl overflow-hidden animate-fade-in"
			style={{
				left: position.x,
				bottom: `calc(100vh - ${position.y}px)`,
				minWidth: 300,
				maxWidth: 400,
				maxHeight: 300,
			}}
		>
			{/* Header */}
			<div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-surface-hover">
				<Search className="w-3.5 h-3.5 text-text-muted" />
				<span className="text-xs text-text-muted">
					{searchQuery ? `Searching: ${searchQuery}` : 'Select a file to reference'}
				</span>
			</div>

			{/* File List */}
			<div ref={listRef} className="overflow-y-auto max-h-[240px]">
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
					</div>
				) : sortedFiles.length === 0 ? (
					<div className="py-8 text-center text-text-muted text-sm">
						{searchQuery ? 'No files found' : 'No files in workspace'}
					</div>
				) : (
					sortedFiles.map((file, index) => {
						const isOpen = openFiles.some(f => f.path === file.path)
						return (
							<div
								key={file.path}
								onClick={() => onSelect(file.relativePath)}
								className={`
									flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
									${index === selectedIndex ? 'bg-accent/20 text-text-primary' : 'hover:bg-surface-hover text-text-secondary'}
								`}
							>
								<FileText className={`w-4 h-4 flex-shrink-0 ${isOpen ? 'text-accent' : 'text-text-muted'}`} />
								<div className="flex-1 min-w-0">
									<div className="text-sm truncate">{file.name}</div>
									<div className="text-[10px] text-text-muted truncate">{file.relativePath}</div>
								</div>
								{isOpen && (
									<span className="text-[10px] text-accent px-1.5 py-0.5 bg-accent/10 rounded">open</span>
								)}
							</div>
						)
					})
				)}
			</div>

			{/* Footer */}
			<div className="px-3 py-1.5 border-t border-border-subtle bg-surface-hover text-[10px] text-text-muted flex items-center justify-between">
				<span>↑↓ navigate</span>
				<span>↵ or Tab to select</span>
				<span>Esc to close</span>
			</div>
		</div>
	)
}
