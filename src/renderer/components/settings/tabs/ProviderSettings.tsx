/**
 * Provider 设置组件
 * 
 * 新设计：三大内置厂商 + 加号按钮 + 已添加的自定义 Provider
 */

import { useState } from 'react'
import { Plus, Trash, Eye, EyeOff, Check, AlertTriangle, Sliders, X } from 'lucide-react'
import { useStore } from '@store'
import { PROVIDERS, getAdapterConfig } from '@/shared/config/providers'
import { LLM_DEFAULTS } from '@/shared/constants'
import { toast } from '@components/common/ToastProvider'
import LLMAdapterConfigEditor from '@components/dialogs/LLMAdapterConfigEditor'
import { Button, Input, Select } from '@components/ui'
import { ProviderSettingsProps } from '../types'
import { InlineProviderEditor } from './CustomProviderEditor'
import type { CustomProviderConfig } from '@shared/types/customProvider'

// 内置厂商 ID（不包括 custom 占位符）
const BUILTIN_PROVIDER_IDS = ['openai', 'anthropic', 'gemini']

function TestConnectionButton({ localConfig, language }: { localConfig: any, language: 'en' | 'zh' }) {
    const [testing, setTesting] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleTest = async () => {
        if (!localConfig.apiKey && localConfig.provider !== 'ollama') {
            setStatus('error')
            setErrorMsg(language === 'zh' ? '请先输入 API Key' : 'Please enter API Key first')
            return
        }

        setTesting(true)
        setStatus('idle')
        setErrorMsg('')

        try {
            const { checkProviderHealth } = await import('@/renderer/services/healthCheckService')
            const result = await checkProviderHealth(
                localConfig.provider,
                localConfig.apiKey,
                localConfig.baseUrl
            )

            if (result.status === 'healthy') {
                setStatus('success')
                toast.success(language === 'zh' ? `连接成功！延迟: ${result.latency}ms` : `Connected! Latency: ${result.latency}ms`)
            } else {
                setStatus('error')
                setErrorMsg(result.error || 'Connection failed')
            }
        } catch (err: any) {
            setStatus('error')
            setErrorMsg(err.message || 'Connection failed')
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing} className="h-8 px-3 text-xs">
                {testing ? (
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {language === 'zh' ? '测试中...' : 'Testing...'}
                    </span>
                ) : (language === 'zh' ? '测试连接' : 'Test Connection')}
            </Button>
            {status === 'success' && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="w-3.5 h-3.5" />
                    {language === 'zh' ? '连接正常' : 'Connected'}
                </span>
            )}
            {status === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-400" title={errorMsg}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {errorMsg.length > 30 ? errorMsg.slice(0, 30) + '...' : errorMsg}
                </span>
            )}
        </div>
    )
}


export function ProviderSettings({
    localConfig, setLocalConfig, localProviderConfigs, setLocalProviderConfigs,
    showApiKey, setShowApiKey, selectedProvider, providers, language
}: ProviderSettingsProps) {
    const { addCustomModel, removeCustomModel, providerConfigs, customProviders, removeCustomProvider, getProviderApiKey } = useStore()
    const [newModelName, setNewModelName] = useState('')
    const [isAddingCustom, setIsAddingCustom] = useState(false)

    // 当前选中的是自定义 Provider 吗？
    const selectedCustomProvider = customProviders.find(p => p.id === localConfig.provider)
    const isCustomSelected = !!selectedCustomProvider

    const handleAddModel = () => {
        if (newModelName.trim()) {
            addCustomModel(localConfig.provider, newModelName.trim())
            setNewModelName('')
        }
    }

    // 选择内置 Provider
    const handleSelectBuiltinProvider = (providerId: string) => {
        const updatedConfigs = {
            ...localProviderConfigs,
            [localConfig.provider]: {
                ...localProviderConfigs[localConfig.provider],
                apiKey: localConfig.apiKey,
                baseUrl: localConfig.baseUrl,
                timeout: localConfig.timeout,
                adapterId: localConfig.adapterId,
                adapterConfig: localConfig.adapterConfig,
                model: localConfig.model,
            }
        }
        setLocalProviderConfigs(updatedConfigs)

        const nextConfig = updatedConfigs[providerId] || {}
        const providerInfo = PROVIDERS[providerId]
        setLocalConfig({
            ...localConfig,
            provider: providerId as any,
            apiKey: nextConfig.apiKey || '',
            baseUrl: nextConfig.baseUrl || providerInfo?.endpoint.default || '',
            timeout: nextConfig.timeout || providerInfo?.defaults.timeout || 120000,
            adapterId: nextConfig.adapterId || providerId,
            adapterConfig: nextConfig.adapterConfig || getAdapterConfig(providerId),
            model: nextConfig.model || providerInfo?.models.default[0] || '',
        })

        // 关闭添加表单
        setIsAddingCustom(false)
    }

    // 选择自定义 Provider  
    const handleSelectCustomProvider = (custom: CustomProviderConfig) => {
        // 1. 先保存当前 Provider 的配置
        const updatedConfigs = {
            ...localProviderConfigs,
            [localConfig.provider]: {
                ...localProviderConfigs[localConfig.provider],
                apiKey: localConfig.apiKey,
                baseUrl: localConfig.baseUrl,
                timeout: localConfig.timeout,
                adapterId: localConfig.adapterId,
                adapterConfig: localConfig.adapterConfig,
                model: localConfig.model,
            }
        }
        setLocalProviderConfigs(updatedConfigs)

        // 2. 获取已保存的配置
        const savedConfig = updatedConfigs[custom.id] || {}
        const savedApiKey = savedConfig.apiKey || getProviderApiKey(custom.id) || ''

        // 3. 根据模式决定适配器配置
        let adapterId: string
        let adapterConfig: any

        if (custom.mode === 'custom' && custom.customConfig) {
            // 完全自定义模式：从 customConfig 构建适配器配置
            adapterId = custom.id // 使用 provider id 作为适配器 id
            adapterConfig = savedConfig.adapterConfig || {
                id: custom.id,
                name: custom.name,
                description: '自定义适配器',
                isBuiltin: false,
                request: {
                    endpoint: custom.customConfig.request.endpoint,
                    method: custom.customConfig.request.method,
                    headers: { 'Content-Type': 'application/json', ...(custom.customConfig.request.headers || {}) },
                    bodyTemplate: custom.customConfig.request.bodyTemplate,
                },
                response: {
                    contentField: custom.customConfig.response.streaming.contentField,
                    reasoningField: custom.customConfig.response.streaming.reasoningField,
                    toolCallField: custom.customConfig.response.streaming.toolCallsField,
                    toolNamePath: custom.customConfig.response.streaming.toolNameField || 'function.name',
                    toolArgsPath: custom.customConfig.response.streaming.toolArgsField || 'function.arguments',
                    toolIdPath: custom.customConfig.response.streaming.toolIdField || 'id',
                    argsIsObject: custom.customConfig.response.toolCall?.argsIsObject || false,
                    finishReasonField: custom.customConfig.response.streaming.finishReasonField || 'finish_reason',
                    doneMarker: custom.customConfig.response.sseConfig.doneMarker,
                },
            }
        } else {
            // 兼容模式：使用内置适配器
            adapterId = savedConfig.adapterId || custom.mode
            adapterConfig = savedConfig.adapterConfig || getAdapterConfig(custom.mode)
        }

        // 4. 设置配置，优先使用已保存的值
        setLocalConfig({
            ...localConfig,
            provider: custom.id as any,
            apiKey: savedApiKey,
            baseUrl: savedConfig.baseUrl || custom.baseUrl,
            timeout: savedConfig.timeout || custom.defaults?.timeout || 120000,
            adapterId,
            adapterConfig,
            model: savedConfig.model || custom.models[0] || '',
        })

        setIsAddingCustom(false)
    }

    // 删除自定义 Provider
    const handleDeleteCustomProvider = (e: React.MouseEvent, custom: CustomProviderConfig) => {
        e.stopPropagation()
        if (confirm(language === 'zh' ? `删除 ${custom.name}？` : `Delete ${custom.name}?`)) {
            removeCustomProvider(custom.id)
            // 如果删除的是当前选中的，切回 OpenAI
            if (localConfig.provider === custom.id) {
                handleSelectBuiltinProvider('openai')
            }
        }
    }

    // 过滤出内置 Provider 用于显示
    const builtinProviders = providers.filter(p => BUILTIN_PROVIDER_IDS.includes(p.id))

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Provider Selector */}
            <section>
                <h4 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider text-xs">
                    {language === 'zh' ? '选择提供商' : 'Select Provider'}
                </h4>
                <div className="flex flex-wrap gap-3">
                    {/* 内置厂商 */}
                    {builtinProviders.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSelectBuiltinProvider(p.id)}
                            className={`relative flex flex-col items-center justify-center px-6 py-3 rounded-xl border transition-all duration-200 ${localConfig.provider === p.id
                                ? 'border-accent bg-accent/10 text-accent shadow-[0_0_15px_rgba(var(--accent),0.15)]'
                                : 'border-border-subtle bg-surface/30 text-text-muted hover:bg-surface hover:border-border hover:text-text-primary'
                                }`}
                        >
                            <span className="font-medium text-sm">{p.name}</span>
                            {localConfig.provider === p.id && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent animate-pulse" />
                            )}
                        </button>
                    ))}

                    {/* 已添加的自定义 Provider */}
                    {customProviders.map(custom => (
                        <div
                            key={custom.id}
                            onClick={() => handleSelectCustomProvider(custom)}
                            className={`group relative flex flex-col items-center justify-center px-6 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${localConfig.provider === custom.id
                                ? 'border-accent bg-accent/10 text-accent shadow-[0_0_15px_rgba(var(--accent),0.15)]'
                                : 'border-border-subtle bg-surface/30 text-text-muted hover:bg-surface hover:border-border hover:text-text-primary'
                                }`}
                        >
                            <span className="font-medium text-sm">{custom.name}</span>
                            {localConfig.provider === custom.id && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent animate-pulse" />
                            )}
                            {/* 删除按钮 */}
                            <button
                                onClick={(e) => handleDeleteCustomProvider(e, custom)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                                title={language === 'zh' ? '删除' : 'Delete'}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}

                    {/* 加号按钮 */}
                    <button
                        onClick={() => setIsAddingCustom(true)}
                        className={`flex flex-col items-center justify-center px-6 py-3 rounded-xl border-2 border-dashed transition-all duration-200 ${isAddingCustom
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border-subtle text-text-muted hover:border-accent/50 hover:text-accent hover:bg-accent/5'
                            }`}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="text-xs mt-1">{language === 'zh' ? '添加' : 'Add'}</span>
                    </button>
                </div>

                {/* 内联添加自定义 Provider 表单 */}
                {isAddingCustom && (
                    <div className="mt-4">
                        <InlineProviderEditor
                            language={language}
                            onSave={() => setIsAddingCustom(false)}
                            onCancel={() => setIsAddingCustom(false)}
                            isNew
                        />
                    </div>
                )}
            </section>

            {/* Configuration - 仅当选中内置厂商或自定义 Provider 时显示 */}
            {!isAddingCustom && (
                <>
                    <section className="space-y-6 p-6 bg-surface/30 rounded-xl border border-border-subtle">
                        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                            {language === 'zh' ? '配置' : 'Configuration'}
                        </h4>

                        {/* Model Selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-primary">
                                {language === 'zh' ? '模型' : 'Model'}
                            </label>
                            <div className="flex gap-2">
                                <Select
                                    value={localConfig.model}
                                    onChange={(value) => setLocalConfig({ ...localConfig, model: value })}
                                    options={(() => {
                                        // 合并多个来源的模型
                                        const modelsSet = new Set<string>()

                                        if (isCustomSelected) {
                                            // 自定义 Provider: 合并 customProviders.models + providerConfigs.customModels
                                            selectedCustomProvider.models.forEach(m => modelsSet.add(m))
                                        } else if (selectedProvider) {
                                            // 内置 Provider: 使用内置模型
                                            selectedProvider.models.forEach(m => modelsSet.add(m))
                                        }

                                        // 添加 providerConfigs 中的 customModels（两种模式都添加）
                                        const customModels = providerConfigs[localConfig.provider]?.customModels || []
                                        customModels.forEach(m => modelsSet.add(m))

                                        return Array.from(modelsSet).map(m => ({ value: m, label: m }))
                                    })()}
                                    className="flex-1"
                                />
                            </div>

                            {/* Custom Model Management */}
                            <div className="mt-3 pt-3 border-t border-border-subtle">
                                <div className="flex gap-2 items-center">
                                    <Input
                                        value={newModelName}
                                        onChange={(e) => setNewModelName(e.target.value)}
                                        placeholder={language === 'zh' ? '添加自定义模型...' : 'Add custom model...'}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                                        className="flex-1 h-9 text-sm"
                                    />
                                    <Button variant="secondary" size="sm" onClick={handleAddModel} disabled={!newModelName.trim()} className="h-9 px-3">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                {providerConfigs[localConfig.provider]?.customModels?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {providerConfigs[localConfig.provider]?.customModels.map((model: string) => (
                                            <div key={model} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-full border border-border-subtle text-xs text-text-secondary group hover:border-accent/30 transition-colors">
                                                <span>{model}</span>
                                                <button onClick={() => removeCustomModel(localConfig.provider, model)} className="text-text-muted hover:text-red-400 transition-colors">
                                                    <Trash className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* API Key */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-primary">API Key</label>
                            <div className="relative">
                                <Input
                                    type={showApiKey ? "text" : "password"}
                                    value={localConfig.apiKey}
                                    onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                                    placeholder={PROVIDERS[localConfig.provider]?.auth.placeholder || 'Enter API Key'}
                                    rightIcon={
                                        <button onClick={() => setShowApiKey(!showApiKey)} className="text-text-muted hover:text-text-primary transition-colors">
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    }
                                />
                            </div>
                            {!isCustomSelected && PROVIDERS[localConfig.provider]?.auth.helpUrl && (
                                <div className="flex justify-end">
                                    <a href={PROVIDERS[localConfig.provider]?.auth.helpUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:text-accent-hover hover:underline">
                                        {language === 'zh' ? '获取 API Key →' : 'Get API Key →'}
                                    </a>
                                </div>
                            )}
                        </div>

                        <TestConnectionButton localConfig={localConfig} language={language} />

                        {/* Advanced Options */}
                        <div className="pt-2">
                            <details className="group">
                                <summary className="flex items-center gap-2 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none">
                                    <span className="group-open:rotate-90 transition-transform">▶</span>
                                    {language === 'zh' ? '高级设置 (端点、超时、参数)' : 'Advanced Settings (Endpoint, Timeout, Parameters)'}
                                </summary>
                                <div className="mt-4 space-y-4 pl-4 border-l border-border-subtle">
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1.5 block">{language === 'zh' ? '自定义端点' : 'Custom Endpoint'}</label>
                                        <Input value={localConfig.baseUrl || ''} onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value || undefined })} placeholder="https://api.example.com/v1" className="text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-secondary mb-1.5 block">{language === 'zh' ? '请求超时 (秒)' : 'Request Timeout (seconds)'}</label>
                                        <Input type="number" value={(localConfig.timeout || 120000) / 1000} onChange={(e) => setLocalConfig({ ...localConfig, timeout: (parseInt(e.target.value) || 120) * 1000 })} min={30} max={600} step={30} className="w-32 text-sm" />
                                    </div>

                                    {/* LLM Parameters */}
                                    <div className="pt-3 border-t border-border-subtle">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sliders className="w-4 h-4 text-accent" />
                                            <span className="text-xs font-medium text-text-secondary">{language === 'zh' ? 'LLM 参数' : 'LLM Parameters'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-text-secondary mb-1.5 block">{language === 'zh' ? '温度 (Temperature)' : 'Temperature'}</label>
                                                <Input type="number" value={localConfig.parameters?.temperature ?? LLM_DEFAULTS.TEMPERATURE} onChange={(e) => setLocalConfig({ ...localConfig, parameters: { ...localConfig.parameters, temperature: parseFloat(e.target.value) || LLM_DEFAULTS.TEMPERATURE, topP: localConfig.parameters?.topP ?? LLM_DEFAULTS.TOP_P, maxTokens: localConfig.parameters?.maxTokens ?? LLM_DEFAULTS.MAX_TOKENS } })} min={0} max={2} step={0.1} className="w-full text-sm" />
                                                <p className="text-[10px] text-text-muted mt-1">{language === 'zh' ? '控制输出随机性 (0-2)' : 'Controls randomness (0-2)'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-text-secondary mb-1.5 block">Top P</label>
                                                <Input type="number" value={localConfig.parameters?.topP ?? LLM_DEFAULTS.TOP_P} onChange={(e) => setLocalConfig({ ...localConfig, parameters: { ...localConfig.parameters, temperature: localConfig.parameters?.temperature ?? LLM_DEFAULTS.TEMPERATURE, topP: parseFloat(e.target.value) || LLM_DEFAULTS.TOP_P, maxTokens: localConfig.parameters?.maxTokens ?? LLM_DEFAULTS.MAX_TOKENS } })} min={0} max={1} step={0.1} className="w-full text-sm" />
                                                <p className="text-[10px] text-text-muted mt-1">{language === 'zh' ? '核采样概率 (0-1)' : 'Nucleus sampling (0-1)'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-text-secondary mb-1.5 block">{language === 'zh' ? '最大 Token' : 'Max Tokens'}</label>
                                                <Input type="number" value={localConfig.parameters?.maxTokens ?? LLM_DEFAULTS.MAX_TOKENS} onChange={(e) => setLocalConfig({ ...localConfig, parameters: { ...localConfig.parameters, temperature: localConfig.parameters?.temperature ?? LLM_DEFAULTS.TEMPERATURE, topP: localConfig.parameters?.topP ?? LLM_DEFAULTS.TOP_P, maxTokens: parseInt(e.target.value) || LLM_DEFAULTS.MAX_TOKENS } })} min={256} max={32768} step={256} className="w-full text-sm" />
                                                <p className="text-[10px] text-text-muted mt-1">{language === 'zh' ? '最大输出长度' : 'Max output length'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </section>

                    {/* LLM Adapter Config */}
                    <section className="space-y-4 p-6 bg-surface/30 rounded-xl border border-border-subtle">
                        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                            {language === 'zh' ? '🔌 适配器配置' : '🔌 Adapter Configuration'}
                        </h4>
                        <LLMAdapterConfigEditor
                            adapterId={localConfig.adapterId || 'openai'}
                            config={localConfig.adapterConfig}
                            onChange={(id, config) => setLocalConfig({ ...localConfig, adapterId: id, adapterConfig: config })}
                            language={language}
                            hasConfiguredAI={!!localConfig.apiKey}
                        />
                    </section>
                </>
            )}
        </div>
    )
}
