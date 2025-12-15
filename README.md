# Adnify

> **Connect AI to Your Code.**
> 一个拥有极致视觉体验、深度集成 AI Agent 的下一代代码编辑器。

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Electron](https://img.shields.io/badge/Electron-33.0-blueviolet) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

Adnify 不仅仅是一个编辑器，它是你的**智能编程伴侣**。它复刻并超越了传统 IDE 的体验，融合了 Cyberpunk 玻璃拟态设计风格，内置强大的 AI Agent，支持从代码生成到文件操作的全流程自动化。

---

## ✨ 核心特性 (Features)

### 🎨 **极致视觉体验 (Premium UI/UX)**
- **Cyberpunk Glass**: 全局采用深色毛玻璃风格，配合微妙的流光边框和动态阴影。
- **沉浸式设计**: 无框侧边栏、Chrome 风格标签页、面包屑导航，每一处细节都经过像素级打磨。
- **流畅交互**: 丝滑的动效和响应式布局，告别生硬的操作感。

### 🤖 **AI Agent 深度集成**
- **双模式对话**: 
  - **Chat Mode**: 纯对话模式，解答编程疑惑。
  - **Agent Mode**: 真正的智能代理，拥有读写文件、执行终端命令的权限，可自主完成复杂任务。
- **智能感知**: 支持 `@文件名` 引用上下文。
- **拖拽交互**: 直接将文件从侧边栏或桌面拖入对话框，AI 即可读取内容。

### 📟 **专业级功能**
- **真·终端 (Real Terminal)**: 集成 `xterm.js` 和持久化 Shell 进程，支持 PowerShell/Bash，拥有完整的颜色输出和交互体验。
- **图形化 Git**: 完整的源代码管理面板。支持暂存 (Stage)、提交 (Commit)、差异对比 (Diff View) 和提交历史查看。
- **智能搜索**: 支持正则、大小写敏感、全字匹配的全局文件搜索。

### 🛠 **工程化完备**
- **自动恢复**: 记住你上次的工作区，打开即用。
- **多语言**: 完整的中英文国际化支持。
- **便携与安装**: 支持生成单文件绿色版或标准的 Windows 安装向导。

---

## 🚀 快速开始 (Getting Started)

### 环境要求
- Node.js >= 18
- Git

### 开发环境运行

```bash
# 1. 克隆项目
git clone https://github.com/your-username/adnify.git
cd adnify

# 2. 安装依赖
npm install

# 3. 启动开发服务器 (同时启动 Vite 和 Electron)
npm run dev
```

### 打包发布

Adnify 支持生成带有自定义图标的 Windows 安装包。

```bash
# 1. 生成图标资源 (首次运行或图标变更时执行)
# 这会将 resources/icon.svg 转换为 ico/icns/png
node scripts/generate-icons.js

# 2. 构建安装包
# 生成的文件位于 release/ 目录
npm run dist
```

---

## 📖 使用教程 (User Guide)

### 1. 配置 AI 模型
首次启动软件后：
1. 点击左下角的 **设置 (Settings)** 图标或按 `Ctrl+,`。
2. 在 **Provider** 选项卡中选择你的 AI 服务商（OpenAI, Anthropic, Gemini, DeepSeek, Ollama 等）。
3. 输入 API Key。如果使用 Ollama 等本地模型，请填写 Base URL。
4. 点击保存。

### 2. 与 AI 协作
- **引用文件**: 在输入框输入 `@`，会弹出文件选择列表；或者直接按住侧边栏的文件，**拖拽**到输入框中。
- **让 AI 改代码**: 切换到 **Agent Mode**，输入指令（例如：“帮我重构 Sidebar.tsx 的样式”）。AI 会自动生成 Diff，你只需在编辑器中点击 "Approve" 即可应用。

### 3. 使用版本控制 (Git)
1. 点击侧边栏第三个图标进入 **Source Control** 面板。
2. **初始化**: 如果当前文件夹不是 Git 仓库，点击 "Initialize Repository"。
3. **查看变更**: 点击 "CHANGES" 列表中的文件，编辑器会打开 **Diff 视图**（左侧为旧代码，右侧为新代码）。
4. **提交**: 
   - 点击文件旁的 `+` 号暂存文件 (Stage)。
   - 在上方输入框填写提交信息。
   - 按 `Ctrl+Enter` 或点击 "Commit" 按钮提交。

### 4. 快捷键 (Shortcuts)
Adnify 兼容主流 IDE 的快捷键习惯：

| 快捷键 | 功能 |
|:---|:---||
| `Ctrl + P` | 快速搜索并打开文件 |
| `Ctrl + ,` | 打开设置 |
| `Ctrl + \`` | 唤起/隐藏终端 |
| `Ctrl + S` | 保存文件 |
| `Ctrl + Shift + F` | 全局搜索 (侧边栏) |

---

## 📂 项目结构

```
adnify/
├── resources/       # 图标源文件 (icon.svg)
├── scripts/         # 构建脚本 (图标生成)
├── src/
│   ├── main/        # Electron 主进程 (Node.js)
│   │   ├── llm/     # LLM 服务与通信层
│   │   └── main.ts  # 应用入口
│   └── renderer/    # 前端渲染进程 (React)
│       ├── agent/   # AI Agent 逻辑 (工具链)
│       ├── components/ # UI 组件 (Sidebar, Editor, Terminal...)
│       └── store/   # 状态管理 (Zustand)
└── package.json
```

---

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request。如果你喜欢这个项目，请给一个 ⭐️ Star！

**License**: MIT