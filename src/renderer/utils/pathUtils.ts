/**
 * 路径处理工具函数
 * 统一处理跨平台路径操作
 */

/**
 * 检测路径分隔符
 */
export function getPathSeparator(path: string): string {
  return path.includes('\\') ? '\\' : '/'
}

/**
 * 拼接路径
 */
export function joinPath(...parts: string[]): string {
  if (parts.length === 0) return ''
  const sep = getPathSeparator(parts[0])
  return parts
    .filter(Boolean)
    .join(sep)
    .replace(/[/\\]+/g, sep)
}

/**
 * 将相对路径转换为完整路径
 */
export function toFullPath(relativePath: string, workspacePath: string | null): string {
  if (!workspacePath) return relativePath
  // 已经是绝对路径
  if (relativePath.startsWith('/') || /^[a-zA-Z]:/.test(relativePath)) {
    return relativePath
  }
  const sep = getPathSeparator(workspacePath)
  return `${workspacePath}${sep}${relativePath}`
}

/**
 * 将完整路径转换为相对路径
 */
export function toRelativePath(fullPath: string, workspacePath: string | null): string {
  if (!workspacePath) return fullPath
  const normalizedFull = normalizePath(fullPath)
  const normalizedWorkspace = normalizePath(workspacePath)
  if (normalizedFull.startsWith(normalizedWorkspace)) {
    let relative = fullPath.slice(workspacePath.length)
    // 移除开头的分隔符
    if (relative.startsWith('/') || relative.startsWith('\\')) {
      relative = relative.slice(1)
    }
    return relative
  }
  return fullPath
}

/**
 * 规范化路径（用于比较）
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

/**
 * 获取文件名
 */
export function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || ''
}

/**
 * 获取目录路径
 */
export function getDirPath(path: string): string {
  const lastSepIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return lastSepIndex > 0 ? path.substring(0, lastSepIndex) : ''
}

/**
 * 获取文件扩展名
 */
export function getExtension(path: string): string {
  const fileName = getFileName(path)
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : ''
}

/**
 * 检查路径是否匹配（支持通配符）
 */
export function pathMatches(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path)
  const normalizedPattern = normalizePath(pattern)
  
  // 简单的通配符匹配
  if (normalizedPattern.includes('*')) {
    const regex = new RegExp(
      '^' + normalizedPattern.replace(/\*/g, '.*') + '$'
    )
    return regex.test(normalizedPath)
  }
  
  return normalizedPath === normalizedPattern || 
         normalizedPath.endsWith('/' + normalizedPattern)
}

/**
 * 解析 import 路径为实际文件路径
 */
export function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  workspacePath: string
): string {
  const sep = getPathSeparator(currentFilePath)
  const currentDir = getDirPath(currentFilePath)
  
  // 相对路径
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const parts = [...currentDir.split(/[/\\]/), ...importPath.split(/[/\\]/)]
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '..') resolved.pop()
      else if (part !== '.' && part !== '') resolved.push(part)
    }
    return resolved.join(sep)
  }
  
  // 别名路径 @/ 或 ~/
  if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
    return joinPath(workspacePath, importPath.slice(2))
  }
  
  // 尝试从 src 目录查找
  if (!importPath.startsWith('/')) {
    return joinPath(workspacePath, 'src', importPath)
  }
  
  return importPath
}
