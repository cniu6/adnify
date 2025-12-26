/**
 * 工具参数 Schema
 * 使用 Zod 进行类型安全的参数验证
 */

import { z } from 'zod'

// ===== 文件操作 =====

export const ReadFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    start_line: z.number().int().positive().optional(),
    end_line: z.number().int().positive().optional()
}).refine(
    data => !data.start_line || !data.end_line || data.start_line <= data.end_line,
    { message: 'start_line must be <= end_line' }
)

export const ListDirectorySchema = z.object({
    path: z.string().min(1, 'Directory path is required')
})

export const GetDirTreeSchema = z.object({
    path: z.string().min(1, 'Directory path is required'),
    max_depth: z.number().int().min(1).max(10).optional().default(3)
})

export const SearchFilesSchema = z.object({
    path: z.string().min(1, 'Search path is required'),
    pattern: z.string().min(1, 'Search pattern is required'),
    is_regex: z.boolean().optional().default(false),
    file_pattern: z.string().optional()
})

export const ReadMultipleFilesSchema = z.object({
    paths: z.array(z.string().min(1)).min(1, 'At least one file path is required')
})

export const SearchInFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    pattern: z.string().min(1, 'Search pattern is required'),
    is_regex: z.boolean().optional().default(false)
})

// ===== 文件编辑 =====

function preprocessSearchReplaceBlocks(input: unknown): string {
    if (typeof input === 'string') {
        if (/<{3,}\s*SEARCH/i.test(input)) return input
        try {
            const parsed = JSON.parse(input)
            if (typeof parsed === 'object') return convertObjectToBlocks(parsed)
        } catch { /* not JSON */ }
        return input
    }
    if (typeof input === 'object' && input !== null) {
        return convertObjectToBlocks(input)
    }
    return String(input)
}

function convertObjectToBlocks(obj: unknown): string {
    if (!obj || typeof obj !== 'object') return ''
    const blocks: string[] = []

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const block = convertSingleBlock(item)
            if (block) blocks.push(block)
        }
        return blocks.join('\n\n')
    }

    const block = convertSingleBlock(obj)
    if (block) return block

    const record = obj as Record<string, unknown>
    for (const key of ['blocks', 'changes', 'edits', 'replacements']) {
        if (Array.isArray(record[key])) {
            for (const item of record[key]) {
                const b = convertSingleBlock(item)
                if (b) blocks.push(b)
            }
            if (blocks.length > 0) return blocks.join('\n\n')
        }
    }
    return ''
}

function convertSingleBlock(item: unknown): string | null {
    if (!item || typeof item !== 'object') return null
    const obj = item as Record<string, unknown>

    const searchKeys = ['SEARCH', 'search', 'old', 'original', 'find', 'from']
    const replaceKeys = ['REPLACE', 'replace', 'new', 'replacement', 'to', 'with']

    let searchContent: string | null = null
    let replaceContent: string | null = null

    for (const key of searchKeys) {
        if (key in obj && typeof obj[key] === 'string') {
            searchContent = obj[key] as string
            break
        }
    }
    for (const key of replaceKeys) {
        if (key in obj && typeof obj[key] === 'string') {
            replaceContent = obj[key] as string
            break
        }
    }

    if (searchContent !== null && replaceContent !== null) {
        return `<<<<<<< SEARCH\n${searchContent}\n=======\n${replaceContent}\n>>>>>>> REPLACE`
    }
    return null
}

export const EditFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    search_replace_blocks: z.preprocess(
        preprocessSearchReplaceBlocks,
        z.string().min(1, 'SEARCH/REPLACE blocks are required')
    )
}).refine(
    data => /<{3,}\s*SEARCH/i.test(data.search_replace_blocks) && />{3,}\s*REPLACE/i.test(data.search_replace_blocks),
    { message: 'Invalid SEARCH/REPLACE block format' }
)

export const WriteFileSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    content: z.string()
})

export const ReplaceFileContentSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    start_line: z.number().int().positive('Start line must be positive'),
    end_line: z.number().int().positive('End line must be positive'),
    content: z.string()
}).refine(data => data.start_line <= data.end_line, { message: 'start_line must be <= end_line' })

export const CreateFileOrFolderSchema = z.object({
    path: z.string().min(1, 'Path is required'),
    content: z.string().optional()
})

export const DeleteFileOrFolderSchema = z.object({
    path: z.string().min(1, 'Path is required'),
    recursive: z.boolean().optional().default(false)
})

// ===== 终端 =====

export const RunCommandSchema = z.object({
    command: z.string().min(1, 'Command is required'),
    cwd: z.string().optional(),
    timeout: z.number().int().positive().max(600).optional().default(30)
})

// ===== 搜索 =====

export const CodebaseSearchSchema = z.object({
    query: z.string().min(1, 'Search query is required'),
    top_k: z.number().int().positive().max(50).optional().default(10)
})

// ===== LSP =====

export const LspLocationSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    line: z.number().int().positive('Line number must be positive'),
    column: z.number().int().positive('Column number must be positive')
})

export const GetDocumentSymbolsSchema = z.object({
    path: z.string().min(1, 'File path is required')
})

export const GetLintErrorsSchema = z.object({
    path: z.string().min(1, 'File path is required'),
    refresh: z.boolean().optional().default(false)
})

// ===== 网络 =====

export const WebSearchSchema = z.object({
    query: z.string().min(1, 'Search query is required'),
    max_results: z.number().int().positive().max(20).optional().default(5)
})

export const ReadUrlSchema = z.object({
    url: z.string().url('Invalid URL format'),
    timeout: z.number().int().positive().max(120).optional().default(30)
})

// ===== Plan =====

export const CreatePlanSchema = z.object({
    items: z.array(z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional()
    })).min(1, 'Plan must have at least one item')
})

export const UpdatePlanSchema = z.object({
    status: z.enum(['active', 'completed', 'failed']).optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']).optional(),
        title: z.string().optional(),
    })).optional(),
    currentStepId: z.string().nullable().optional(),
    title: z.string().optional()
})

// ===== Schema 映射 =====

export const TOOL_SCHEMAS: Record<string, z.ZodSchema> = {
    read_file: ReadFileSchema,
    list_directory: ListDirectorySchema,
    get_dir_tree: GetDirTreeSchema,
    search_files: SearchFilesSchema,
    read_multiple_files: ReadMultipleFilesSchema,
    search_in_file: SearchInFileSchema,
    edit_file: EditFileSchema,
    write_file: WriteFileSchema,
    replace_file_content: ReplaceFileContentSchema,
    create_file_or_folder: CreateFileOrFolderSchema,
    delete_file_or_folder: DeleteFileOrFolderSchema,
    run_command: RunCommandSchema,
    codebase_search: CodebaseSearchSchema,
    find_references: LspLocationSchema,
    go_to_definition: LspLocationSchema,
    get_hover_info: LspLocationSchema,
    get_document_symbols: GetDocumentSymbolsSchema,
    get_lint_errors: GetLintErrorsSchema,
    web_search: WebSearchSchema,
    read_url: ReadUrlSchema,
    create_plan: CreatePlanSchema,
    update_plan: UpdatePlanSchema,
}
