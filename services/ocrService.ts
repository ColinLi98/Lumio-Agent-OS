/**
 * OCR Service - 图像识别服务
 * 使用 Gemini Vision API 分析图像，提取文字、商品、地址等信息
 */

import { GoogleGenAI } from '@google/genai';
import { MODELS, selectModel } from './modelSelector';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedItem {
    type: 'product' | 'address' | 'link' | 'phone' | 'price' | 'text' | 'qrcode';
    content: string;
    confidence: number;
    metadata?: Record<string, any>;
}

export interface OCRResult {
    success: boolean;
    extractedItems: ExtractedItem[];
    rawText?: string;
    summary?: string;
    error?: string;
    processingTime?: number;
}

// ============================================================================
// Image Preprocessing
// ============================================================================

/**
 * 压缩并转换图片为 Base64
 */
export function preprocessImage(file: File, maxWidth: number = 1024): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 计算缩放比例
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // 使用 Canvas 压缩
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // 转换为 Base64 (JPEG 格式，质量 0.8)
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                // 移除 data:image/jpeg;base64, 前缀
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * 从 Base64 字符串获取图片预览 URL
 */
export function getImagePreviewUrl(base64Data: string, mimeType: string = 'image/jpeg'): string {
    return `data:${mimeType};base64,${base64Data}`;
}

// ============================================================================
// OCR Analysis
// ============================================================================

const OCR_PROMPT = `请仔细分析这张图片，提取所有有价值的信息。

按以下 JSON 格式返回结果：
{
  "items": [
    {
      "type": "product|address|link|phone|price|text|qrcode",
      "content": "提取的内容",
      "confidence": 0.9,
      "metadata": {}
    }
  ],
  "rawText": "图片中的所有文字",
  "summary": "一句话总结图片内容"
}

识别规则：
1. product: 商品名称（包含品牌、型号等）
2. address: 完整地址（省市区街道门牌号）
3. link: URL 链接或网址
4. phone: 电话号码（手机号、座机）
5. price: 价格信息（¥、$、元等）
6. text: 其他重要文字
7. qrcode: 二维码内容（如果可识别）

注意：
- confidence 范围 0-1，表示识别置信度
- 优先提取商品、价格、地址等有实用价值的信息
- 如果是电商截图，重点提取商品名和价格
- 如果是地图/外卖截图，重点提取地址
- 只返回 JSON，不要其他解释`;

/**
 * 使用 Gemini Vision API 分析图像
 */
export async function analyzeImage(imageBase64: string, apiKey: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        if (!apiKey) {
            return {
                success: false,
                extractedItems: [],
                error: 'API Key 未配置，无法进行图像识别'
            };
        }

        const ai = new GoogleGenAI({ apiKey });

        // OCR 图像识别使用 Flash 模型（快速响应）
        const response = await ai.models.generateContent({
            model: MODELS.FLASH,
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64
                            }
                        },
                        {
                            text: OCR_PROMPT
                        }
                    ]
                }
            ]
        });

        const text = response.text || '';

        // 解析 JSON 响应
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                success: false,
                extractedItems: [],
                error: '无法解析识别结果',
                rawText: text,
                processingTime: Date.now() - startTime
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            extractedItems: parsed.items || [],
            rawText: parsed.rawText,
            summary: parsed.summary,
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('[OCR] Analysis failed:', error);
        return {
            success: false,
            extractedItems: [],
            error: error instanceof Error ? error.message : '图像识别失败',
            processingTime: Date.now() - startTime
        };
    }
}

// ============================================================================
// Quick Action Generation
// ============================================================================

export interface QuickAction {
    id: string;
    type: 'compare_price' | 'navigate' | 'save' | 'search' | 'copy' | 'call' | 'open_link';
    label: string;
    icon: string;
    data: Record<string, any>;
    actionUri?: string;
}

/**
 * 根据识别结果生成快捷操作
 */
export function generateQuickActions(items: ExtractedItem[]): QuickAction[] {
    const actions: QuickAction[] = [];

    items.forEach((item, index) => {
        switch (item.type) {
            case 'product':
                actions.push({
                    id: `action-${index}-compare`,
                    type: 'compare_price',
                    label: '💰 比价',
                    icon: '💰',
                    data: { product: item.content },
                    actionUri: `https://search.jd.com/Search?keyword=${encodeURIComponent(item.content)}`
                });
                actions.push({
                    id: `action-${index}-search`,
                    type: 'search',
                    label: '🔍 搜索',
                    icon: '🔍',
                    data: { query: item.content },
                    actionUri: `https://www.baidu.com/s?wd=${encodeURIComponent(item.content)}`
                });
                actions.push({
                    id: `action-${index}-save`,
                    type: 'save',
                    label: '💾 收藏',
                    icon: '💾',
                    data: { content: item.content, type: 'interest' }
                });
                break;

            case 'address':
                actions.push({
                    id: `action-${index}-navigate`,
                    type: 'navigate',
                    label: '🗺️ 导航',
                    icon: '🗺️',
                    data: { address: item.content },
                    actionUri: `https://map.baidu.com/search/${encodeURIComponent(item.content)}`
                });
                actions.push({
                    id: `action-${index}-copy`,
                    type: 'copy',
                    label: '📋 复制',
                    icon: '📋',
                    data: { content: item.content }
                });
                break;

            case 'link':
                actions.push({
                    id: `action-${index}-open`,
                    type: 'open_link',
                    label: '🔗 打开',
                    icon: '🔗',
                    data: { url: item.content },
                    actionUri: item.content
                });
                actions.push({
                    id: `action-${index}-save`,
                    type: 'save',
                    label: '📖 稍后读',
                    icon: '📖',
                    data: { content: item.content, type: 'link' }
                });
                break;

            case 'phone':
                actions.push({
                    id: `action-${index}-call`,
                    type: 'call',
                    label: '📞 拨打',
                    icon: '📞',
                    data: { phone: item.content },
                    actionUri: `tel:${item.content}`
                });
                actions.push({
                    id: `action-${index}-copy`,
                    type: 'copy',
                    label: '📋 复制',
                    icon: '📋',
                    data: { content: item.content }
                });
                break;

            case 'price':
                // 价格通常与商品关联，不单独生成操作
                break;

            default:
                // 默认文本操作
                if (item.content.length > 5) {
                    actions.push({
                        id: `action-${index}-search`,
                        type: 'search',
                        label: '🔍 搜索',
                        icon: '🔍',
                        data: { query: item.content },
                        actionUri: `https://www.baidu.com/s?wd=${encodeURIComponent(item.content)}`
                    });
                    actions.push({
                        id: `action-${index}-copy`,
                        type: 'copy',
                        label: '📋 复制',
                        icon: '📋',
                        data: { content: item.content }
                    });
                }
        }
    });

    // 去重并限制数量
    const uniqueActions = actions.filter((action, index, self) =>
        index === self.findIndex(a => a.type === action.type && JSON.stringify(a.data) === JSON.stringify(action.data))
    );

    return uniqueActions.slice(0, 8); // 最多返回 8 个操作
}

// ============================================================================
// Offline Mode with Tesseract.js
// ============================================================================

import Tesseract from 'tesseract.js';

export interface OCRProgress {
    status: string;
    progress: number;
}

/**
 * 离线模式 - 使用 Tesseract.js 进行本地 OCR 识别
 * 支持中文简体和英文
 */
export async function analyzeImageOffline(
    imageBase64: string,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    const startTime = Date.now();

    try {
        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

        const result = await Tesseract.recognize(
            imageUrl,
            'chi_sim+eng', // 中文简体 + 英文
            {
                logger: m => {
                    if (m.status && m.progress !== undefined) {
                        const statusMap: Record<string, string> = {
                            'loading tesseract core': '加载识别引擎',
                            'initializing tesseract': '初始化引擎',
                            'loading language traineddata': '加载语言包',
                            'initializing api': '初始化 API',
                            'recognizing text': '识别文字中'
                        };
                        onProgress?.({
                            status: statusMap[m.status] || m.status,
                            progress: m.progress
                        });
                    }
                }
            }
        );

        const text = result.data.text.trim();

        if (!text) {
            return {
                success: false,
                extractedItems: [],
                error: '未识别到任何文字',
                processingTime: Date.now() - startTime
            };
        }

        // 解析识别结果，尝试提取结构化信息
        const extractedItems = parseOfflineOCRResult(text, result.data);

        return {
            success: true,
            extractedItems,
            rawText: text,
            summary: `离线识别：发现 ${extractedItems.length} 项内容`,
            processingTime: Date.now() - startTime
        };

    } catch (error) {
        console.error('[OCR Offline] Tesseract error:', error);
        return {
            success: false,
            extractedItems: [],
            error: error instanceof Error ? error.message : '离线识别失败',
            processingTime: Date.now() - startTime
        };
    }
}

/**
 * 解析离线 OCR 结果，提取结构化信息
 */
function parseOfflineOCRResult(text: string, data: any): ExtractedItem[] {
    const items: ExtractedItem[] = [];

    // 匹配电话号码
    const phoneMatches = text.match(/1[3-9]\d{9}|0\d{2,3}[-−]?\d{7,8}/g);
    if (phoneMatches) {
        phoneMatches.forEach(phone => {
            items.push({
                type: 'phone',
                content: phone.replace(/[-−]/g, ''),
                confidence: 0.8
            });
        });
    }

    // 匹配链接
    const urlMatches = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi);
    if (urlMatches) {
        urlMatches.forEach(url => {
            items.push({
                type: 'link',
                content: url,
                confidence: 0.9
            });
        });
    }

    // 匹配价格
    const priceMatches = text.match(/[¥￥$]\s*\d+\.?\d*|(\d+\.?\d*)\s*元/g);
    if (priceMatches) {
        priceMatches.forEach(price => {
            items.push({
                type: 'price',
                content: price,
                confidence: 0.85
            });
        });
    }

    // 匹配地址（简单模式）
    const addressPatterns = [
        /[\u4e00-\u9fa5]{2,}(省|市|区|县|镇|街道|路|号|楼|层|室)[\u4e00-\u9fa5\d]*/g
    ];

    addressPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(addr => {
                if (addr.length > 6) { // 过滤太短的匹配
                    items.push({
                        type: 'address',
                        content: addr,
                        confidence: 0.7
                    });
                }
            });
        }
    });

    // 提取按行的文本块（高置信度的）
    if (data.lines) {
        data.lines.forEach(line => {
            const lineText = line.text.trim();
            if (lineText.length > 5 && line.confidence > 70) {
                // 检查是否已被其他类型匹配
                const alreadyMatched = items.some(item =>
                    lineText.includes(item.content) || item.content.includes(lineText)
                );

                if (!alreadyMatched) {
                    // 判断是否像商品名（包含品牌词等特征）
                    const isProductLike = /[A-Za-z]+\d*|[\u4e00-\u9fa5]{2,}(版|型|款|系列)/i.test(lineText);

                    items.push({
                        type: isProductLike ? 'product' : 'text',
                        content: lineText,
                        confidence: line.confidence / 100
                    });
                }
            }
        });
    }

    // 去重
    const uniqueItems = items.filter((item, index, self) =>
        index === self.findIndex(i => i.content === item.content)
    );

    return uniqueItems;
}

/**
 * 智能识别 - 自动选择在线或离线模式
 */
export async function analyzeImageSmart(
    imageBase64: string,
    apiKey: string,
    forceOffline: boolean = false,
    onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
    const isOnline = navigator.onLine && !forceOffline;

    if (isOnline && apiKey) {
        console.log('[OCR] Using online mode (Gemini Vision)');
        return analyzeImage(imageBase64, apiKey);
    } else {
        console.log('[OCR] Using offline mode (Tesseract.js)');
        return analyzeImageOffline(imageBase64, onProgress);
    }
}

/**
 * 批量识别多张图片
 */
export async function analyzeImagesBatch(
    images: string[],
    apiKey: string,
    onProgress?: (current: number, total: number, result?: OCRResult) => void
): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (let i = 0; i < images.length; i++) {
        const result = await analyzeImageSmart(images[i], apiKey);
        results.push(result);
        onProgress?.(i + 1, images.length, result);
    }

    return results;
}

/**
 * 合并多个识别结果
 */
export function mergeOCRResults(results: OCRResult[]): OCRResult {
    const allItems: ExtractedItem[] = [];
    const allRawText: string[] = [];
    let totalProcessingTime = 0;

    results.forEach(result => {
        if (result.success) {
            allItems.push(...result.extractedItems);
            if (result.rawText) allRawText.push(result.rawText);
            if (result.processingTime) totalProcessingTime += result.processingTime;
        }
    });

    // 去重
    const uniqueItems = allItems.filter((item, index, self) =>
        index === self.findIndex(i => i.type === item.type && i.content === item.content)
    );

    return {
        success: uniqueItems.length > 0,
        extractedItems: uniqueItems,
        rawText: allRawText.join('\n\n---\n\n'),
        summary: `共识别 ${results.length} 张图片，发现 ${uniqueItems.length} 项内容`,
        processingTime: totalProcessingTime
    };
}

