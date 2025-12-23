/**
 * 工具模块入口
 * 
 * 统一从 toolDefinitions.ts 导出所有工具相关定义
 * schemas.ts 已被合并到 toolDefinitions.ts，保留文件以兼容历史引用
 */

// 从统一的工具定义文件导出所有内容
export * from '../core/toolDefinitions'

// 兼容性：schemas.ts 仍然存在，但所有新代码应该使用 toolDefinitions.ts
