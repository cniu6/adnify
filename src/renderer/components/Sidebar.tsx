import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FolderOpen, File, ChevronRight, ChevronDown,
  Plus, RefreshCw, FolderPlus, GitBranch,
  MoreHorizontal, Trash2,
  FileText, Edit2, FilePlus, Loader2
} from 'lucide-react'
import { useStore } from '../store'
import { FileItem } from '../types/electron'
import { t } from '../i18n'
import { gitService, GitStatus } from '../agent/gitService'

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  const iconColors: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    py: 'text-green-400',
    json: 'text-yellow-300',
    md: 'text-gray-400',
    css: 'text-pink-400',
    html: 'text-orange-400',
    gitignore: 'text-gray-500',
  }
  return iconColors[ext || ''] || 'text-text-muted'
}

function FileTreeItem({
    item,
    depth = 0,
    onRefresh
}: { 
    item: FileItem; 
    depth?: number; 
    onRefresh: () => void 
}) {
  const { expandedFolders, toggleFolder, openFile, setActiveFile, activeFilePath, language } = useStore()
  const [children, setChildren] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(item.name)
  const renameInputRef = useRef<HTMLInputElement>(null)
  
  const isExpanded = expandedFolders.has(item.path)
  const isActive = activeFilePath === item.path

  useEffect(() => {
    if (item.isDirectory && isExpanded) {
      setIsLoading(true)
      window.electronAPI.readDir(item.path).then((items) => {
        setChildren(items)
        setIsLoading(false)
      })
    }
  }, [item.path, item.isDirectory, isExpanded])

  useEffect(() => {
      if (isRenaming && renameInputRef.current) {
          renameInputRef.current.focus()
          renameInputRef.current.select()
      }
  }, [isRenaming])

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRenaming) return 

    if (item.isDirectory) {
      toggleFolder(item.path)
    } else {
      const content = await window.electronAPI.readFile(item.path)
      if (content !== null) {
        openFile(item.path, content)
        setActiveFile(item.path)
      }
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (confirm(t('confirmDelete', language, { name: item.name }))) {
          await window.electronAPI.deleteFile(item.path)
          onRefresh()
      }
      setShowMenu(false)
  }

  const handleRenameStart = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsRenaming(true)
      setShowMenu(false)
  }

  const handleRenameSubmit = async () => {
      if (!renameValue.trim() || renameValue === item.name) {
          setIsRenaming(false)
          return
      }
      const separator = item.path.includes('\\') ? '\\' : '/'
      const newPath = item.path.substring(0, item.path.lastIndexOf(separator) + 1) + renameValue

      const success = await window.electronAPI.renameFile(item.path, newPath)
      if (success) {
          onRefresh()
      }
      setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleRenameSubmit()
      if (e.key === 'Escape') setIsRenaming(false)
  }

  const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', item.path)
      e.dataTransfer.setData('application/adnify-file-path', item.path)
      e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div>
      <div
        draggable={true}
        onDragStart={handleDragStart}
        onClick={handleClick}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
        className={`
            group flex items-center gap-1.5 py-1.5 pr-2 cursor-pointer transition-all duration-200 relative select-none
            ${isActive 
                ? 'bg-accent/10 text-text-primary' 
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'}
        `}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {/* Active Indicator Line */}
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />}

        {/* Indent Guide */}
        {depth > 0 && (
             <div className="absolute left-0 top-0 bottom-0 border-l border-border-subtle group-hover:border-white/10" 
                  style={{ left: `${depth * 12}px` }} 
             />
        )}

        {item.isDirectory ? (
          <>
             <span className={`transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                 <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
             </span>
            {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
                <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${isExpanded ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'}`} />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 flex-shrink-0" /> 
            <File className={`w-3.5 h-3.5 flex-shrink-0 ${getFileIcon(item.name)}`} />
          </>
        )}
        
        {isRenaming ? (
            <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-surface-active border-none rounded px-1 py-0 text-[13px] h-5 focus:outline-none focus:ring-1 focus:ring-accent min-w-0 text-text-primary"
            />
        ) : (
            <span className="text-[13px] truncate leading-normal flex-1 opacity-90 group-hover:opacity-100">{item.name}</span>
        )}

        {/* Context Menu Button */}
        {showMenu && !isRenaming && (
            <div className="flex items-center absolute right-1 bg-background shadow-sm rounded border border-border-subtle p-0.5 animate-fade-in z-10 gap-0.5">
                 <button 
                    onClick={handleRenameStart}
                    className="p-1 hover:bg-surface-active hover:text-text-primary rounded transition-colors text-text-muted"
                    title={t('rename', language)}
                 >
                     <Edit2 className="w-3 h-3" />
                 </button>
                 <button 
                    onClick={handleDelete}
                    className="p-1 hover:bg-status-error/10 hover:text-status-error rounded transition-colors text-text-muted"
                    title={t('delete', language)}
                 >
                     <Trash2 className="w-3 h-3" />
                 </button>
            </div>
        )}
      </div>
      
      {item.isDirectory && isExpanded && (
        <div className="relative">
             <div className="absolute left-0 top-0 bottom-0 border-l border-border-subtle/30" 
                  style={{ left: `${(depth + 1) * 12}px` }} 
             />
          {children
            .sort((a, b) => {
              if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
              return a.isDirectory ? -1 : 1
            })
            .map((child) => (
              <FileTreeItem key={child.path} item={child} depth={depth + 1} onRefresh={onRefresh} />
            ))}
        </div>
      )}
    </div>
  )
}

function ExplorerView() {
    const { workspacePath, files, setWorkspacePath, setFiles, language } = useStore()
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
    const [isGitRepo, setIsGitRepo] = useState(false)
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null)
    const [newItemName, setNewItemName] = useState('')
    const newItemInputRef = useRef<HTMLInputElement>(null)

    // 更新 Git 状态
    const updateGitStatus = useCallback(async () => {
        if (!workspacePath) {
        setGitStatus(null)
        setIsGitRepo(false)
        return
        }

        gitService.setWorkspace(workspacePath)
        const isRepo = await gitService.isGitRepo()
        setIsGitRepo(isRepo)

        if (isRepo) {
        const status = await gitService.getStatus()
        setGitStatus(status)
        }
    }, [workspacePath])

    // 工作区变化时更新 Git 状态
    useEffect(() => {
        updateGitStatus()
        // 定期刷新 Git 状态
        const interval = setInterval(updateGitStatus, 5000)
        return () => clearInterval(interval)
    }, [updateGitStatus])

    useEffect(() => {
        if (isCreating && newItemInputRef.current) {
            newItemInputRef.current.focus()
        }
    }, [isCreating])

    const handleOpenFolder = async () => {
        const path = await window.electronAPI.openFolder()
        if (path) {
        setWorkspacePath(path)
        const items = await window.electronAPI.readDir(path)
        setFiles(items)
        }
    }

    const refreshFiles = async () => {
        if (workspacePath) {
        const items = await window.electronAPI.readDir(workspacePath)
        setFiles(items)
        updateGitStatus()
        }
    }

    const handleCreateSubmit = async () => {
        if (!newItemName.trim() || !workspacePath) {
            setIsCreating(null)
            setNewItemName('')
            return
        }
        
        const fullPath = workspacePath + (workspacePath.includes('\\') ? '\\' : '/') + newItemName
        
        let success = false
        if (isCreating === 'file') {
            success = await window.electronAPI.writeFile(fullPath, '')
        } else {
            success = await window.electronAPI.mkdir(fullPath)
        }

        if (success) {
            await refreshFiles()
        }
        setIsCreating(null)
        setNewItemName('')
    }

    const handleCreateKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreateSubmit()
        if (e.key === 'Escape') {
            setIsCreating(null)
            setNewItemName('')
        }
    }

    return (
        <div className="h-full flex flex-col bg-background-secondary">
            <div className="h-10 px-3 flex items-center justify-between group border-b border-border-subtle bg-background-secondary sticky top-0 z-10">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {t('explorer', language)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setIsCreating('file')} className="p-1 hover:bg-surface-active rounded transition-colors" title={t('newFile', language)}>
                        <FilePlus className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                    </button>
                    <button onClick={() => setIsCreating('folder')} className="p-1 hover:bg-surface-active rounded transition-colors" title={t('newFolder', language)}>
                        <FolderPlus className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                    </button>
                    <button onClick={refreshFiles} className="p-1 hover:bg-surface-active rounded transition-colors" title={t('refresh', language)}>
                        <RefreshCw className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                    </button>
                     <button onClick={handleOpenFolder} className="p-1 hover:bg-surface-active rounded transition-colors" title={t('openFolder', language)}>
                        <FolderOpen className="w-3.5 h-3.5 text-text-muted hover:text-text-primary" />
                    </button>
                </div>
            </div>

            {/* Creation Input Area */}
            {isCreating && (
                <div className="p-2 border-b border-border-subtle bg-surface/30 animate-slide-in">
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-text-muted uppercase font-semibold">
                         {isCreating === 'file' ? <FilePlus className="w-3 h-3" /> : <FolderPlus className="w-3 h-3" />}
                         {isCreating === 'file' ? t('newFile', language) : t('newFolder', language)}
                    </div>
                    <input
                        ref={newItemInputRef}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onBlur={handleCreateSubmit}
                        onKeyDown={handleCreateKeyDown}
                        placeholder={t('create', language)}
                        className="w-full bg-background border border-accent rounded px-2 py-1 text-xs focus:outline-none shadow-glow"
                    />
                </div>
            )}

             <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
                {workspacePath ? (
                files
                    .sort((a, b) => {
                    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
                    return a.isDirectory ? -1 : 1
                    })
                    .map((item) => (
                    <FileTreeItem key={item.path} item={item} onRefresh={refreshFiles} />
                    ))
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-12 h-12 bg-surface-hover rounded-xl flex items-center justify-center mb-4 border border-white/5">
                        <FolderOpen className="w-6 h-6 text-text-muted" />
                    </div>
                    <p className="text-sm text-text-muted mb-4 font-medium">{t('noFolderOpened', language)}</p>
                    <button
                    onClick={handleOpenFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors shadow-glow"
                    >
                    <Plus className="w-3.5 h-3.5" />
                    {t('openFolder', language)}
                    </button>
                </div>
                )}
            </div>

             {/* Git Status Mini-Bar (Pinned to bottom of explorer) */}
             {isGitRepo && gitStatus && (
                <div className="px-3 py-2 border-t border-border-subtle bg-surface/50">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>{gitStatus.branch}</span>
                        {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-text-muted bg-surface-active px-1.5 py-0.5 rounded">
                                {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
                                {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
                            </span>
                        )}
                    </div>
                </div>
             )}
        </div>
    )
}

function SearchView() {
    const [query, setQuery] = useState('')
    const [replaceQuery, setReplaceQuery] = useState('')
    const [isRegex, setIsRegex] = useState(false)
    const [isCaseSensitive, setIsCaseSensitive] = useState(false)
    const [isWholeWord, setIsWholeWord] = useState(false)
    const [excludePattern, setExcludePattern] = useState('')
    const [showDetails, setShowDetails] = useState(false)
    const [showReplace, setShowReplace] = useState(false)
    
    const [searchResults, setSearchResults] = useState<{ path: string; line: number; text: string }[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())

    const { workspacePath, openFile, setActiveFile, language } = useStore()

    // Group results by file
    const resultsByFile = useMemo(() => {
        const groups: Record<string, typeof searchResults> = {}
        searchResults.forEach(res => {
            if (!groups[res.path]) groups[res.path] = []
            groups[res.path].push(res)
        })
        return groups
    }, [searchResults])

    const handleSearch = async () => {
        if(!query.trim()) return
        
        setIsSearching(true)
        setSearchResults([])

        try {
            if (workspacePath) {
                const results = await window.electronAPI.searchFiles(query, workspacePath, {
                    isRegex,
                    isCaseSensitive,
                    isWholeWord,
                    exclude: excludePattern
                })
                setSearchResults(results)
            }
        } finally {
            setIsSearching(false)
        }
    }

    const toggleFileCollapse = (path: string) => {
        const newSet = new Set(collapsedFiles)
        if (newSet.has(path)) newSet.delete(path)
        else newSet.add(path)
        setCollapsedFiles(newSet)
    }

    const handleResultClick = async (result: { path: string }) => {
        const content = await window.electronAPI.readFile(result.path)
        if (content !== null) {
            openFile(result.path, content)
            setActiveFile(result.path)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch()
    }

    return (
        <div className="flex flex-col h-full bg-background-secondary text-sm">
             <div className="h-10 px-3 flex items-center border-b border-border-subtle sticky top-0 z-10 bg-background-secondary">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {t('search', language)}
                </span>
            </div>
            
            <div className="p-3 border-b border-border-subtle flex flex-col gap-2 bg-background-secondary">
                {/* Search Input Box */}
                <div className="relative flex items-center">
                     <div className="absolute left-0 z-10 p-1">
                         <button onClick={() => setShowReplace(!showReplace)} className="p-0.5 hover:bg-surface-active rounded transition-colors">
                             <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform ${showReplace ? 'rotate-90' : ''}`} />
                         </button>
                     </div>
                    <div className="relative flex-1 ml-5">
                        <input 
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('searchPlaceholder', language)}
                            className="w-full bg-surface/50 border border-transparent rounded-md py-1.5 pl-2 pr-20 text-xs text-text-primary focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent focus:outline-none transition-all placeholder:text-text-muted/50"
                        />
                        {/* Toggles */}
                        <div className="absolute right-1 top-1 flex gap-0.5">
                             <button 
                                onClick={() => setIsCaseSensitive(!isCaseSensitive)}
                                title={t('matchCase', language)}
                                className={`p-0.5 rounded transition-colors ${isCaseSensitive ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-surface-active'}`}
                             >
                                 <span className="text-[10px] font-bold px-1">Aa</span>
                             </button>
                             <button 
                                onClick={() => setIsWholeWord(!isWholeWord)}
                                title={t('matchWholeWord', language)}
                                className={`p-0.5 rounded transition-colors ${isWholeWord ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-surface-active'}`}
                             >
                                 <span className="text-[10px] font-bold px-0.5 border border-current rounded-[2px]">ab</span>
                             </button>
                             <button 
                                onClick={() => setIsRegex(!isRegex)}
                                title={t('useRegex', language)}
                                className={`p-0.5 rounded transition-colors ${isRegex ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-surface-active'}`}
                             >
                                 <span className="text-[10px] font-bold px-1">.*</span>
                             </button>
                        </div>
                    </div>
                </div>

                {/* Replace Input Box */}
                {showReplace && (
                    <div className="relative flex items-center ml-5 animate-slide-in">
                        <input 
                            type="text"
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            placeholder={t('replacePlaceholder', language)}
                            className="w-full bg-surface/50 border border-transparent rounded-md py-1.5 pl-2 pr-8 text-xs text-text-primary focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent focus:outline-none transition-all placeholder:text-text-muted/50"
                        />
                        <button className="absolute right-1 top-1 p-0.5 hover:bg-surface-active rounded transition-colors" title={t('replace', language)}>
                            <Edit2 className="w-3 h-3 text-text-muted" />
                        </button>
                    </div>
                )}

                {/* Details Toggle */}
                <div className="ml-5">
                    <button 
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary mb-1 transition-colors"
                    >
                        <MoreHorizontal className="w-3 h-3" />
                        {t('filesToExclude', language)}
                    </button>
                    
                    {showDetails && (
                        <div className="flex flex-col gap-2 animate-slide-in">
                            <input 
                                type="text"
                                value={excludePattern}
                                onChange={(e) => setExcludePattern(e.target.value)}
                                placeholder={t('excludePlaceholder', language)}
                                className="w-full bg-surface/50 border border-transparent rounded-md py-1 px-2 text-xs text-text-primary focus:border-accent focus:bg-surface focus:outline-none transition-all"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background-secondary">
                {isSearching && (
                    <div className="p-4 flex justify-center">
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                    <div className="flex flex-col">
                        <div className="px-3 py-1.5 text-[10px] text-text-muted font-semibold bg-background-secondary border-b border-border-subtle sticky top-0 z-10">
                            {searchResults.length} results in {Object.keys(resultsByFile).length} files
                        </div>
                        
                        {Object.entries(resultsByFile).map(([filePath, results]) => {
                            const fileName = filePath.split(/[/\\]/).pop()
                            const isCollapsed = collapsedFiles.has(filePath)
                            
                            return (
                                <div key={filePath} className="flex flex-col">
                                    {/* File Header */}
                                    <div 
                                        onClick={() => toggleFileCollapse(filePath)}
                                        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-surface-hover text-text-secondary sticky top-0 bg-background-secondary/95 backdrop-blur-sm z-0"
                                    >
                                        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                        <FileText className="w-3.5 h-3.5 text-text-muted" />
                                        <span className="text-xs font-medium truncate flex-1" title={filePath}>{fileName}</span>
                                        <span className="text-[10px] text-text-muted bg-surface-active px-1.5 rounded-full">{results.length}</span>
                                    </div>

                                    {/* Matches */}
                                    {!isCollapsed && (
                                        <div className="flex flex-col">
                                            {results.map((res, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => handleResultClick(res)}
                                                    className="pl-8 pr-2 py-0.5 cursor-pointer hover:bg-accent/10 hover:text-text-primary group flex gap-2 text-[11px] font-mono text-text-muted border-l-2 border-transparent hover:border-accent transition-colors"
                                                >
                                                    <span className="w-6 text-right flex-shrink-0 opacity-50 select-none">{res.line}:</span>
                                                    <span className="truncate opacity-80 group-hover:opacity-100">{res.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                
                {!isSearching && query && searchResults.length === 0 && (
                     <div className="p-6 text-center text-xs text-text-muted opacity-60">
                         {t('noResults', language)}
                     </div>
                )}
            </div>
        </div>
    )
}

export default function Sidebar() {
  const { activeSidePanel, language } = useStore()

  if (!activeSidePanel) return null

  return (
    <div className="w-64 bg-background-secondary border-r border-border-subtle flex flex-col h-full animate-slide-in relative z-0">
      {activeSidePanel === 'explorer' && <ExplorerView />}
      {activeSidePanel === 'search' && <SearchView />}
      {activeSidePanel === 'git' && <div className="p-4 text-sm text-text-muted">{t('gitControl', language)}</div>}
    </div>
  )
}