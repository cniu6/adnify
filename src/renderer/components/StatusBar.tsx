import { GitBranch, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useStore } from '../store'

export default function StatusBar() {
  const { language, activeFilePath, isStreaming } = useStore()

  return (
    <div className="h-6 bg-background-secondary border-t border-border-subtle flex items-center justify-between px-3 text-[11px] select-none text-text-muted">
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 hover:text-text-primary transition-colors">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </button>
        
        {/* Diagnostics Placeholder */}
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer">
                <XCircle className="w-3 h-3" />
                <span>0</span>
            </div>
             <div className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer">
                <AlertCircle className="w-3 h-3" />
                <span>0</span>
            </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isStreaming && (
            <div className="flex items-center gap-2 text-accent">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>AI Processing...</span>
            </div>
        )}
        
        <div className="flex items-center gap-4">
             {activeFilePath && (
                <span>{activeFilePath.split('.').pop()?.toUpperCase() || 'TXT'}</span>
             )}
            <span className="cursor-pointer hover:text-text-primary">UTF-8</span>
            <div className="flex items-center gap-2 cursor-pointer hover:text-text-primary">
                <span>Ln 1, Col 1</span>
            </div>
        </div>
      </div>
    </div>
  )
}
