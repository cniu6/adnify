/**
 * 提示词模板配置
 * 
 * 支持用户自定义提示词模板
 * 
 * 配置优先级：
 * 1. 用户自定义模板 (config.json)
 * 2. 项目模板 (.adnify/prompts/)
 * 3. 内置模板
 */

// ============================================
// 类型定义
// ============================================

/** 提示词模板 */
export interface PromptTemplate {
    id: string
    name: string
    nameZh: string
    description: string
    descriptionZh: string
    /** 完整的系统提示词 */
    systemPrompt: string
    /** 优先级：数字越小越优先 */
    priority: number
    /** 是否为默认模板 */
    isDefault?: boolean
    /** 是否为内置模板 */
    isBuiltin?: boolean
    /** 标签 */
    tags: string[]
    /** 创建时间 */
    createdAt?: number
    /** 更新时间 */
    updatedAt?: number
}

/** 提示词组件（可复用的片段） */
export interface PromptComponent {
    id: string
    name: string
    content: string
    description?: string
}

/** 提示词配置 */
export interface PromptConfig {
    /** 当前使用的模板 ID */
    activeTemplateId: string
    /** 自定义模板列表 */
    customTemplates: PromptTemplate[]
    /** 自定义组件 */
    customComponents: PromptComponent[]
    /** 全局自定义指令 */
    globalInstructions: string
}

// ============================================
// 默认提示词组件
// ============================================

/** 核心工具描述 */
export const CORE_TOOLS_COMPONENT = `## Available Tools

### File Operations
1. **read_file** - Read file contents with line numbers
   - Parameters: path (required), start_line, end_line
   - CRITICAL: Always read files before editing them

2. **list_directory** - List files and folders in a directory
   - Parameters: path (required)

3. **get_dir_tree** - Get recursive directory tree structure
   - Parameters: path (required), max_depth (default: 3)

4. **search_files** - Search for text pattern across files
   - Parameters: path (required), pattern (required), is_regex, file_pattern

5. **search_in_file** - Search within a specific file
   - Parameters: path (required), pattern (required), is_regex

6. **read_multiple_files** - Read multiple files at once
   - Parameters: paths (required array of file paths)

### File Editing
7. **replace_file_content** - Replace specific lines in a file (PREFERRED)
   - Parameters: path (required), start_line, end_line, content
   - Always read_file first to get line numbers

8. **edit_file** - Edit file using SEARCH/REPLACE blocks
   - Parameters: path (required), search_replace_blocks (required)
   - Format: <<<<<<< SEARCH\\nold\\n=======\\nnew\\n>>>>>>> REPLACE

9. **write_file** - Write or overwrite entire file
   - Parameters: path (required), content (required)

10. **create_file_or_folder** - Create new file or folder
    - Parameters: path (required), content (optional)

11. **delete_file_or_folder** - Delete file or folder
    - Parameters: path (required), recursive (optional)

### Terminal & Execution
12. **run_command** - Execute shell command
    - Parameters: command (required), cwd, timeout

13. **get_lint_errors** - Get lint/compile errors
    - Parameters: path (required)

### Code Intelligence
14. **find_references** - Find all references to a symbol
15. **go_to_definition** - Get definition location
16. **get_hover_info** - Get type info and docs
17. **get_document_symbols** - Get all symbols in file

### Advanced Tools
18. **codebase_search** - Semantic search across codebase
19. **web_search** - Search the web
20. **read_url** - Fetch URL content

{{PLANNING_TOOLS}}`

/** 工作流指南 */
export const WORKFLOW_COMPONENT = `## Workflow Guidelines

### 1. Think & Plan
Before taking action, briefly analyze:
- **Goal**: What exactly needs to be done?
- **Context**: What files do I need to read first?
- **Strategy**: Which tools are best?

### 2. Explore & Understand (Read-before-Write)
- **CRITICAL**: You MUST read the file content using read_file before editing it.
- **NEVER** guess line numbers or content.

### 3. Execute
- **For File Edits**: Prefer replace_file_content when you know line numbers
- **For New Files**: Use create_file_or_folder

### 4. Verify
- After editing, verify changes are correct
- Check for lint errors if appropriate

### Task Completion
**STOP when:**
- Requested change is successfully applied
- Command executes successfully
- Question is answered

**Then:**
1. Write brief summary of what was done
2. Do NOT call more tools
3. Wait for next request`

/** 环境信息模板 */
export const ENVIRONMENT_COMPONENT = `## Environment
- OS: {{OS}}
- Workspace: {{WORKSPACE}}
- Active File: {{ACTIVE_FILE}}
- Open Files: {{OPEN_FILES}}
- Date: {{DATE}}

## Project Rules
{{PROJECT_RULES}}

## Custom Instructions
{{CUSTOM_INSTRUCTIONS}}`

/** Plan 工具描述 */
export const PLANNING_TOOLS_COMPONENT = `### Planning Tools
21. **create_plan** - Create execution plan
    - Parameters: items (required array with title, description)

22. **update_plan** - Update plan status/items
    - Parameters: status, items, currentStepId`

// ============================================
// 默认配置
// ============================================

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
    activeTemplateId: 'default',
    customTemplates: [],
    customComponents: [],
    globalInstructions: '',
}

// ============================================
// 辅助函数
// ============================================

/**
 * 替换模板中的占位符
 */
export function replaceTemplatePlaceholders(
    template: string,
    variables: Record<string, string>
): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
}

/**
 * 合并提示词组件
 */
export function mergePromptComponents(
    base: string,
    components: Record<string, string>
): string {
    let result = base
    for (const [key, value] of Object.entries(components)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return result
}

/**
 * 创建自定义模板
 */
export function createCustomTemplate(
    id: string,
    name: string,
    systemPrompt: string,
    options?: Partial<PromptTemplate>
): PromptTemplate {
    const now = Date.now()
    return {
        id,
        name,
        nameZh: options?.nameZh || name,
        description: options?.description || '',
        descriptionZh: options?.descriptionZh || '',
        systemPrompt,
        priority: options?.priority || 100,
        isDefault: false,
        isBuiltin: false,
        tags: options?.tags || ['custom'],
        createdAt: now,
        updatedAt: now,
    }
}

/**
 * 验证模板格式
 */
export function validateTemplate(template: Partial<PromptTemplate>): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!template.id) errors.push('Missing template ID')
    if (!template.name) errors.push('Missing template name')
    if (!template.systemPrompt) errors.push('Missing system prompt')
    if (template.systemPrompt && template.systemPrompt.length < 100) {
        errors.push('System prompt too short (min 100 chars)')
    }

    return { valid: errors.length === 0, errors }
}
