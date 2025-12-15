/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				// 现代深色主题系统 (Inspired by Vercel / Linear / Cursor)
				background: {
					DEFAULT: '#09090b', // 极深背景
					secondary: '#18181b', // 次级背景 (Sidebar)
					tertiary: '#27272a', // 悬浮/输入框背景
				},
				surface: {
					DEFAULT: '#121212',
					hover: '#27272a',
					active: '#3f3f46',
				},
				border: {
					DEFAULT: '#27272a', // 默认边框
					subtle: '#1f1f22',
					highlight: '#3f3f46',
				},
				text: {
					primary: '#e4e4e7', // 主要文字
					secondary: '#a1a1aa', // 次要文字
					muted: '#71717a', // 弱化文字
				},
				accent: {
					DEFAULT: '#3b82f6', // 主品牌色 (Blue)
					hover: '#60a5fa',
					glow: 'rgba(59, 130, 246, 0.5)',
				},
				status: {
					success: '#22c55e',
					warning: '#eab308',
					error: '#ef4444',
					info: '#3b82f6',
				},
				// 保留 editor 命名空间以兼容部分旧代码，逐步替换
				'editor': {
					'bg': '#09090b',
					'sidebar': '#121212', // 更深的侧边栏
					'border': '#27272a',
					'hover': '#27272a',
					'active': '#2563eb',
					'text': '#e4e4e7',
					'text-muted': '#a1a1aa',
					'accent': '#3b82f6',
				}
			},
			fontFamily: {
				'mono': ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
				'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
				'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fadeIn 0.2s ease-out',
				'slide-in': 'slideIn 0.3s ease-out',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideIn: {
					'0%': { transform: 'translateX(20px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' },
				}
			}
		},
	},
	plugins: [],
}
