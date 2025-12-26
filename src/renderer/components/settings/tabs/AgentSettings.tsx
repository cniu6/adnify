/**
 * Agent 设置组件
 * 完整的 Agent 高级配置面板
 */

import { useState } from 'react'
import { getPromptTemplates, getPromptTemplateSummary } from '@renderer/agent/prompts/promptTemplates'
import { Button, Input, Select, Switch } from '@components/ui'
import { AgentSettingsProps } from '../types'
import { PromptPreviewModal } from './PromptPreviewModal'

// 默认忽略目录
const DEFAULT_IGNORED_DIRS = [
    'node_modules', '.git', 'dist', 'build', '.next',
    '__pycache__', '.venv', 'venv', '.cache', 'coverage',
    '.nyc_output', 'tmp', 'temp', '.idea', '.vscode',
]

export function AgentSettings({
    autoApprove, setAutoApprove, aiInstructions, setAiInstructions,
    promptTemplateId, setPromptTemplateId, agentConfig, setAgentConfig, language
}: AgentSettingsProps) {
    const templates = getPromptTemplates()
    const [showPreview, setShowPreview] = useState(false)
    const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<string | null>(null)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [ignoredDirsInput, setIgnoredDirsInput] = useState(
        (agentConfig.ignoredDirectories || DEFAULT_IGNORED_DIRS).join(', ')
    )

    const handlePreviewTemplate = (templateId: string) => {
        setSelectedTemplateForPreview(templateId)
        setShowPreview(true)
    }

    const handleIgnoredDirsChange = (value: string) => {
        setIgnoredDirsInput(value)
        const dirs = value.split(',').map(d => d.trim()).filter(Boolean)
        setAgentConfig({ ...agentConfig, ignoredDirectories: dirs })
    }

    const resetIgnoredDirs = () => {
        setIgnoredDirsInput(DEFAULT_IGNORED_DIRS.join(', '))
        setAgentConfig({ ...agentConfig, ignoredDirectories: DEFAULT_IGNORED_DIRS })
    }

    const t = (zh: string, en: string) => language === 'zh' ? zh : en

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 自动化权限 */}
            <section className="space-y-4 p-5 bg-surface/30 rounded-xl border border-border-subtle">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                    {t('自动化权限', 'Automation Permissions')}
                </h4>
                <div className="space-y-4">
                    <Switch
                        label={t('自动批准终端命令', 'Auto-approve terminal commands')}
                        checked={autoApprove.terminal}
                        onChange={(e) => setAutoApprove({ ...autoApprove, terminal: e.target.checked })}
                    />
                    <Switch
                        label={t('自动批准危险操作 (删除文件等)', 'Auto-approve dangerous operations')}
                        checked={autoApprove.dangerous}
                        onChange={(e) => setAutoApprove({ ...autoApprove, dangerous: e.target.checked })}
                    />
                    <Switch
                        label={t('启用自动检查与修复', 'Enable Auto-check & Fix')}
                        checked={agentConfig.enableAutoFix}
                        onChange={(e) => setAgentConfig({ ...agentConfig, enableAutoFix: e.target.checked })}
                    />
                    <p className="text-xs text-text-muted pl-1">
                        {t('开启后，Agent 将无需确认直接执行相应操作。请谨慎使用。',
                            'When enabled, the Agent will execute operations without confirmation. Use with caution.')}
                    </p>
                </div>
            </section>

            {/* Prompt 模板 */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                    {t('Prompt 模板', 'Prompt Template')}
                </h4>
                <div className="space-y-3">
                    <Select
                        value={promptTemplateId}
                        onChange={(value) => setPromptTemplateId(value)}
                        options={templates.map(t => ({
                            value: t.id,
                            label: `${t.name} ${t.isDefault ? '(默认)' : ''} [P${t.priority}]`
                        }))}
                        className="w-full"
                    />

                    <div className="bg-surface/30 p-4 rounded-lg border border-border-subtle space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-text-primary">
                                        {templates.find(t => t.id === promptTemplateId)?.name}
                                    </span>
                                    <span className="text-xs text-text-muted px-2 py-0.5 bg-surface rounded border border-border-subtle">
                                        P{templates.find(t => t.id === promptTemplateId)?.priority}
                                    </span>
                                    {templates.find(t => t.id === promptTemplateId)?.tags?.map(tag => (
                                        <span key={tag} className="text-xs text-accent px-1.5 py-0.5 bg-accent/10 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-text-secondary">
                                    {language === 'zh'
                                        ? templates.find(t => t.id === promptTemplateId)?.descriptionZh
                                        : templates.find(t => t.id === promptTemplateId)?.description}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePreviewTemplate(promptTemplateId)}
                                className="shrink-0"
                            >
                                {t('预览完整提示词', 'Preview Full Prompt')}
                            </Button>
                        </div>
                    </div>

                    <details className="group">
                        <summary className="flex items-center gap-2 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary transition-colors select-none">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            {t('查看所有模板概览', 'View All Templates Overview')}
                        </summary>
                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {getPromptTemplateSummary().map(tmpl => (
                                <div key={tmpl.id} className="flex items-center justify-between p-2 rounded hover:bg-surface/20 transition-colors border border-transparent hover:border-border-subtle">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="font-medium text-sm text-text-primary w-24">{tmpl.name}</span>
                                        <span className="text-xs text-text-muted px-1.5 py-0.5 bg-surface rounded">P{tmpl.priority}</span>
                                        <span className="text-xs text-text-secondary flex-1">
                                            {language === 'zh' ? tmpl.descriptionZh : tmpl.description}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handlePreviewTemplate(tmpl.id)} className="text-xs px-2 py-1">
                                        {t('预览', 'Preview')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            </section>

            {/* 自定义系统指令 */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                    {t('自定义系统指令', 'Custom System Instructions')}
                </h4>
                <textarea
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    placeholder={t(
                        '在此输入全局系统指令，例如："总是使用中文回答"、"代码风格偏好..."',
                        'Enter global system instructions here, e.g., "Always answer in English", "Code style preferences..."'
                    )}
                    className="w-full h-32 p-4 bg-surface/50 rounded-xl border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none text-sm font-mono custom-scrollbar"
                />
                <p className="text-xs text-text-muted">
                    {t('这些指令将附加到 System Prompt 中，影响所有 AI 回复',
                        'These instructions will be appended to the System Prompt and affect all AI responses')}
                </p>
            </section>

            {/* 基础配置 */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                    {t('基础配置', 'Basic Configuration')}
                </h4>
                <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('最大工具循环', 'Max Tool Loops')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxToolLoops}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxToolLoops: parseInt(e.target.value) || 30 })}
                                min={5}
                                max={100}
                                className="w-full"
                            />
                            <p className="text-xs text-text-muted mt-1">
                                {t('单次对话最大工具调用次数 (5-100)', 'Max tool calls per conversation (5-100)')}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('最大历史消息', 'Max History Messages')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxHistoryMessages}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxHistoryMessages: parseInt(e.target.value) || 60 })}
                                min={10}
                                max={200}
                                className="w-full"
                            />
                            <p className="text-xs text-text-muted mt-1">
                                {t('保留的历史消息数量 (10-200)', 'Number of messages to retain (10-200)')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 上下文限制 */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wider text-xs mb-2">
                    {t('上下文限制', 'Context Limits')}
                </h4>
                <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('工具结果字符限制', 'Tool Result Char Limit')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxToolResultChars}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxToolResultChars: parseInt(e.target.value) || 10000 })}
                                min={5000}
                                max={100000}
                                step={5000}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('总上下文字符限制', 'Total Context Char Limit')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxTotalContextChars}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxTotalContextChars: parseInt(e.target.value) || 60000 })}
                                min={30000}
                                max={500000}
                                step={10000}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('单文件字符限制', 'Single File Char Limit')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxSingleFileChars ?? 6000}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxSingleFileChars: parseInt(e.target.value) || 6000 })}
                                min={2000}
                                max={50000}
                                step={1000}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('文件内容字符限制', 'File Content Char Limit')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxFileContentChars}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxFileContentChars: parseInt(e.target.value) || 15000 })}
                                min={5000}
                                max={100000}
                                step={5000}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('最大上下文文件数', 'Max Context Files')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxContextFiles ?? 6}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxContextFiles: parseInt(e.target.value) || 6 })}
                                min={1}
                                max={20}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('语义搜索结果数', 'Semantic Search Results')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxSemanticResults ?? 5}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxSemanticResults: parseInt(e.target.value) || 5 })}
                                min={1}
                                max={20}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-2">
                                {t('终端输出字符限制', 'Terminal Char Limit')}
                            </label>
                            <Input
                                type="number"
                                value={agentConfig.maxTerminalChars ?? 3000}
                                onChange={(e) => setAgentConfig({ ...agentConfig, maxTerminalChars: parseInt(e.target.value) || 3000 })}
                                min={1000}
                                max={20000}
                                step={500}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 高级配置（可折叠） */}
            <section className="space-y-4">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
                >
                    <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
                    {t('高级配置', 'Advanced Configuration')}
                </button>

                {showAdvanced && (
                    <div className="space-y-6 animate-fade-in">
                        {/* 重试配置 */}
                        <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                            <h5 className="text-sm font-medium text-text-primary">
                                {t('重试配置', 'Retry Configuration')}
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('最大重试次数', 'Max Retries')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.maxRetries ?? 3}
                                        onChange={(e) => setAgentConfig({ ...agentConfig, maxRetries: parseInt(e.target.value) || 3 })}
                                        min={0}
                                        max={10}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('重试延迟 (ms)', 'Retry Delay (ms)')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.retryDelayMs ?? 1000}
                                        onChange={(e) => setAgentConfig({ ...agentConfig, retryDelayMs: parseInt(e.target.value) || 1000 })}
                                        min={100}
                                        max={10000}
                                        step={100}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 工具执行 */}
                        <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                            <h5 className="text-sm font-medium text-text-primary">
                                {t('工具执行', 'Tool Execution')}
                            </h5>
                            <div>
                                <label className="text-sm text-text-secondary block mb-2">
                                    {t('工具超时时间 (ms)', 'Tool Timeout (ms)')}
                                </label>
                                <Input
                                    type="number"
                                    value={agentConfig.toolTimeoutMs ?? 60000}
                                    onChange={(e) => setAgentConfig({ ...agentConfig, toolTimeoutMs: parseInt(e.target.value) || 60000 })}
                                    min={10000}
                                    max={300000}
                                    step={5000}
                                    className="w-full max-w-xs"
                                />
                                <p className="text-xs text-text-muted mt-1">
                                    {t('单个工具执行的最大等待时间', 'Maximum wait time for a single tool execution')}
                                </p>
                            </div>
                        </div>

                        {/* 上下文压缩 */}
                        <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                            <h5 className="text-sm font-medium text-text-primary">
                                {t('上下文压缩', 'Context Compression')}
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('压缩阈值 (字符)', 'Compression Threshold (chars)')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.contextCompressThreshold ?? 40000}
                                        onChange={(e) => setAgentConfig({ ...agentConfig, contextCompressThreshold: parseInt(e.target.value) || 40000 })}
                                        min={20000}
                                        max={200000}
                                        step={10000}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('保留最近轮次', 'Keep Recent Turns')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.keepRecentTurns ?? 3}
                                        onChange={(e) => setAgentConfig({ ...agentConfig, keepRecentTurns: parseInt(e.target.value) || 3 })}
                                        min={1}
                                        max={10}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-text-muted">
                                {t('当上下文超过阈值时，自动压缩旧消息，保留最近的轮次',
                                    'When context exceeds threshold, old messages are compressed while keeping recent turns')}
                            </p>
                        </div>

                        {/* 循环检测 */}
                        <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                            <h5 className="text-sm font-medium text-text-primary">
                                {t('循环检测', 'Loop Detection')}
                            </h5>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('历史记录长度', 'History Length')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.loopDetection?.maxHistory ?? 15}
                                        onChange={(e) => setAgentConfig({
                                            ...agentConfig,
                                            loopDetection: {
                                                ...agentConfig.loopDetection,
                                                maxHistory: parseInt(e.target.value) || 15
                                            }
                                        })}
                                        min={5}
                                        max={50}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('精确重复阈值', 'Exact Repeat Threshold')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.loopDetection?.maxExactRepeats ?? 2}
                                        onChange={(e) => setAgentConfig({
                                            ...agentConfig,
                                            loopDetection: {
                                                ...agentConfig.loopDetection,
                                                maxExactRepeats: parseInt(e.target.value) || 2
                                            }
                                        })}
                                        min={1}
                                        max={10}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary block mb-2">
                                        {t('同目标重复阈值', 'Same Target Threshold')}
                                    </label>
                                    <Input
                                        type="number"
                                        value={agentConfig.loopDetection?.maxSameTargetRepeats ?? 3}
                                        onChange={(e) => setAgentConfig({
                                            ...agentConfig,
                                            loopDetection: {
                                                ...agentConfig.loopDetection,
                                                maxSameTargetRepeats: parseInt(e.target.value) || 3
                                            }
                                        })}
                                        min={1}
                                        max={10}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-text-muted">
                                {t('检测并阻止 Agent 陷入重复操作的循环',
                                    'Detect and prevent Agent from getting stuck in repetitive operation loops')}
                            </p>
                        </div>

                        {/* 忽略目录 */}
                        <div className="p-5 bg-surface/30 rounded-xl border border-border-subtle space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-text-primary">
                                    {t('忽略目录', 'Ignored Directories')}
                                </h5>
                                <Button variant="ghost" size="sm" onClick={resetIgnoredDirs}>
                                    {t('重置为默认', 'Reset to Default')}
                                </Button>
                            </div>
                            <textarea
                                value={ignoredDirsInput}
                                onChange={(e) => handleIgnoredDirsChange(e.target.value)}
                                placeholder="node_modules, .git, dist, build..."
                                className="w-full h-24 p-3 bg-surface/50 rounded-lg border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none text-sm font-mono custom-scrollbar"
                            />
                            <p className="text-xs text-text-muted">
                                {t('目录树和搜索时忽略的目录，用逗号分隔',
                                    'Directories to ignore when building directory tree and searching, separated by commas')}
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {showPreview && selectedTemplateForPreview && (
                <PromptPreviewModal
                    templateId={selectedTemplateForPreview}
                    language={language}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    )
}
