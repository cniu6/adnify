/**
 * UI 相关状态切片
 */
import { StateCreator } from 'zustand'

export type SidePanel = 'explorer' | 'search' | 'git' | 'settings' | null

export interface DiffView {
  original: string
  modified: string
  filePath: string
}

export interface UISlice {
  // State
  activeSidePanel: SidePanel
  activeDiff: DiffView | null
  terminalOutput: string[]
  terminalVisible: boolean

  // Actions
  setActiveSidePanel: (panel: SidePanel) => void
  setActiveDiff: (diff: DiffView | null) => void
  addTerminalOutput: (output: string) => void
  clearTerminal: () => void
  setTerminalVisible: (visible: boolean) => void
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // Initial state
  activeSidePanel: 'explorer',
  activeDiff: null,
  terminalOutput: [],
  terminalVisible: false,

  // Actions
  setActiveSidePanel: (panel) => set({ activeSidePanel: panel }),
  setActiveDiff: (diff) => set({ activeDiff: diff }),

  addTerminalOutput: (output) =>
    set((state) => ({
      terminalOutput: [...state.terminalOutput, output],
    })),

  clearTerminal: () => set({ terminalOutput: [] }),
  setTerminalVisible: (visible) => set({ terminalVisible: visible }),
})
