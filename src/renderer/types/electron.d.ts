/**
 * Electron API 类型定义
 */

export interface FileItem {
	name: string
	path: string
	isDirectory: boolean
}

export interface LLMStreamChunk {
	type: 'text' | 'reasoning' | 'error'
	content?: string
	error?: string
}

export interface LLMToolCall {
	id: string
	name: string
	arguments: Record<string, any>
}

export interface LLMResult {
	content: string
	reasoning?: string
	toolCalls?: LLMToolCall[]
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
}

export interface LLMError {
	message: string
	code: string
	retryable: boolean
}

export interface ElectronAPI {
	// Window controls
	minimize: () => void
	maximize: () => void
	close: () => void

	// File operations
	openFile: () => Promise<{ path: string; content: string } | null>
	openFolder: () => Promise<string | null>
	readDir: (path: string) => Promise<FileItem[]>
	readFile: (path: string) => Promise<string | null>
	writeFile: (path: string, content: string) => Promise<boolean>
	saveFile: (content: string, path?: string) => Promise<string | null>
	fileExists: (path: string) => Promise<boolean>
	mkdir: (path: string) => Promise<boolean>
	deleteFile: (path: string) => Promise<boolean>

	// Settings
	getSetting: (key: string) => Promise<any>
	setSetting: (key: string, value: any) => Promise<boolean>

	// LLM
	sendMessage: (params: any) => Promise<void>
	abortMessage: () => void
	onLLMStream: (callback: (chunk: LLMStreamChunk) => void) => () => void
	onLLMToolCall: (callback: (toolCall: LLMToolCall) => void) => () => void
	onLLMError: (callback: (error: LLMError) => void) => () => void
	onLLMDone: (callback: (result: LLMResult) => void) => () => void

	// Terminal
	executeCommand: (command: string, cwd?: string) => Promise<{ output: string; errorOutput: string; exitCode: number }>
	killTerminal: () => void
	onTerminalOutput: (callback: (data: string) => void) => () => void
}

declare global {
	interface Window {
		electronAPI: ElectronAPI
	}
}

export {}
