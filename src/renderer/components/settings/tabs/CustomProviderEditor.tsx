/**
 * 自定义 Provider 编辑器 (内联版本)
 * 支持兼容模式和完全自定义模式
 */

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash, Zap, X, Save, Code2, FileJson } from 'lucide-react'
import { Button, Input, Select } from '@components/ui'
import { useStore } from '@store'
import type {
    CustomProviderConfig,
    ProviderMode,
    CustomModeConfig,
    AuthType,
} from '@shared/types/customProvider'
import { VENDOR_PRESETS, validateCustomProviderConfig } from '@shared/types/customProviderPresets'
import { toast } from '@components/common/ToastProvider'

interface InlineProviderEditorProps {
    provider?: CustomProviderConfig | null
    language: 'en' | 'zh'
    onSave: () => void
    onCancel: () => void
    isNew?: boolean
}

const MODE_OPTIONS = [
    { value: 'openai', label: 'OpenAI 兼容' },
    { value: 'anthropic', label: 'Anthropic 兼容' },
    { value: 'gemini', label: 'Gemini 兼容' },
    { value: 'custom', label: '完全自定义' },
]

const AUTH_TYPE_OPTIONS = [
    { value: 'bearer', label: 'Bearer Token (Authorization: Bearer xxx)' },
    { value: 'header', label: '自定义 Header' },
    { value: 'query', label: 'Query 参数' },
    { value: 'none', label: '无认证' },
]

const VENDOR_OPTIONS = Object.entries(VENDOR_PRESETS).map(([id, preset]) => ({
    value: id,
    label: preset.name || id,
}))

// 默认的 OpenAI 风格请求体模板
const DEFAULT_BODY_TEMPLATE = `{
  "model": "{{model}}",
  "messages": "{{messages}}",
  "stream": true,
  "max_tokens": 8192
}`

export function InlineProviderEditor({
    provider,
    language,
    onSave,
    onCancel,
    isNew = false,
}: InlineProviderEditorProps) {
    const { addCustomProvider, updateCustomProvider, setProviderApiKey, getProviderApiKey } = useStore()

    // 基础状态
    const [name, setName] = useState('')
    const [baseUrl, setBaseUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [models, setModels] = useState<string[]>([])
    const [newModel, setNewModel] = useState('')
    const [mode, setMode] = useState<ProviderMode>('openai')
    const [timeout, setTimeout] = useState(120)
    const [selectedPreset, setSelectedPreset] = useState('')

    // 完全自定义模式状态
    const [showCustomConfig, setShowCustomConfig] = useState(false)
    const [endpoint, setEndpoint] = useState('/chat/completions')
    const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY_TEMPLATE)
    const [bodyJsonError, setBodyJsonError] = useState<string | null>(null)

    // 认证配置
    const [authType, setAuthType] = useState<AuthType>('bearer')
    const [authHeaderName, setAuthHeaderName] = useState('X-API-Key')

    // 响应解析配置
    const [contentField, setContentField] = useState('delta.content')
    const [reasoningField, setReasoningField] = useState('')
    const [toolCallsField, setToolCallsField] = useState('delta.tool_calls')
    const [doneMarker, setDoneMarker] = useState('[DONE]')

    // 初始化表单
    useEffect(() => {
        if (provider) {
            setName(provider.name)
            setBaseUrl(provider.baseUrl)
            setModels(provider.models || [])
            setMode(provider.mode)
            setTimeout((provider.defaults?.timeout || 120000) / 1000)
            const savedKey = getProviderApiKey(provider.id)
            setApiKey(savedKey || '')

            // 完全自定义模式配置
            if (provider.customConfig) {
                setEndpoint(provider.customConfig.request.endpoint)
                setBodyTemplate(JSON.stringify(provider.customConfig.request.bodyTemplate, null, 2))
                setAuthType(provider.customConfig.auth.type)
                if (provider.customConfig.auth.headerName) {
                    setAuthHeaderName(provider.customConfig.auth.headerName)
                }
                setContentField(provider.customConfig.response.streaming.contentField)
                setReasoningField(provider.customConfig.response.streaming.reasoningField || '')
                setToolCallsField(provider.customConfig.response.streaming.toolCallsField || 'delta.tool_calls')
                setDoneMarker(provider.customConfig.response.sseConfig.doneMarker)
            }
        } else {
            // 重置
            setName('')
            setBaseUrl('')
            setApiKey('')
            setModels([])
            setNewModel('')
            setMode('openai')
            setTimeout(120)
            setSelectedPreset('')
            setEndpoint('/chat/completions')
            setBodyTemplate(DEFAULT_BODY_TEMPLATE)
            setAuthType('bearer')
            setContentField('delta.content')
            setReasoningField('')
            setToolCallsField('delta.tool_calls')
            setDoneMarker('[DONE]')
        }
    }, [provider, getProviderApiKey])

    // 从厂商预设加载
    const handleLoadPreset = (presetId: string) => {
        const preset = VENDOR_PRESETS[presetId]
        if (preset) {
            setName(preset.name || presetId)
            setBaseUrl(preset.baseUrl || '')
            setModels(preset.models || [])
            setMode(preset.mode || 'openai')
            if (preset.defaults?.timeout) {
                setTimeout(preset.defaults.timeout / 1000)
            }
            setSelectedPreset(presetId)
        }
    }

    // 添加模型
    const handleAddModel = () => {
        if (newModel.trim() && !models.includes(newModel.trim())) {
            setModels([...models, newModel.trim()])
            setNewModel('')
        }
    }

    // 验证 JSON
    const handleBodyTemplateChange = (text: string) => {
        setBodyTemplate(text)
        try {
            JSON.parse(text)
            setBodyJsonError(null)
        } catch (e: any) {
            setBodyJsonError(e.message)
        }
    }

    // 构建 customConfig
    const buildCustomConfig = (): CustomModeConfig | undefined => {
        if (mode !== 'custom') return undefined

        let parsedBody: Record<string, unknown> = {}
        try {
            parsedBody = JSON.parse(bodyTemplate)
        } catch {
            toast.error(language === 'zh' ? '请求体 JSON 格式错误' : 'Invalid request body JSON')
            return undefined
        }

        return {
            request: {
                endpoint,
                method: 'POST',
                bodyTemplate: parsedBody,
            },
            response: {
                sseConfig: {
                    dataPrefix: 'data: ',
                    doneMarker,
                },
                streaming: {
                    contentField,
                    reasoningField: reasoningField || undefined,
                    toolCallsField: toolCallsField || undefined,
                    toolNameField: 'function.name',
                    toolArgsField: 'function.arguments',
                    finishReasonField: 'finish_reason',
                },
                toolCall: {
                    mode: 'streaming',
                    argsIsObject: false,
                },
            },
            auth: {
                type: authType,
                headerName: authType === 'header' ? authHeaderName : undefined,
            },
        }
    }

    // 保存
    const handleSave = () => {
        // 完全自定义模式需要构建 customConfig
        const customConfig = mode === 'custom' ? buildCustomConfig() : undefined
        if (mode === 'custom' && !customConfig) {
            return // buildCustomConfig 已显示错误
        }

        const config: Partial<CustomProviderConfig> = {
            id: provider?.id || `custom-${Date.now()}`,
            name,
            baseUrl,
            models,
            mode,
            customConfig,
            defaults: { timeout: timeout * 1000 },
        }

        const validation = validateCustomProviderConfig(config)
        if (!validation.valid) {
            toast.error(validation.errors.join(', '))
            return
        }

        if (provider) {
            updateCustomProvider(provider.id, config)
            toast.success(language === 'zh' ? '已更新' : 'Updated')
        } else {
            addCustomProvider(config as CustomProviderConfig)
            toast.success(language === 'zh' ? '已添加' : 'Added')
        }

        if (apiKey) {
            setProviderApiKey(config.id!, apiKey)
        }

        onSave()
    }

    const isCustomMode = mode === 'custom'

    return (
        <div className="p-4 bg-surface-elevated border border-accent/30 rounded-xl space-y-4 animate-fade-in">
            {/* 快速预设 (仅新建时) */}
            {isNew && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-text-secondary flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        {language === 'zh' ? '快速预设' : 'Quick Preset'}
                    </label>
                    <Select
                        value={selectedPreset}
                        onChange={handleLoadPreset}
                        options={[{ value: '', label: language === 'zh' ? '选择预设...' : 'Select...' }, ...VENDOR_OPTIONS]}
                        className="text-sm"
                    />
                </div>
            )}

            {/* 基础信息 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                        {language === 'zh' ? '名称' : 'Name'} *
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="DeepSeek"
                        className="text-sm h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                        {language === 'zh' ? '模式' : 'Mode'} *
                    </label>
                    <Select
                        value={mode}
                        onChange={(v) => setMode(v as ProviderMode)}
                        options={MODE_OPTIONS}
                        className="text-sm"
                    />
                </div>
            </div>

            {/* API URL 和 Key */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">API URL *</label>
                <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="text-sm h-9"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">API Key</label>
                <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={language === 'zh' ? '输入 API Key' : 'Enter API Key'}
                    className="text-sm h-9"
                />
            </div>

            {/* 模型列表 */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                    {language === 'zh' ? '模型列表' : 'Models'} *
                </label>
                <div className="flex gap-2">
                    <Input
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder={language === 'zh' ? '添加模型...' : 'Add model...'}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                        className="flex-1 text-sm h-9"
                    />
                    <Button variant="secondary" size="sm" onClick={handleAddModel} disabled={!newModel.trim()} className="h-9 px-3">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                {models.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {models.map((model) => (
                            <div key={model} className="flex items-center gap-1 px-2 py-0.5 bg-surface rounded-full border border-border-subtle text-xs">
                                <span>{model}</span>
                                <button onClick={() => setModels(models.filter(m => m !== model))} className="text-text-muted hover:text-red-400">
                                    <Trash className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== 完全自定义模式配置 ===== */}
            {isCustomMode && (
                <div className="border border-accent/20 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowCustomConfig(!showCustomConfig)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                        {showCustomConfig ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        <Code2 className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">
                            {language === 'zh' ? '自定义请求/响应配置' : 'Custom Request/Response Config'}
                        </span>
                        <span className="ml-auto text-xs text-accent">
                            {language === 'zh' ? '必填' : 'Required'}
                        </span>
                    </button>

                    {showCustomConfig && (
                        <div className="p-4 space-y-4 bg-surface/30">
                            {/* 认证方式 */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">
                                    {language === 'zh' ? '认证方式' : 'Authentication'}
                                </label>
                                <Select
                                    value={authType}
                                    onChange={(v) => setAuthType(v as AuthType)}
                                    options={AUTH_TYPE_OPTIONS}
                                    className="text-sm"
                                />
                                {authType === 'header' && (
                                    <Input
                                        value={authHeaderName}
                                        onChange={(e) => setAuthHeaderName(e.target.value)}
                                        placeholder="X-API-Key"
                                        className="text-sm h-8 mt-2"
                                    />
                                )}
                            </div>

                            {/* 请求端点 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary">
                                    {language === 'zh' ? 'API 端点 (相对路径)' : 'API Endpoint (relative path)'}
                                </label>
                                <Input
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                    placeholder="/chat/completions"
                                    className="font-mono text-sm h-9"
                                />
                            </div>

                            {/* 请求体模板 */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                                    <FileJson className="w-3.5 h-3.5 text-accent" />
                                    {language === 'zh' ? '请求体模板 (JSON)' : 'Request Body Template (JSON)'}
                                </label>
                                <textarea
                                    value={bodyTemplate}
                                    onChange={(e) => handleBodyTemplateChange(e.target.value)}
                                    className={`w-full px-3 py-2 text-xs font-mono leading-5 bg-surface/50 border rounded-lg text-text-primary focus:outline-none resize-none ${bodyJsonError ? 'border-red-500/50' : 'border-border-subtle focus:border-accent'}`}
                                    rows={6}
                                    spellCheck={false}
                                />
                                {bodyJsonError && (
                                    <p className="text-xs text-red-400">JSON Error: {bodyJsonError}</p>
                                )}
                                <p className="text-[10px] text-text-muted">
                                    {language === 'zh'
                                        ? '占位符: {{model}}, {{messages}}, {{tools}}, {{max_tokens}}, {{stream}}'
                                        : 'Placeholders: {{model}}, {{messages}}, {{tools}}, {{max_tokens}}, {{stream}}'}
                                </p>
                            </div>

                            {/* 响应解析配置 */}
                            <div className="pt-3 border-t border-border-subtle space-y-3">
                                <label className="text-xs font-medium text-text-secondary">
                                    {language === 'zh' ? '响应解析配置' : 'Response Parsing'}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-muted">{language === 'zh' ? '内容字段路径' : 'Content Field'}</label>
                                        <Input
                                            value={contentField}
                                            onChange={(e) => setContentField(e.target.value)}
                                            placeholder="delta.content"
                                            className="font-mono text-xs h-8"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-muted">{language === 'zh' ? '思考字段 (可选)' : 'Reasoning Field'}</label>
                                        <Input
                                            value={reasoningField}
                                            onChange={(e) => setReasoningField(e.target.value)}
                                            placeholder="delta.reasoning"
                                            className="font-mono text-xs h-8"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-muted">{language === 'zh' ? '工具调用字段' : 'Tool Calls Field'}</label>
                                        <Input
                                            value={toolCallsField}
                                            onChange={(e) => setToolCallsField(e.target.value)}
                                            placeholder="delta.tool_calls"
                                            className="font-mono text-xs h-8"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-muted">{language === 'zh' ? '流结束标记' : 'Done Marker'}</label>
                                        <Input
                                            value={doneMarker}
                                            onChange={(e) => setDoneMarker(e.target.value)}
                                            placeholder="[DONE]"
                                            className="font-mono text-xs h-8"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 高级设置 (非自定义模式) */}
            {!isCustomMode && (
                <>
                    <button
                        onClick={() => setShowCustomConfig(!showCustomConfig)}
                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                    >
                        {showCustomConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {language === 'zh' ? '高级设置' : 'Advanced'}
                    </button>
                    {showCustomConfig && (
                        <div className="pl-4 border-l border-border-subtle space-y-2">
                            <div className="space-y-1">
                                <label className="text-xs text-text-secondary">{language === 'zh' ? '超时 (秒)' : 'Timeout (sec)'}</label>
                                <Input type="number" value={timeout} onChange={(e) => setTimeout(parseInt(e.target.value) || 120)} min={30} max={600} className="w-24 text-sm h-8" />
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 px-3">
                    <X className="w-4 h-4 mr-1" />
                    {language === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button size="sm" onClick={handleSave} className="h-8 px-3">
                    <Save className="w-4 h-4 mr-1" />
                    {language === 'zh' ? '保存' : 'Save'}
                </Button>
            </div>
        </div>
    )
}
