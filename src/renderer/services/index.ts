/**
 * 服务层统一导出
 */

// 分组的 Electron API（推荐使用）
export { api, getAPI, type GroupedElectronAPI } from './electronAPI'

// 初始化服务
export { initializeApp, registerSettingsSync, type InitResult } from './initService'

// 其他服务按需导出
export { adnifyDir } from './adnifyDirService'
export { keybindingService } from './keybindingService'
export { mcpService } from './mcpService'
export { terminalManager } from './TerminalManager'
export { workspaceManager } from './WorkspaceManager'
