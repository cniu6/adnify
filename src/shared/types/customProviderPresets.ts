/**
 * Custom Provider 预设模板
 * 
 * 提供常用的兼容模式预设配置，方便用户快速添加新厂商
 */

import type {
    PresetTemplate,
    CustomProviderConfig,
    CustomModeConfig,
} from './customProvider'

// ============================================
// OpenAI 兼容模板
// ============================================

/** OpenAI 兼容模式的完全自定义配置 */
export const OPENAI_COMPATIBLE_CUSTOM_CONFIG: CustomModeConfig = {
    request: {
        endpoint: '/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        bodyTemplate: {
            model: '{{model}}',
            messages: '{{messages}}',
            tools: '{{tools}}',
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: '{{max_tokens}}',
        },
        messageFormat: 'openai',
        toolFormat: 'openai',
    },
    response: {
        sseConfig: {
            dataPrefix: 'data: ',
            doneMarker: '[DONE]',
        },
        streaming: {
            choicePath: 'choices[0]',
            deltaPath: 'delta',
            contentField: 'content',
            toolCallsField: 'tool_calls',
            toolIdField: 'id',
            toolNameField: 'function.name',
            toolArgsField: 'function.arguments',
            finishReasonField: 'finish_reason',
        },
        toolCall: {
            mode: 'streaming',
            argsIsObject: false,
            autoGenerateId: false,
        },
        usage: {
            path: 'usage',
            promptTokensField: 'prompt_tokens',
            completionTokensField: 'completion_tokens',
        },
    },
    auth: {
        type: 'bearer',
    },
}

/** DeepSeek 兼容配置 (支持 reasoning) */
export const DEEPSEEK_COMPATIBLE_CUSTOM_CONFIG: CustomModeConfig = {
    ...OPENAI_COMPATIBLE_CUSTOM_CONFIG,
    response: {
        ...OPENAI_COMPATIBLE_CUSTOM_CONFIG.response,
        streaming: {
            ...OPENAI_COMPATIBLE_CUSTOM_CONFIG.response.streaming,
            reasoningField: 'reasoning',
        },
    },
}

/** 智谱 GLM 兼容配置 (支持 reasoning_content) */
export const ZHIPU_COMPATIBLE_CUSTOM_CONFIG: CustomModeConfig = {
    ...OPENAI_COMPATIBLE_CUSTOM_CONFIG,
    response: {
        ...OPENAI_COMPATIBLE_CUSTOM_CONFIG.response,
        streaming: {
            ...OPENAI_COMPATIBLE_CUSTOM_CONFIG.response.streaming,
            reasoningField: 'reasoning_content',
        },
        toolCall: {
            mode: 'streaming',
            argsIsObject: true, // 智谱返回的参数已是对象
            autoGenerateId: false,
        },
    },
}

// ============================================
// Anthropic 兼容模板
// ============================================

/** Anthropic 兼容模式的完全自定义配置 */
export const ANTHROPIC_COMPATIBLE_CUSTOM_CONFIG: CustomModeConfig = {
    request: {
        endpoint: '/messages',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
        },
        bodyTemplate: {
            model: '{{model}}',
            messages: '{{messages}}',
            tools: '{{tools}}',
            max_tokens: '{{max_tokens}}',
            stream: true,
        },
        messageFormat: 'anthropic',
        toolFormat: 'anthropic',
    },
    response: {
        sseConfig: {
            dataPrefix: 'data: ',
            doneMarker: 'message_stop',
            eventField: 'type',
        },
        streaming: {
            contentField: 'delta.text',
            toolCallsField: 'content_block',
            toolIdField: 'id',
            toolNameField: 'name',
            toolArgsField: 'input',
            finishReasonField: 'stop_reason',
        },
        toolCall: {
            mode: 'complete', // Anthropic 工具调用在 finalMessage 中
            argsIsObject: true,
            autoGenerateId: false,
        },
    },
    auth: {
        type: 'header',
        headerName: 'x-api-key',
        headerTemplate: '{{apiKey}}',
    },
}

// ============================================
// 预设模板列表
// ============================================

export const PRESET_TEMPLATES: PresetTemplate[] = [
    {
        id: 'openai-compatible',
        name: 'OpenAI 兼容',
        description: '适用于 DeepSeek, Groq, Qwen, Ollama, Together AI 等 OpenAI 兼容 API',
        config: {
            mode: 'openai',
            features: {
                streaming: true,
                tools: true,
                vision: false,
                reasoning: false,
            },
            defaults: {
                temperature: 0.7,
                maxTokens: 8192,
                timeout: 120000,
            },
        },
    },
    {
        id: 'anthropic-compatible',
        name: 'Anthropic 兼容',
        description: '适用于 AWS Bedrock Claude 等 Anthropic 兼容 API',
        config: {
            mode: 'anthropic',
            features: {
                streaming: true,
                tools: true,
                vision: true,
                reasoning: false,
            },
            defaults: {
                temperature: 0.7,
                maxTokens: 8192,
                timeout: 120000,
            },
        },
    },
    {
        id: 'custom-blank',
        name: '完全自定义',
        description: '从零开始配置请求体、响应解析和认证方式',
        config: {
            mode: 'custom',
            customConfig: OPENAI_COMPATIBLE_CUSTOM_CONFIG,
            features: {
                streaming: true,
                tools: true,
            },
            defaults: {
                maxTokens: 8192,
                timeout: 120000,
            },
        },
    },
]

// ============================================
// 常用厂商快速配置
// ============================================

/** 常用厂商预设 */
export const VENDOR_PRESETS: Record<string, Partial<CustomProviderConfig>> = {
    deepseek: {
        name: 'DeepSeek',
        description: 'DeepSeek V3, R1 等模型',
        baseUrl: 'https://api.deepseek.com',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        defaultModel: 'deepseek-chat',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
            vision: false,
            reasoning: true,
        },
    },
    groq: {
        name: 'Groq',
        description: '超快推理，Llama, Mixtral 等',
        baseUrl: 'https://api.groq.com/openai/v1',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        defaultModel: 'llama-3.3-70b-versatile',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
            vision: false,
        },
    },
    zhipu: {
        name: '智谱 GLM',
        description: 'GLM-4, GLM-4.5 系列',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
        defaultModel: 'glm-4-plus',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
            vision: true,
            reasoning: true,
        },
    },
    qwen: {
        name: '阿里 Qwen',
        description: 'Qwen 系列 (通义千问)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
        defaultModel: 'qwen-plus',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
            vision: true,
        },
    },
    ollama: {
        name: 'Ollama',
        description: '本地运行开源模型',
        baseUrl: 'http://localhost:11434/v1',
        models: ['llama3.2', 'codellama', 'qwen2.5-coder'],
        defaultModel: 'llama3.2',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
            vision: false,
        },
        defaults: {
            timeout: 300000, // 本地模型可能较慢
        },
    },
    siliconflow: {
        name: '硅基流动',
        description: '硅基流动 API',
        baseUrl: 'https://api.siliconflow.cn/v1',
        models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
        defaultModel: 'deepseek-ai/DeepSeek-V3',
        mode: 'openai',
        features: {
            streaming: true,
            tools: true,
        },
    },
}

// ============================================
// 辅助函数
// ============================================

/**
 * 从预设模板创建新的 CustomProviderConfig
 */
export function createFromPreset(
    presetId: string,
    overrides: Partial<CustomProviderConfig>
): CustomProviderConfig {
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId)
    if (!preset) {
        throw new Error(`Unknown preset: ${presetId}`)
    }

    const now = Date.now()
    return {
        id: overrides.id || `custom-${now}`,
        name: overrides.name || 'New Provider',
        baseUrl: overrides.baseUrl || '',
        models: overrides.models || [],
        mode: 'openai',
        ...preset.config,
        ...overrides,
        createdAt: now,
        updatedAt: now,
    } as CustomProviderConfig
}

/**
 * 从厂商预设创建新的 CustomProviderConfig
 */
export function createFromVendorPreset(
    vendorId: string
): CustomProviderConfig {
    const preset = VENDOR_PRESETS[vendorId]
    if (!preset) {
        throw new Error(`Unknown vendor: ${vendorId}`)
    }

    const now = Date.now()
    return {
        id: `${vendorId}-${now}`,
        ...preset,
        name: preset.name || vendorId,
        baseUrl: preset.baseUrl || '',
        models: preset.models || [],
        mode: preset.mode || 'openai',
        createdAt: now,
        updatedAt: now,
    } as CustomProviderConfig
}

/**
 * 验证 CustomProviderConfig 完整性
 */
export function validateCustomProviderConfig(
    config: Partial<CustomProviderConfig>
): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.id) errors.push('缺少 ID')
    if (!config.name) errors.push('缺少名称')
    if (!config.baseUrl) errors.push('缺少 API URL')
    if (!config.models?.length) errors.push('至少需要一个模型')
    if (!config.mode) errors.push('缺少模式选择')

    if (config.mode === 'custom' && !config.customConfig) {
        errors.push('自定义模式需要提供 customConfig')
    }

    if (config.mode === 'custom' && config.customConfig) {
        if (!config.customConfig.request?.endpoint) {
            errors.push('缺少请求端点')
        }
        if (!config.customConfig.response?.sseConfig?.doneMarker) {
            errors.push('缺少 SSE 结束标记')
        }
        if (!config.customConfig.auth?.type) {
            errors.push('缺少认证类型')
        }
    }

    return { valid: errors.length === 0, errors }
}
