import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeTool } from '../src/renderer/agent/core/ToolExecutor'
import { AgentService } from '../src/renderer/agent/core/AgentService'

// Mock dependencies
vi.mock('../src/renderer/agent/core/AgentService', () => ({
    AgentService: {
        hasReadFile: vi.fn(),
        addReadFile: vi.fn()
    }
}))

// Mock window.electronAPI
const mockElectronAPI = {
    readFile: vi.fn(),
    writeFile: vi.fn()
}
global.window = {
    electronAPI: mockElectronAPI
} as any

describe('replace_file_content tool', () => {
    const mockPath = '/test/file.ts'
    const initialContent = `line 1
line 2
line 3
line 4
line 5`

    beforeEach(() => {
        vi.resetAllMocks()
        // Mock AgentService.hasReadFile to always return true
        vi.mocked(AgentService.hasReadFile).mockReturnValue(true)
        // Mock electronAPI.writeFile to return true (success)
        mockElectronAPI.writeFile.mockResolvedValue(true)
    })

    it('should replace a single line correctly', async () => {
        mockElectronAPI.readFile.mockResolvedValue(initialContent)

        const args = {
            path: mockPath,
            start_line: 3,
            end_line: 3,
            content: 'line 3 modified'
        }

        const result = await executeTool('replace_file_content', args)
        expect(result.success).toBe(true)

        expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            `line 1
line 2
line 3 modified
line 4
line 5`
        )
    })

    it('should replace multiple lines correctly', async () => {
        mockElectronAPI.readFile.mockResolvedValue(initialContent)

        const args = {
            path: mockPath,
            start_line: 2,
            end_line: 4,
            content: 'new content\nspanning multiple lines'
        }

        const result = await executeTool('replace_file_content', args)
        expect(result.success).toBe(true)

        expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            `line 1
new content
spanning multiple lines
line 5`
        )
    })

    it('should handle start_line = 1 correctly', async () => {
        mockElectronAPI.readFile.mockResolvedValue(initialContent)

        const args = {
            path: mockPath,
            start_line: 1,
            end_line: 2,
            content: 'header'
        }

        const result = await executeTool('replace_file_content', args)
        expect(result.success).toBe(true)

        expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            `header
line 3
line 4
line 5`
        )
    })

    it('should handle replacing until the end of file', async () => {
        mockElectronAPI.readFile.mockResolvedValue(initialContent)

        const args = {
            path: mockPath,
            start_line: 4,
            end_line: 5,
            content: 'footer'
        }

        const result = await executeTool('replace_file_content', args)
        expect(result.success).toBe(true)

        expect(mockElectronAPI.writeFile).toHaveBeenCalledWith(
            expect.any(String),
            `line 1
line 2
line 3
footer`
        )
    })

    it('should return error if start_line > end_line', async () => {
        const args = {
            path: mockPath,
            start_line: 5,
            end_line: 3,
            content: 'invalid'
        }

        const result = await executeTool('replace_file_content', args)
        expect(result.success).toBe(false)
        expect(result.error).toContain('start_line must be <= end_line')
    })
})
