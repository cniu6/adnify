/**
 * 渲染进程更新服务
 */

import { api } from './electronAPI'

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: string
  releaseDate?: string
  downloadUrl?: string
  progress?: number
  error?: string
  isPortable: boolean
}

class UpdaterService {
  private listeners: Set<(status: UpdateStatus) => void> = new Set()
  private currentStatus: UpdateStatus | null = null
  private unsubscribe: (() => void) | null = null

  /**
   * 初始化更新服务
   */
  initialize(): void {
    // 监听主进程的状态更新
    this.unsubscribe = api.updater.onStatus((status: UpdateStatus) => {
      this.currentStatus = status
      this.notifyListeners(status)
    })

    // 获取初始状态
    this.getStatus()
  }

  /**
   * 检查更新
   */
  async checkForUpdates(): Promise<UpdateStatus> {
    const status = await api.updater.check()
    this.currentStatus = status
    return status
  }

  /**
   * 获取当前状态
   */
  async getStatus(): Promise<UpdateStatus> {
    const status = await api.updater.getStatus()
    this.currentStatus = status
    return status
  }

  /**
   * 下载更新（仅安装版）
   */
  async downloadUpdate(): Promise<UpdateStatus> {
    const status = await api.updater.download()
    this.currentStatus = status
    return status
  }

  /**
   * 安装更新并重启（仅安装版）
   */
  installAndRestart(): void {
    api.updater.install()
  }

  /**
   * 打开下载页面（便携版）
   */
  openDownloadPage(url?: string): void {
    api.updater.openDownloadPage(url)
  }

  /**
   * 获取缓存的状态
   */
  getCachedStatus(): UpdateStatus | null {
    return this.currentStatus
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: (status: UpdateStatus) => void): () => void {
    this.listeners.add(callback)
    
    // 如果有缓存状态，立即通知
    if (this.currentStatus) {
      callback(this.currentStatus)
    }

    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 清理
   */
  destroy(): void {
    this.unsubscribe?.()
    this.listeners.clear()
  }

  private notifyListeners(status: UpdateStatus): void {
    this.listeners.forEach(cb => cb(status))
  }
}

export const updaterService = new UpdaterService()
