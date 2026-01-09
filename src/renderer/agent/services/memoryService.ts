/**
 * AI 记忆服务
 * 
 * 参考主流工具实现：
 * - Cursor Notepad: 用户手动添加，全量注入
 * - Claude Code Memory: /remember 命令，全量注入
 * - Windsurf Memory: 全量注入
 * 
 * 设计原则：
 * 1. 简单直接：用户手动添加记忆，全量注入到上下文
 * 2. 不做智能匹配：避免不可靠的关键词/语义匹配
 * 3. 项目级存储：.adnify/memory.json
 */

import { api } from '@/renderer/services/electronAPI'
import { logger } from '@utils/Logger'
import { useStore } from '@store'
import { joinPath } from '@shared/utils/pathUtils'

// ============================================
// 类型定义
// ============================================

/** 单条记忆 */
export interface MemoryItem {
  id: string
  content: string
  createdAt: number
  enabled: boolean
}

/** 记忆存储结构 */
export interface MemoryStore {
  version: number
  items: MemoryItem[]
}

// ============================================
// 记忆服务
// ============================================

class MemoryService {
  private cache: MemoryStore | null = null
  private readonly MEMORY_FILE = '.adnify/memory.json'
  private readonly CURRENT_VERSION = 1
  private readonly MAX_ITEMS = 50

  /**
   * 获取所有启用的记忆
   */
  async getMemories(): Promise<MemoryItem[]> {
    const store = await this.loadStore()
    return store.items.filter(item => item.enabled)
  }

  /**
   * 获取所有记忆（包括禁用的）
   */
  async getAllMemories(): Promise<MemoryItem[]> {
    const store = await this.loadStore()
    return store.items
  }

  /**
   * 添加记忆
   */
  async addMemory(content: string): Promise<MemoryItem> {
    const store = await this.loadStore()
    
    const existing = store.items.find(item => 
      item.content.trim() === content.trim()
    )
    if (existing) {
      return existing
    }

    const newItem: MemoryItem = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: Date.now(),
      enabled: true,
    }

    store.items.unshift(newItem)
    
    if (store.items.length > this.MAX_ITEMS) {
      store.items.pop()
    }

    await this.saveStore(store)
    logger.agent.info('[MemoryService] Added memory:', newItem.id)
    return newItem
  }

  /**
   * 更新记忆
   */
  async updateMemory(id: string, updates: Partial<Pick<MemoryItem, 'content' | 'enabled'>>): Promise<boolean> {
    const store = await this.loadStore()
    const item = store.items.find(i => i.id === id)
    if (!item) return false

    if (updates.content !== undefined) {
      item.content = updates.content.trim()
    }
    if (updates.enabled !== undefined) {
      item.enabled = updates.enabled
    }
    
    await this.saveStore(store)
    return true
  }

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<boolean> {
    const store = await this.loadStore()
    const idx = store.items.findIndex(i => i.id === id)
    if (idx === -1) return false

    store.items.splice(idx, 1)
    await this.saveStore(store)
    return true
  }

  /**
   * 构建记忆提示词（全量注入）
   */
  buildMemoryPrompt(memories: MemoryItem[]): string {
    const enabledMemories = memories.filter(m => m.enabled)
    if (enabledMemories.length === 0) return ''

    const lines = enabledMemories.map(m => `- ${m.content}`).join('\n')
    
    return `<memory>
Important facts and preferences for this project:

${lines}
</memory>`
  }

  /**
   * 清空所有记忆
   */
  async clearAll(): Promise<void> {
    const store: MemoryStore = {
      version: this.CURRENT_VERSION,
      items: [],
    }
    await this.saveStore(store)
    this.cache = null
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null
  }

  private async loadStore(): Promise<MemoryStore> {
    if (this.cache) return this.cache

    const { workspacePath } = useStore.getState()
    if (!workspacePath) {
      return this.createEmptyStore()
    }

    const filePath = joinPath(workspacePath, this.MEMORY_FILE)
    const content = await api.file.read(filePath)

    if (!content) {
      return this.createEmptyStore()
    }

    try {
      const store = JSON.parse(content) as MemoryStore
      this.cache = store
      return store
    } catch {
      logger.agent.warn('[MemoryService] Failed to parse memory file')
      return this.createEmptyStore()
    }
  }

  private async saveStore(store: MemoryStore): Promise<void> {
    const { workspacePath } = useStore.getState()
    if (!workspacePath) return

    this.cache = store

    const filePath = joinPath(workspacePath, this.MEMORY_FILE)
    const content = JSON.stringify(store, null, 2)
    
    await api.file.write(filePath, content)
  }

  private createEmptyStore(): MemoryStore {
    return {
      version: this.CURRENT_VERSION,
      items: [],
    }
  }
}

export const memoryService = new MemoryService()
