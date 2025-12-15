import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
// import 'xterm/css/xterm.css' // Temporarily disabled for debugging
import { X, Plus, Trash2, ChevronUp, ChevronDown, Terminal as TerminalIcon } from 'lucide-react'
import { useStore } from '../store'
import { t } from '../i18n'

// Manually inject minimal Xterm styles to ensure it renders even if CSS import fails
const XTERM_STYLE = `
.xterm { cursor: text; position: relative; user-select: none; }
.xterm .xterm-helpers { position: absolute; z-index: 5; }
.xterm .xterm-helper-textarea { padding: 0; border: 0; margin: 0; position: absolute; opacity: 0; left: -9999em; top: 0; width: 0; height: 0; z-index: -5; overflow: hidden; white-space: nowrap; }
.xterm .composition-view { background: #000; color: #FFF; display: none; position: absolute; white-space: pre; z-index: 1; }
.xterm .composition-view.active { display: block; }
.xterm .xterm-viewport { background-color: #18181b; overflow-y: scroll; cursor: default; position: absolute; right: 0; left: 0; top: 0; bottom: 0; }
.xterm .xterm-screen { position: relative; }
.xterm .xterm-screen canvas { position: absolute; left: 0; top: 0; }
.xterm .xterm-scroll-area { visibility: hidden; }
.xterm-char-measure-element { display: inline-block; visibility: hidden; position: absolute; left: -9999em; top: 0; }
.xterm.enable-mouse-events { cursor: default; }
.xterm.xterm-cursor-pointer { cursor: pointer; }
.xterm.xterm-cursor-crosshair { cursor: crosshair; }
.xterm .xterm-accessibility, .xterm .xterm-message-overlay { position: absolute; left: 0; top: 0; bottom: 0; right: 0; z-index: 10; color: transparent; }
.xterm-live-region { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.xterm-dim { opacity: 0.5; }
.xterm-underline { text-decoration: underline; }
`

export default function TerminalPanel() {
  const { terminalVisible, setTerminalVisible, language, workspacePath } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Initialize Terminal - only when visible and container is ready
  useEffect(() => {
    console.log('[Terminal] Effect triggered. Visible:', terminalVisible, 'Container:', !!containerRef.current)
    
    // Don't initialize if not visible
    if (!terminalVisible) {
        return
    }
    
    if (!containerRef.current) {
        console.warn('[Terminal] Container ref is null, deferring init')
        return
    }
    
    if (terminalRef.current) {
        console.log('[Terminal] Already initialized')
        return
    }

    try {
        console.log('[Terminal] Initializing Xterm...')
        const term = new XTerminal({
          cursorBlink: true,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          lineHeight: 1.2,
          letterSpacing: 0,
          theme: {
            background: '#18181b',
            foreground: '#e4e4e7',
            cursor: '#3b82f6',
            selectionBackground: 'rgba(59, 130, 246, 0.3)',
            black: '#18181b',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#eab308',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#ffffff',
            brightBlack: '#71717a',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#facc15',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff',
          },
          allowProposedApi: true
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()
        
        term.loadAddon(fitAddon)
        term.loadAddon(webLinksAddon)
        
        term.open(containerRef.current)
        console.log('[Terminal] Xterm opened')
        
        // Immediate fit try
        try { fitAddon.fit() } catch (e) { console.warn('Initial fit failed', e) }

        terminalRef.current = term
        fitAddonRef.current = fitAddon

        // Create backend terminal process
        console.log('[Terminal] Requesting backend process...')
        window.electronAPI.createTerminal({ cwd: workspacePath || undefined }).then((success) => {
            console.log('[Terminal] Backend process started:', success)
            if (success) {
                setIsReady(true)
                term.focus()
                window.electronAPI.writeTerminal('\r') // Wake up prompt
            } else {
                term.write('\r\nFailed to start shell.\r\n')
            }
        })

        // Input handling
        term.onData((data) => {
            window.electronAPI.writeTerminal(data)
        })

        // Output handling
        const unsubscribe = window.electronAPI.onTerminalData((data) => {
            term.write(data)
        })

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (!isCollapsed && terminalVisible) {
                try { fitAddon.fit() } catch {}
            }
        })
        resizeObserver.observe(containerRef.current)

        // Window resize handler
        const handleResize = () => { try { fitAddon.fit() } catch {} }
        window.addEventListener('resize', handleResize)

        // Store cleanup function
        return () => {
            console.log('[Terminal] Cleaning up')
            unsubscribe()
            resizeObserver.disconnect()
            window.removeEventListener('resize', handleResize)
            
            // Allow time for cleanup before killing to avoid errors? No, sync is better.
            try {
                term.dispose()
            } catch (e) {
                console.error('Error disposing terminal', e)
            }
            
            window.electronAPI.killTerminal()
            terminalRef.current = null
        }
    } catch (error) {
        console.error('[Terminal] Initialization Error:', error)
    }
  }, [workspacePath, terminalVisible]) // Re-init if workspace changes or becomes visible

  // Re-fit when visibility changes
  useEffect(() => {
      if (terminalVisible && !isCollapsed && fitAddonRef.current) {
          setTimeout(() => {
              try {
                  fitAddonRef.current?.fit()
                  terminalRef.current?.focus()
              } catch {}
          }, 100)
      }
  }, [terminalVisible, isCollapsed])

  const handleCreate = async () => {
      console.log('[Terminal] handleCreate clicked', { ref: !!terminalRef.current })
      
      // If ref is missing, try to force a re-mount by toggling specific state or just log
      if (!terminalRef.current) {
          console.error('[Terminal] Ref is missing, cannot reset. Is the panel visible?')
          return
      }
      
      terminalRef.current.write('\r\n\x1b[33mStarting new terminal session...\x1b[0m\r\n')
      
      try {
          await window.electronAPI.createTerminal({ cwd: workspacePath || undefined })
          terminalRef.current.clear()
          fitAddonRef.current?.fit() 
          terminalRef.current.focus()
          window.electronAPI.writeTerminal('\r')
      } catch (e) {
          terminalRef.current.write(`\r\n\x1b[31mError creating terminal: ${e}\x1b[0m\r\n`)
      }
  }

  const handleClear = () => {
      terminalRef.current?.clear()
      terminalRef.current?.focus()
  }

  if (!terminalVisible) return null

  return (
    <>
    <style>{XTERM_STYLE}</style>
    <div className={`
        bg-background-secondary border-t border-border-subtle flex flex-col transition-all duration-300 relative z-10
        ${isCollapsed ? 'h-9' : 'h-64'}
    `}>
      {/* Header */}
      <div className="h-9 min-h-[36px] px-3 flex items-center justify-between border-b border-border-subtle bg-background-secondary select-none">
         <div 
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setIsCollapsed(!isCollapsed)}
         >
             <div className="flex items-center gap-2 text-xs font-medium text-text-primary px-1">
                 <TerminalIcon className="w-3.5 h-3.5" />
                 {t('terminal', language)}
             </div>
         </div>

         <div className="flex items-center gap-1">
             <button onClick={handleCreate} className="p-2 hover:bg-surface-active rounded transition-colors text-text-muted hover:text-text-primary" title={t('newTerminal', language)}>
                 <Plus className="w-3.5 h-3.5" />
             </button>
             <button onClick={handleClear} className="p-2 hover:bg-surface-active rounded transition-colors text-text-muted hover:text-text-primary" title={t('clearTerminal', language)}>
                 <Trash2 className="w-3.5 h-3.5" />
             </button>
             <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-surface-active rounded transition-colors text-text-muted hover:text-text-primary">
                 {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
             </button>
             <div className="w-px h-3 bg-border-subtle mx-1" />
             <button onClick={() => setTerminalVisible(false)} className="p-2 hover:bg-surface-active rounded transition-colors text-text-muted hover:text-text-primary" title={t('closeTerminal', language)}>
                 <X className="w-3.5 h-3.5" />
             </button>
         </div>
      </div>

      {/* Terminal Container */}
      <div className={`flex-1 p-0 min-h-0 relative overflow-hidden bg-[#18181b] ${isCollapsed ? 'hidden' : 'block'}`}>
          <div ref={containerRef} className="h-full w-full pl-2 pt-1" />
      </div>
    </div>
    </>
  )
}
