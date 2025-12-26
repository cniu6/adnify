/**
 * Agent 配置管理
 * 集中管理 Agent 运行时配置
 * 
 * 使用 src/shared/config/agentConfig.ts 作为配置源
 */

import { useStore } from '@store'
import {
    DEFAULT_AGENT_CONFIG,
    getReadOnlyTools,
    type AgentRuntimeConfig,
} from '@/shared/config/agentConfig'
import { LLMToolCall } from '@/renderer/types/electron'

// 重新导出类型
export type { AgentRuntimeConfig }

/**
 * 从 store 获取动态配置
 * 合并用户配置和默认配置
 */
export function getAgentConfig(): AgentRuntimeConfig {
    const agentConfig = useStore.getState().agentConfig || {}
    return {
        // 基础配置
        maxToolLoops: agentConfig.maxToolLoops ?? DEFAULT_AGENT_CONFIG.maxToolLoops,
        maxHistoryMessages: agentConfig.maxHistoryMessages ?? DEFAULT_AGENT_CONFIG.maxHistoryMessages,

        // 上下文限制
        maxToolResultChars: agentConfig.maxToolResultChars ?? DEFAULT_AGENT_CONFIG.maxToolResultChars,
        maxFileContentChars: agentConfig.maxFileContentChars ?? DEFAULT_AGENT_CONFIG.maxFileContentChars,
        maxTotalContextChars: agentConfig.maxTotalContextChars ?? DEFAULT_AGENT_CONFIG.maxTotalContextChars,
        maxSingleFileChars: (agentConfig as any).maxSingleFileChars ?? DEFAULT_AGENT_CONFIG.maxSingleFileChars,

        // 重试配置（从 store 获取）
        maxRetries: (agentConfig as any).maxRetries ?? DEFAULT_AGENT_CONFIG.maxRetries,
        retryDelayMs: (agentConfig as any).retryDelayMs ?? DEFAULT_AGENT_CONFIG.retryDelayMs,
        retryBackoffMultiplier: DEFAULT_AGENT_CONFIG.retryBackoffMultiplier,

        // 工具执行超时
        toolTimeoutMs: (agentConfig as any).toolTimeoutMs ?? DEFAULT_AGENT_CONFIG.toolTimeoutMs,

        // 上下文压缩阈值
        contextCompressThreshold: (agentConfig as any).contextCompressThreshold ?? DEFAULT_AGENT_CONFIG.contextCompressThreshold,
        keepRecentTurns: (agentConfig as any).keepRecentTurns ?? DEFAULT_AGENT_CONFIG.keepRecentTurns,

        // 循环检测配置（从 store 获取）
        loopDetection: {
            maxHistory: (agentConfig as any).loopDetection?.maxHistory ?? DEFAULT_AGENT_CONFIG.loopDetection.maxHistory,
            maxExactRepeats: (agentConfig as any).loopDetection?.maxExactRepeats ?? DEFAULT_AGENT_CONFIG.loopDetection.maxExactRepeats,
            maxSameTargetRepeats: (agentConfig as any).loopDetection?.maxSameTargetRepeats ?? DEFAULT_AGENT_CONFIG.loopDetection.maxSameTargetRepeats,
        },

        // 忽略目录（从 store 获取）
        ignoredDirectories: (agentConfig as any).ignoredDirectories ?? DEFAULT_AGENT_CONFIG.ignoredDirectories,
    }
}

/**
 * 只读工具列表（可并行执行）
 * 从配置中心动态获取
 */
export const READ_TOOLS: readonly string[] = getReadOnlyTools()

/**
 * 可重试的错误代码
 */
export const RETRYABLE_ERROR_CODES = new Set([
  'RATE_LIMIT',
  'TIMEOUT',
  'NETWORK_ERROR',
  'SERVER_ERROR',
])

/**
 * 可重试的错误模式
 */
export const RETRYABLE_ERROR_PATTERNS = [
  /timeout/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /network/i,
  /temporarily unavailable/i,
  /rate limit/i,
  /429/,
  /503/,
  /502/,
]

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: string): boolean {
  return RETRYABLE_ERROR_PATTERNS.some(pattern => pattern.test(error))
}

// ===== 循环检测器 =====

interface ToolCallSignature {
  name: string
  keyParam: string | null
  argsHash: string
  timestamp: number
}

interface LoopCheckResult {
  isLoop: boolean
  reason?: string
}

/**
 * 增强的循环检测器
 * 支持多种检测策略：
 * 1. 精确重复检测 - 完全相同的工具调用
 * 2. 语义重复检测 - 相同工具+相同目标文件
 * 3. 模式检测 - 检测 A→B→A→B 等循环模式
 */
export class LoopDetector {
  private history: ToolCallSignature[] = []

  /** 获取当前配置（动态获取，支持运行时修改） */
  private get config() {
    return getAgentConfig().loopDetection
  }

  /**
   * 检查是否存在循环
   */
  checkLoop(toolCalls: LLMToolCall[]): LoopCheckResult {
    const signatures = toolCalls.map(tc => this.createSignature(tc))

    // 1. 精确重复检测（完全相同的调用）
    const exactResult = this.checkExactRepeat(signatures)
    if (exactResult.isLoop) return exactResult

    // 2. 同目标重复检测（相同工具+相同文件/命令）
    const targetResult = this.checkSameTargetRepeat(signatures)
    if (targetResult.isLoop) return targetResult

    // 3. 模式检测（A→B→A→B）
    const patternResult = this.checkPatternLoop(signatures)
    if (patternResult.isLoop) return patternResult

    // 记录本次调用
    this.history.push(...signatures)
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(-this.config.maxHistory)
    }

    return { isLoop: false }
  }

  /**
   * 创建工具调用签名
   */
  private createSignature(tc: LLMToolCall): ToolCallSignature {
    const args = tc.arguments as Record<string, unknown>
    return {
      name: tc.name,
      keyParam: (args.path || args.file || args.command || args.query || null) as string | null,
      argsHash: this.hashArgs(tc.arguments),
      timestamp: Date.now(),
    }
  }

  /**
   * 参数哈希
   */
  private hashArgs(args: Record<string, unknown>): string {
    const normalized = JSON.stringify(args, Object.keys(args).sort())
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 精确重复检测
   */
  private checkExactRepeat(signatures: ToolCallSignature[]): LoopCheckResult {
    for (const sig of signatures) {
      const exactMatches = this.history.filter(
        h => h.name === sig.name && h.argsHash === sig.argsHash
      )
      if (exactMatches.length >= this.config.maxExactRepeats) {
        return {
          isLoop: true,
          reason: `Detected exact repeat of ${sig.name} (${exactMatches.length + 1} times).`,
        }
      }
    }
    return { isLoop: false }
  }

  /**
   * 同目标重复检测
   * 检测相同工具对相同文件/路径的重复操作
   */
  private checkSameTargetRepeat(signatures: ToolCallSignature[]): LoopCheckResult {
    for (const sig of signatures) {
      if (!sig.keyParam) continue

      // 统计历史中相同工具+相同目标的调用次数
      const sameTargetCalls = this.history.filter(
        h => h.name === sig.name && h.keyParam === sig.keyParam
      )

      // 写操作更严格
      const isWriteOp = ['edit_file', 'write_file', 'run_command'].includes(sig.name)
      const threshold = isWriteOp ? 2 : this.config.maxSameTargetRepeats

      if (sameTargetCalls.length >= threshold) {
        return {
          isLoop: true,
          reason: `Detected repeated ${sig.name} on "${sig.keyParam}" (${sameTargetCalls.length + 1} times).`,
        }
      }
    }
    return { isLoop: false }
  }

  /**
   * 模式循环检测
   * 检测 A→B→A→B 或 A→B→C→A→B→C 等模式
   */
  private checkPatternLoop(newSignatures: ToolCallSignature[]): LoopCheckResult {
    // 将新签名加入临时历史进行检测
    const tempHistory = [...this.history, ...newSignatures]
    if (tempHistory.length < 4) return { isLoop: false }

    // 检测长度为 2 和 3 的循环模式
    for (const patternLen of [2, 3]) {
      if (tempHistory.length < patternLen * 2) continue

      const recent = tempHistory.slice(-patternLen * 2)
      const firstHalf = recent.slice(0, patternLen)
      const secondHalf = recent.slice(patternLen)

      const isPattern = firstHalf.every((sig, i) =>
        sig.name === secondHalf[i].name && sig.argsHash === secondHalf[i].argsHash
      )

      if (isPattern) {
        const pattern = firstHalf.map(s => s.name).join(' → ')
        return {
          isLoop: true,
          reason: `Detected repeating pattern: ${pattern}.`,
        }
      }
    }

    return { isLoop: false }
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.history = []
  }
}
