import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'success' | 'outline'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    glow?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, glow, ...props }, ref) => {

        // 基础样式：去除了全局 border
        const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.96] overflow-hidden group"

        const variants = {
            // Primary: 高对比度，带微光动画
            primary: `
                bg-accent text-white rounded-xl border border-white/10
                shadow-[0_4px_12px_-4px_rgba(var(--accent)/0.4)]
                hover:bg-accent-hover hover:shadow-[0_8px_20px_-6px_rgba(var(--accent)/0.5)]
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-[1s]
            `,
            // Secondary: 弱化的实色背景
            secondary: "bg-surface/40 backdrop-blur-md text-text-primary rounded-xl border border-border hover:bg-surface/60 hover:border-accent/30",
            
            // Ghost: 完全透明，仅 Hover 有背景
            ghost: "bg-transparent text-text-secondary rounded-lg hover:bg-white/5 hover:text-text-primary",
            
            // Icon: 专门为图标设计的变体，没有任何默认边框
            icon: "bg-transparent text-text-muted rounded-lg hover:bg-white/10 hover:text-text-primary active:bg-white/15 p-0 aspect-square",
            
            // Danger: 红色警告
            danger: "bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30",
            
            // Success: 绿色成功
            success: "bg-green-500/10 text-green-400 rounded-xl border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30",
            
            // Outline: 镂空边框
            outline: "bg-transparent border border-border text-text-secondary rounded-xl hover:border-accent/50 hover:text-text-primary hover:bg-accent/5"
        }

        const sizes = {
            sm: "h-7 px-2.5 text-xs gap-1.5",
            md: "h-9 px-4 text-sm gap-2",
            lg: "h-11 px-6 text-base gap-2.5",
            icon: "w-8 h-8" // 稍微小一点，更符合 IDE 习惯
        }

        const variantStyles = variants[variant]
        const sizeStyles = sizes[size]

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {/* 仅在 Primary 或特定 glow 模式下显示内部高光 */}
                {(variant === 'primary' || glow) && (
                    <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none" />
                )}
                
                {isLoading && <Loader2 className="animate-spin" size={size === 'icon' || size === 'sm' ? 14 : 16} />}
                
                {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                
                {/* 如果是 icon size，且没有 children，则居中显示图标 */}
                {children && (
                    <span className="relative z-10 flex items-center gap-2">{children}</span>
                )}
                
                {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </button>
        )
    }
)

Button.displayName = "Button"
