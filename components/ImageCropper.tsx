/**
 * ImageCropper - 图片裁剪组件
 * 支持自由裁剪和预设比例，使用 Canvas API 实现
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X, Square, RectangleHorizontal, Maximize } from 'lucide-react';

interface ImageCropperProps {
    imageUrl: string;
    onCrop: (croppedImageBase64: string) => void;
    onCancel: () => void;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

type AspectRatioOption = 'free' | '1:1' | '4:3' | '16:9';

export const ImageCropper: React.FC<ImageCropperProps> = ({
    imageUrl,
    onCrop,
    onCancel
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
    const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('free');
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    // 加载图片
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            setImageDimensions({ width: img.width, height: img.height });
            setImageLoaded(true);

            // 初始化裁剪区域为图片中央
            const containerWidth = containerRef.current?.clientWidth || 300;
            const containerHeight = containerRef.current?.clientHeight || 300;

            const displayWidth = Math.min(containerWidth - 40, img.width);
            const displayHeight = (displayWidth / img.width) * img.height;

            const cropSize = Math.min(displayWidth, displayHeight) * 0.6;
            setCropArea({
                x: (displayWidth - cropSize) / 2 + 20,
                y: (displayHeight - cropSize) / 2 + 20,
                width: cropSize,
                height: cropSize
            });
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // 绘制预览
    useEffect(() => {
        if (!canvasRef.current || !imageRef.current || !imageLoaded) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const containerWidth = containerRef.current?.clientWidth || 300;
        const containerHeight = (containerRef.current?.clientHeight || 300) - 60;

        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 计算显示尺寸
        const img = imageRef.current;
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
            drawWidth = canvas.width * scale;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = canvas.height * scale;
            drawWidth = drawHeight * imgAspect;
        }

        drawX = (canvas.width - drawWidth) / 2;
        drawY = (canvas.height - drawHeight) / 2;

        // 保存状态
        ctx.save();

        // 应用旋转
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // 绘制图片
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        ctx.restore();

        // 绘制遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 清除裁剪区域（显示原图）
        ctx.save();
        ctx.beginPath();
        ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
        ctx.clip();

        // 重新绘制裁剪区域的图片
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // 绘制裁剪框边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

        // 绘制网格线（三分法）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        const thirdW = cropArea.width / 3;
        const thirdH = cropArea.height / 3;

        ctx.beginPath();
        ctx.moveTo(cropArea.x + thirdW, cropArea.y);
        ctx.lineTo(cropArea.x + thirdW, cropArea.y + cropArea.height);
        ctx.moveTo(cropArea.x + thirdW * 2, cropArea.y);
        ctx.lineTo(cropArea.x + thirdW * 2, cropArea.y + cropArea.height);
        ctx.moveTo(cropArea.x, cropArea.y + thirdH);
        ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH);
        ctx.moveTo(cropArea.x, cropArea.y + thirdH * 2);
        ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * 2);
        ctx.stroke();

        // 绘制角落控制点
        const cornerSize = 12;
        ctx.fillStyle = '#fff';
        const corners = [
            { x: cropArea.x, y: cropArea.y },
            { x: cropArea.x + cropArea.width, y: cropArea.y },
            { x: cropArea.x, y: cropArea.y + cropArea.height },
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height }
        ];

        corners.forEach(corner => {
            ctx.fillRect(corner.x - cornerSize / 2, corner.y - cornerSize / 2, cornerSize, cornerSize);
        });

    }, [imageLoaded, cropArea, rotation, scale]);

    // 鼠标事件处理
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否在角落（调整大小）
        const cornerSize = 20;
        const corners = [
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height }
        ];

        for (const corner of corners) {
            if (Math.abs(x - corner.x) < cornerSize && Math.abs(y - corner.y) < cornerSize) {
                setIsResizing(true);
                setDragStart({ x, y });
                return;
            }
        }

        // 检查是否在裁剪区域内（移动）
        if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            setIsDragging(true);
            setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
        }
    }, [cropArea]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging && !isResizing) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDragging) {
            setCropArea(prev => ({
                ...prev,
                x: Math.max(0, Math.min(rect.width - prev.width, x - dragStart.x)),
                y: Math.max(0, Math.min(rect.height - prev.height, y - dragStart.y))
            }));
        } else if (isResizing) {
            const newWidth = Math.max(50, x - cropArea.x);
            let newHeight = Math.max(50, y - cropArea.y);

            // 应用宽高比约束
            if (aspectRatio !== 'free') {
                const ratio = aspectRatio === '1:1' ? 1 : aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
                newHeight = newWidth / ratio;
            }

            setCropArea(prev => ({
                ...prev,
                width: newWidth,
                height: newHeight
            }));
        }
    }, [isDragging, isResizing, dragStart, cropArea, aspectRatio]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    // 应用裁剪
    const handleCrop = useCallback(() => {
        if (!imageRef.current || !canvasRef.current) return;

        const img = imageRef.current;
        const canvas = canvasRef.current;

        // 计算实际裁剪区域（相对于原图）
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
            drawWidth = canvas.width * scale;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = canvas.height * scale;
            drawWidth = drawHeight * imgAspect;
        }

        drawX = (canvas.width - drawWidth) / 2;
        drawY = (canvas.height - drawHeight) / 2;

        // 转换裁剪区域到原图坐标
        const scaleX = img.width / drawWidth;
        const scaleY = img.height / drawHeight;

        const srcX = (cropArea.x - drawX) * scaleX;
        const srcY = (cropArea.y - drawY) * scaleY;
        const srcWidth = cropArea.width * scaleX;
        const srcHeight = cropArea.height * scaleY;

        // 创建裁剪后的画布
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = srcWidth;
        cropCanvas.height = srcHeight;

        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) return;

        // 应用旋转
        if (rotation !== 0) {
            cropCtx.translate(srcWidth / 2, srcHeight / 2);
            cropCtx.rotate((rotation * Math.PI) / 180);
            cropCtx.translate(-srcWidth / 2, -srcHeight / 2);
        }

        cropCtx.drawImage(
            img,
            Math.max(0, srcX), Math.max(0, srcY), srcWidth, srcHeight,
            0, 0, srcWidth, srcHeight
        );

        // 导出为 Base64
        const base64 = cropCanvas.toDataURL('image/jpeg', 0.9);
        const base64Data = base64.split(',')[1];

        onCrop(base64Data);
    }, [cropArea, rotation, scale, onCrop]);

    const handleAspectRatioChange = (ratio: AspectRatioOption) => {
        setAspectRatio(ratio);

        if (ratio !== 'free') {
            const numRatio = ratio === '1:1' ? 1 : ratio === '4:3' ? 4 / 3 : 16 / 9;
            setCropArea(prev => ({
                ...prev,
                height: prev.width / numRatio
            }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2 text-white">
                        <Crop size={20} />
                        <span className="font-semibold">裁剪图片</span>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="relative bg-gray-950"
                    style={{ height: '320px' }}
                >
                    {!imageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            加载中...
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>

                {/* Controls */}
                <div className="p-4 bg-gray-800 space-y-4">
                    {/* Aspect Ratio */}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">比例:</span>
                        <div className="flex gap-2">
                            {([
                                { value: 'free', icon: <Maximize size={14} />, label: '自由' },
                                { value: '1:1', icon: <Square size={14} />, label: '1:1' },
                                { value: '4:3', icon: <RectangleHorizontal size={14} />, label: '4:3' },
                                { value: '16:9', icon: <RectangleHorizontal size={14} />, label: '16:9' }
                            ] as const).map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAspectRatioChange(option.value)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors
                                        ${aspectRatio === option.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }
                                    `}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rotation & Zoom */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                                title="旋转 90°"
                            >
                                <RotateCw size={18} />
                            </button>
                            <button
                                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                                className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                                title="缩小"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-gray-400 text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                                className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                                title="放大"
                            >
                                <ZoomIn size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 font-medium hover:bg-gray-600 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleCrop}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            <span>确认裁剪</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
