/**
 * 更新相关 IPC handlers
 */

import { ipcMain, shell } from 'electron'
import { updateService } from '../services/updater'

export function registerUpdaterHandlers(): void {
  // 检查更新
  ipcMain.handle('updater:check', async () => {
    return updateService.checkForUpdates()
  })

  // 获取当前状态
  ipcMain.handle('updater:getStatus', () => {
    return updateService.getStatus()
  })

  // 下载更新（仅安装版）
  ipcMain.handle('updater:download', async () => {
    await updateService.downloadUpdate()
    return updateService.getStatus()
  })

  // 安装更新并重启（仅安装版）
  ipcMain.handle('updater:install', () => {
    updateService.quitAndInstall()
  })

  // 打开下载页面（便携版）
  ipcMain.handle('updater:openDownloadPage', (_, url?: string) => {
    const status = updateService.getStatus()
    const targetUrl = url || status.downloadUrl || 'https://github.com/adnaan-worker/adnify/releases/latest'
    shell.openExternal(targetUrl)
  })
}
