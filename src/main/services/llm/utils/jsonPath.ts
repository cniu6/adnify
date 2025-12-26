/**
 * JSON Path 字段提取器
 * 
 * 支持路径格式:
 * - 'choices[0].delta.content' → obj.choices[0].delta.content
 * - 'tool_calls[0].function.name' → obj.tool_calls[0].function.name
 * - 'usage.prompt_tokens' → obj.usage.prompt_tokens
 */

/**
 * 从对象中按路径获取值
 * 
 * @param obj 要提取的对象
 * @param path 路径字符串，支持 . 和 [] 访问
 * @returns 提取的值，不存在返回 undefined
 * 
 * @example
 * getByPath({ a: { b: [1, 2] }}, 'a.b[1]') // => 2
 * getByPath({ choices: [{delta: {content: 'hi'}}]}, 'choices[0].delta.content') // => 'hi'
 */
export function getByPath(obj: unknown, path: string): unknown {
    if (!obj || !path) return undefined

    // 解析路径为 token 数组 ['choices', '0', 'delta', 'content']
    const tokens = parsePath(path)

    let current: unknown = obj
    for (const token of tokens) {
        if (current === null || current === undefined) {
            return undefined
        }

        if (typeof current !== 'object') {
            return undefined
        }

        // 数组索引
        if (/^\d+$/.test(token)) {
            if (!Array.isArray(current)) {
                return undefined
            }
            current = current[parseInt(token, 10)]
        } else {
            // 对象属性
            current = (current as Record<string, unknown>)[token]
        }
    }

    return current
}

/**
 * 在对象中按路径设置值
 * 
 * @param obj 要设置的对象
 * @param path 路径字符串
 * @param value 要设置的值
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    if (!obj || !path) return

    const tokens = parsePath(path)
    let current: unknown = obj

    for (let i = 0; i < tokens.length - 1; i++) {
        const token = tokens[i]
        const nextToken = tokens[i + 1]
        const isNextArray = /^\d+$/.test(nextToken)

        if (typeof current !== 'object' || current === null) {
            return
        }

        const record = current as Record<string, unknown>
        if (!(token in record)) {
            record[token] = isNextArray ? [] : {}
        }
        current = record[token]
    }

    if (typeof current === 'object' && current !== null) {
        const lastToken = tokens[tokens.length - 1]
            ; (current as Record<string, unknown>)[lastToken] = value
    }
}

/**
 * 检查路径是否存在
 */
export function hasPath(obj: unknown, path: string): boolean {
    return getByPath(obj, path) !== undefined
}

/**
 * 解析路径字符串为 token 数组
 * 
 * @example
 * parsePath('choices[0].delta.content') // => ['choices', '0', 'delta', 'content']
 * parsePath('a.b.c') // => ['a', 'b', 'c']
 */
function parsePath(path: string): string[] {
    const tokens: string[] = []
    let current = ''
    let inBracket = false

    for (const char of path) {
        if (char === '[') {
            if (current) {
                tokens.push(current)
                current = ''
            }
            inBracket = true
        } else if (char === ']') {
            if (current) {
                tokens.push(current)
                current = ''
            }
            inBracket = false
        } else if (char === '.' && !inBracket) {
            if (current) {
                tokens.push(current)
                current = ''
            }
        } else {
            current += char
        }
    }

    if (current) {
        tokens.push(current)
    }

    return tokens
}

/**
 * 合并两个路径
 * 
 * @example
 * joinPath('choices[0]', 'delta.content') // => 'choices[0].delta.content'
 */
export function joinPath(...paths: (string | undefined)[]): string {
    return paths.filter(p => p).join('.')
}
