# Adnify：我开发的 AI 原生代码编辑器正式发布了！

> 历时数月开发，Adnify 终于迎来了首个公开版本。这是一款将 AI 能力深度融入编辑器的桌面应用，希望能为开发者带来全新的编程体验。

![主界面截图]

## 为什么要做 Adnify？

市面上的 AI 编辑器要么是 VS Code 插件形式，要么是纯 Web 应用。我想做一个**原生桌面应用**，让 AI 不只是一个聊天窗口，而是真正能理解代码、操作文件、执行命令的**智能助手**。

Adnify 的目标很简单：**让 AI 成为你的编程搭档，而不是一个需要复制粘贴的问答机器人。**

## 核心特性

### 🤖 三种 AI 工作模式

![AI 面板截图]

- **Chat 模式**：纯对话，快速问答，不执行任何操作
- **Agent 模式**：AI 拥有完整的文件系统和终端权限，可以直接帮你写代码、运行命令
- **Plan 模式**：先规划再执行，适合复杂任务，每一步都可以审核

### 🛠️ 22 个内置 AI 工具

AI 不只是能聊天，它可以：

| 工具 | 功能 |
|------|------|
| `read_file` / `write_file` | 读写文件 |
| `edit_file` | 智能编辑，支持搜索替换 |
| `run_command` | 执行终端命令 |
| `codebase_search` | 语义搜索整个代码库 |
| `go_to_definition` | 跳转到定义 |
| `find_references` | 查找引用 |
| `web_search` | 联网搜索 |
| ... | 还有更多 |

### ⚡ 秒级启动

![启动时间截图]

冷启动 **< 400ms**，这对于一个 Electron 应用来说相当不错。主要优化：

- 主进程窗口立即显示
- 延迟加载非关键模块
- V8 代码缓存
- React.lazy 组件懒加载
- localStorage 缓存设置/主题/快捷键

### 🎨 四套精心设计的主题

![主题切换截图]

- **Adnify Dark** - 默认深色主题，柔和护眼
- **Midnight** - 深邃午夜蓝
- **Cyberpunk** - 霓虹赛博朋克风
- **Dawn** - 明亮日间主题

全局采用毛玻璃风格，配合流光边框和动态阴影。

### 📝 智能上下文引用

在对话中使用 `@` 引用上下文：

```
@文件名     → 引用指定文件
@codebase   → 语义搜索代码库
@git        → 引用 Git 变更
@terminal   → 引用终端输出
@symbols    → 引用当前文件符号
@web        → 启用网络搜索
```

### 🔒 本地优先，隐私安全

- 代码索引本地存储
- 支持 Ollama 本地模型
- 工作区隔离
- 敏感路径保护
- 命令白名单
- 完整审计日志

### ⏪ 检查点系统

![检查点截图]

AI 操作前自动创建检查点，一键回滚到任意消息。大胆尝试，无后顾之忧。

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33 | 桌面应用框架 |
| React 18 | UI 框架 |
| TypeScript 5 | 类型安全 |
| Monaco Editor | 代码编辑器内核 |
| xterm.js | 终端模拟器 |
| Zustand | 状态管理 |
| LanceDB | 向量数据库（语义搜索） |

## 支持的 LLM

- OpenAI (GPT-4o, GPT-4, GPT-3.5)
- Anthropic (Claude 3.5, Claude 3)
- Google (Gemini Pro, Gemini Flash)
- DeepSeek
- Ollama (本地模型)
- 自定义 API

## 下载

**GitHub**: https://github.com/adnaan-worker/adnify/releases

**Gitee 镜像**: https://gitee.com/adnaan/adnify/releases

支持 Windows、macOS、Linux 三大平台。

## 开源协议

Apache 2.0 - 完全开源，欢迎贡献代码！

---

## 后续计划

- [ ] 插件系统
- [ ] 多语言 LSP 支持扩展
- [ ] 协作编辑
- [ ] 更多 AI 模型支持

---

如果你觉得这个项目有意思，欢迎 Star ⭐ 支持一下！

有任何问题或建议，可以在 GitHub Issues 中反馈，或者发邮件到 adnaan.worker@gmail.com。

**项目地址**：
- GitHub: https://github.com/adnaan-worker/adnify
- Gitee: https://gitee.com/adnaan/adnify
- 官网: https://adnify-website.vercel.app
