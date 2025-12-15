import { Minus, Square, X, Settings, Command } from 'lucide-react'
import { useStore } from '../store'
import { t } from '../i18n'

export default function TitleBar() {
  const { setShowSettings, language } = useStore()

  return (
    <div className="h-10 bg-background flex items-center justify-between px-3 drag-region select-none">
      {/* Window Controls (Mac-like or Windows-like based on preference, keeping right-side for now) */}
      
      {/* Left Spacer / Logo */}
      <div className="flex items-center gap-2 no-drag w-1/3">
        {/* <div className="w-3 h-3 rounded-full bg-accent/50" /> */}
        <span className="text-xs font-medium text-text-muted tracking-wide opacity-50 hover:opacity-100 transition-opacity">ADNIFY</span>
      </div>

      {/* Center - Command Palette / Search Trigger Placeholder */}
      <div className="flex-1 flex justify-center no-drag">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-surface border border-border-subtle hover:border-border-highlight hover:bg-surface-hover transition-all cursor-pointer group w-64 justify-center">
            <Command className="w-3 h-3 text-text-muted group-hover:text-text-primary" />
            <span className="text-xs text-text-muted group-hover:text-text-primary">Search files...</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center justify-end gap-1 no-drag w-1/3">
        <button
          onClick={() => window.electronAPI.minimize()}
          className="p-2 rounded-md hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          className="p-2 rounded-md hover:bg-surface-hover transition-colors text-text-muted hover:text-text-primary"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors text-text-muted group"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
