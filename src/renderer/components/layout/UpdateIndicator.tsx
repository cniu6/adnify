/**
 * 更新指示器组件
 * 显示在顶部栏，有更新时显示提示
 */

import { useState, useEffect, useRef } from 'react'
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { updaterService, UpdateStatus } from '@services/updaterService'
import { useStore } from '@store'

export default function UpdateIndicator() {
  const { language } = useStore()
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    updaterService.initialize()
    const unsubscribe = updaterService.subscribe(setStatus)
    
    // 立即获取当前状态
    updaterService.getStatus().then(setStatus)
    
    return () => {
      unsubscribe()
    }
  }, [])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

  const handleCheck = async () => {
    await updaterService.checkForUpdates()
  }

  const handleDownload = async () => {
    if (status?.isPortable) {
      updaterService.openDownloadPage()
    } else {
      await updaterService.downloadUpdate()
    }
  }

  const handleInstall = () => {
    updaterService.installAndRestart()
  }

  // 始终显示，让用户可以手动检查更新
  const hasUpdate = status?.status === 'available' || status?.status === 'downloaded'
  const isChecking = status?.status === 'checking'
  const isDownloading = status?.status === 'downloading'
  const isError = status?.status === 'error'

  const t = {
    checking: language === 'zh' ? '检查中...' : 'Checking...',
    available: language === 'zh' ? '有新版本' : 'Update Available',
    downloaded: language === 'zh' ? '准备安装' : 'Ready to Install',
    downloading: language === 'zh' ? '下载中' : 'Downloading',
    notAvailable: language === 'zh' ? '已是最新' : 'Up to date',
    error: language === 'zh' ? '检查失败' : 'Check failed',
    download: language === 'zh' ? '下载更新' : 'Download',
    install: language === 'zh' ? '安装并重启' : 'Install & Restart',
    openPage: language === 'zh' ? '打开下载页' : 'Open Download Page',
    checkNow: language === 'zh' ? '检查更新' : 'Check Now',
    newVersion: language === 'zh' ? '新版本' : 'New Version',
    currentVersion: language === 'zh' ? '当前版本' : 'Current',
    portableHint: language === 'zh' ? '便携版需手动下载' : 'Portable version requires manual download',
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          hasUpdate 
            ? 'text-accent hover:bg-accent/10' 
            : isError 
              ? 'text-red-400 hover:bg-red-400/10'
              : 'text-text-muted hover:text-text-primary hover:bg-white/5'
        }`}
        title={hasUpdate ? t.available : t.checkNow}
      >
        {isChecking || isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : hasUpdate ? (
          <>
            <Download className="w-4 h-4" />
            {/* 小红点 */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
          </>
        ) : isError ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
              <span className="text-sm font-semibold text-text-primary">
                {language === 'zh' ? '软件更新' : 'Software Update'}
              </span>
              <button
                onClick={() => setShowPopover(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* 状态显示 */}
              {status?.status === 'available' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-accent">
                    <Download className="w-5 h-5" />
                    <span className="font-medium">{t.available}</span>
                  </div>
                  <div className="text-sm text-text-secondary">
                    <span className="text-text-muted">{t.newVersion}: </span>
                    <span className="font-mono font-bold text-accent">v{status.version}</span>
                  </div>
                  {status.isPortable && (
                    <p className="text-xs text-text-muted bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      {t.portableHint}
                    </p>
                  )}
                </div>
              )}

              {status?.status === 'downloaded' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{t.downloaded}</span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    v{status.version} {language === 'zh' ? '已下载完成' : 'is ready'}
                  </p>
                </div>
              )}

              {status?.status === 'downloading' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-accent">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-medium">{t.downloading}</span>
                  </div>
                  {status.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${status.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-muted text-right">{status.progress}%</p>
                    </div>
                  )}
                </div>
              )}

              {status?.status === 'not-available' && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t.notAvailable}</span>
                </div>
              )}

              {status?.status === 'error' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{t.error}</span>
                  </div>
                  {status.error && (
                    <p className="text-xs text-text-muted bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {status.error}
                    </p>
                  )}
                </div>
              )}

              {status?.status === 'checking' && (
                <div className="flex items-center gap-2 text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.checking}</span>
                </div>
              )}

              {/* 无状态时显示提示 */}
              {(!status || status.status === 'idle') && (
                <div className="flex items-center gap-2 text-text-muted">
                  <RefreshCw className="w-5 h-5" />
                  <span>{language === 'zh' ? '点击检查更新' : 'Click to check for updates'}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                {status?.status === 'available' && (
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {status.isPortable ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        {t.openPage}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {t.download}
                      </>
                    )}
                  </button>
                )}

                {status?.status === 'downloaded' && (
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.install}
                  </button>
                )}

                {(!status || status.status === 'not-available' || status.status === 'error' || status.status === 'idle') && (
                  <button
                    onClick={handleCheck}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface hover:bg-white/10 border border-border rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.checkNow}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
