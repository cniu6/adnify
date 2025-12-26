/**
 * Agent 配置中心
 * 
 * 将所有硬编码值外部化，支持运行时配置
 * 
 * 配置优先级：
 * 1. 用户配置 (config.json 或 UI 设置)
 * 2. 项目配置 (.adnify/agent.json)
 * 3. 默认配置 (本文件)
 */

// ============================================
// 工具配置
// ============================================

/** 工具分类 */
export type ToolCategory = 'read' | 'write' | 'terminal' | 'search' | 'lsp' | 'network' | 'plan'

/** 工具审批类型 */
export type ToolApprovalType = 'none' | 'terminal' | 'dangerous'

/** 工具元数据 */
export interface ToolMetadata {
    name: string
    displayName: string
    description: string
    category: ToolCategory
    approvalType: ToolApprovalType
    /** 是否可并行执行 */
    parallel: boolean
    /** 是否需要工作区 */
    requiresWorkspace: boolean
    /** 是否启用 */
    enabled: boolean
}

/** 默认工具元数据 */
export const DEFAULT_TOOL_METADATA: Record<string, ToolMetadata> = {
    // 读取类工具
    read_file: {
        name: 'read_file',
        displayName: 'Read File',
        description: 'Read file contents with optional line range',
        category: 'read',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    read_multiple_files: {
        name: 'read_multiple_files',
        displayName: 'Read Multiple Files',
        description: 'Read multiple files at once',
        category: 'read',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    list_directory: {
        name: 'list_directory',
        displayName: 'List Directory',
        description: 'List files and folders in a directory',
        category: 'read',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    get_dir_tree: {
        name: 'get_dir_tree',
        displayName: 'Directory Tree',
        description: 'Get recursive directory tree structure',
        category: 'read',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    search_files: {
        name: 'search_files',
        displayName: 'Search Files',
        description: 'Search for text pattern across files',
        category: 'search',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    search_in_file: {
        name: 'search_in_file',
        displayName: 'Search in File',
        description: 'Search within a specific file',
        category: 'search',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    codebase_search: {
        name: 'codebase_search',
        displayName: 'Semantic Search',
        description: 'Semantic search across codebase using AI embeddings',
        category: 'search',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },

    // 写入类工具
    edit_file: {
        name: 'edit_file',
        displayName: 'Edit File',
        description: 'Edit file using SEARCH/REPLACE blocks',
        category: 'write',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
    write_file: {
        name: 'write_file',
        displayName: 'Write File',
        description: 'Write or overwrite entire file content',
        category: 'write',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
    replace_file_content: {
        name: 'replace_file_content',
        displayName: 'Replace Content',
        description: 'Replace specific lines in a file',
        category: 'write',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
    create_file_or_folder: {
        name: 'create_file_or_folder',
        displayName: 'Create',
        description: 'Create new file or folder',
        category: 'write',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
    delete_file_or_folder: {
        name: 'delete_file_or_folder',
        displayName: 'Delete',
        description: 'Delete file or folder',
        category: 'write',
        approvalType: 'dangerous',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },

    // 终端工具
    run_command: {
        name: 'run_command',
        displayName: 'Run Command',
        description: 'Execute shell command',
        category: 'terminal',
        approvalType: 'terminal',
        parallel: false,
        requiresWorkspace: false,
        enabled: true,
    },
    get_lint_errors: {
        name: 'get_lint_errors',
        displayName: 'Lint Errors',
        description: 'Get lint/compile errors for a file',
        category: 'lsp',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },

    // LSP 工具
    find_references: {
        name: 'find_references',
        displayName: 'Find References',
        description: 'Find all references to a symbol',
        category: 'lsp',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    go_to_definition: {
        name: 'go_to_definition',
        displayName: 'Go to Definition',
        description: 'Get definition location of a symbol',
        category: 'lsp',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    get_hover_info: {
        name: 'get_hover_info',
        displayName: 'Hover Info',
        description: 'Get type info and documentation',
        category: 'lsp',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },
    get_document_symbols: {
        name: 'get_document_symbols',
        displayName: 'Document Symbols',
        description: 'Get all symbols in a file',
        category: 'lsp',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: true,
        enabled: true,
    },

    // 网络工具
    web_search: {
        name: 'web_search',
        displayName: 'Web Search',
        description: 'Search the web for information',
        category: 'network',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: false,
        enabled: true,
    },
    read_url: {
        name: 'read_url',
        displayName: 'Read URL',
        description: 'Fetch and read content from a URL',
        category: 'network',
        approvalType: 'none',
        parallel: true,
        requiresWorkspace: false,
        enabled: true,
    },

    // Plan 工具
    create_plan: {
        name: 'create_plan',
        displayName: 'Create Plan',
        description: 'Create execution plan with steps',
        category: 'plan',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
    update_plan: {
        name: 'update_plan',
        displayName: 'Update Plan',
        description: 'Update plan status or items',
        category: 'plan',
        approvalType: 'none',
        parallel: false,
        requiresWorkspace: true,
        enabled: true,
    },
}

// ============================================
// Agent 运行时配置
// ============================================

export interface AgentRuntimeConfig {
    // 循环控制
    maxToolLoops: number
    maxHistoryMessages: number

    // 上下文限制
    maxToolResultChars: number
    maxFileContentChars: number
    maxTotalContextChars: number
    maxSingleFileChars: number

    // 重试配置
    maxRetries: number
    retryDelayMs: number
    retryBackoffMultiplier: number

    // 工具执行
    toolTimeoutMs: number

    // 上下文压缩
    contextCompressThreshold: number
    keepRecentTurns: number

    // 循环检测
    loopDetection: {
        maxHistory: number
        maxExactRepeats: number
        maxSameTargetRepeats: number
    }

    // 目录忽略列表
    ignoredDirectories: string[]
}

export const DEFAULT_AGENT_CONFIG: AgentRuntimeConfig = {
    maxToolLoops: 30,
    maxHistoryMessages: 60,
    maxToolResultChars: 10000,
    maxFileContentChars: 15000,
    maxTotalContextChars: 60000,
    maxSingleFileChars: 6000,
    maxRetries: 3,
    retryDelayMs: 1000,
    retryBackoffMultiplier: 1.5,
    toolTimeoutMs: 60000,
    contextCompressThreshold: 40000,
    keepRecentTurns: 3,
    loopDetection: {
        maxHistory: 15,
        maxExactRepeats: 2,
        maxSameTargetRepeats: 3,
    },
    ignoredDirectories: [
        'node_modules', '.git', 'dist', 'build', '.next',
        '__pycache__', '.venv', 'venv', '.cache', 'coverage',
        '.nyc_output', 'tmp', 'temp', '.idea', '.vscode',
    ],
}

// ============================================
// 辅助函数
// ============================================

/** 获取只读工具列表 */
export function getReadOnlyTools(): string[] {
    return Object.entries(DEFAULT_TOOL_METADATA)
        .filter(([_, meta]) => meta.parallel && meta.category !== 'write')
        .map(([name]) => name)
}

/** 获取写入工具列表 */
export function getWriteTools(): string[] {
    return Object.entries(DEFAULT_TOOL_METADATA)
        .filter(([_, meta]) => meta.category === 'write')
        .map(([name]) => name)
}

/** 获取需要审批的工具 */
export function getApprovalRequiredTools(): string[] {
    return Object.entries(DEFAULT_TOOL_METADATA)
        .filter(([_, meta]) => meta.approvalType !== 'none')
        .map(([name]) => name)
}

/** 获取工具的审批类型 */
export function getToolApprovalType(toolName: string): ToolApprovalType {
    return DEFAULT_TOOL_METADATA[toolName]?.approvalType || 'none'
}

/** 检查工具是否可并行执行 */
export function isParallelTool(toolName: string): boolean {
    return DEFAULT_TOOL_METADATA[toolName]?.parallel ?? false
}

/** 获取工具显示名称 */
export function getToolDisplayName(toolName: string): string {
    return DEFAULT_TOOL_METADATA[toolName]?.displayName || toolName
}

/** 检查工具是否为写入类工具 */
export function isWriteTool(toolName: string): boolean {
    return DEFAULT_TOOL_METADATA[toolName]?.category === 'write'
}
