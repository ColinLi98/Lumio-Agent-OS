/**
 * ImageUploadPanel - 增强版图像上传和预览组件
 * 支持：单图/批量上传、裁剪、相机拍摄、离线识别、进度显示
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle, Crop, Plus, Trash2, WifiOff, Images, CameraIcon } from 'lucide-react';
import {
    preprocessImage,
    getImagePreviewUrl,
    analyzeImageSmart,
    generateQuickActions,
    analyzeImagesBatch,
    mergeOCRResults,
    OCRResult,
    QuickAction,
    OCRProgress
} from '../services/ocrService';
import { ImageCropper } from './ImageCropper';
import { CameraCapture } from './CameraCapture';

interface ImageUploadPanelProps {
    apiKey: string;
    visible: boolean;
    onClose: () => void;
    onResult: (result: OCRResult, actions: QuickAction[]) => void;
    onLog?: (message: string) => void;
}

interface ImageItem {
    id: string;
    base64: string;
    previewUrl: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    result?: OCRResult;
}

type UploadState = 'idle' | 'preview' | 'cropping' | 'camera' | 'analyzing' | 'success' | 'error';
type UploadMode = 'single' | 'batch';

export const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({
    apiKey,
    visible,
    onClose,
    onResult,
    onLog
}) => {
    const [state, setState] = useState<UploadState>('idle');
    const [mode, setMode] = useState<UploadMode>('single');
    const [images, setImages] = useState<ImageItem[]>([]);
    const [currentImageBase64, setCurrentImageBase64] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState<OCRProgress | null>(null);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [forceOffline, setForceOffline] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const log = (message: string) => {
        console.log(`[ImageUpload] ${message}`);
        onLog?.(message);
    };

    const reset = () => {
        setState('idle');
        setImages([]);
        setCurrentImageBase64(null);
        setError(null);
        setProgress(null);
        setBatchProgress({ current: 0, total: 0 });
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // ========================================
    // File Processing
    // ========================================

    const processFile = async (file: File): Promise<{ base64: string; previewUrl: string } | null> => {
        if (!file.type.startsWith('image/')) {
            setError('请选择图片文件');
            return null;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('图片大小不能超过 10MB');
            return null;
        }

        try {
            const base64 = await preprocessImage(file);
            return {
                base64,
                previewUrl: getImagePreviewUrl(base64)
            };
        } catch (err) {
            log(`Preprocessing error: ${err}`);
            setError('图片处理失败');
            return null;
        }
    };

    const handleFileSelect = async (files: FileList) => {
        setError(null);

        if (mode === 'single') {
            const result = await processFile(files[0]);
            if (result) {
                setCurrentImageBase64(result.base64);
                setImages([{
                    id: Date.now().toString(),
                    base64: result.base64,
                    previewUrl: result.previewUrl,
                    status: 'pending'
                }]);
                setState('preview');
                log('Single image loaded');
            }
        } else {
            // Batch mode
            const newImages: ImageItem[] = [];
            for (let i = 0; i < Math.min(files.length, 10); i++) {
                const result = await processFile(files[i]);
                if (result) {
                    newImages.push({
                        id: `${Date.now()}-${i}`,
                        base64: result.base64,
                        previewUrl: result.previewUrl,
                        status: 'pending'
                    });
                }
            }
            setImages(prev => [...prev, ...newImages].slice(0, 10));
            if (newImages.length > 0) {
                setState('preview');
                log(`Batch: ${newImages.length} images loaded`);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            handleFileSelect(e.target.files);
        }
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [mode]);

    // ========================================
    // Analysis
    // ========================================

    const handleAnalyze = async () => {
        if (images.length === 0) return;

        setState('analyzing');
        log(`Starting analysis (${forceOffline ? 'offline' : 'online'} mode)...`);

        try {
            if (mode === 'single' || images.length === 1) {
                // Single image analysis
                const result = await analyzeImageSmart(
                    images[0].base64,
                    apiKey,
                    forceOffline,
                    setProgress
                );

                if (result.success) {
                    setState('success');
                    log(`Analysis complete: ${result.extractedItems.length} items found`);
                    const actions = generateQuickActions(result.extractedItems);
                    onResult(result, actions);
                    setTimeout(handleClose, 500);
                } else {
                    setState('error');
                    setError(result.error || '识别失败');
                }
            } else {
                // Batch analysis
                const imageBase64s = images.map(img => img.base64);
                const results = await analyzeImagesBatch(
                    imageBase64s,
                    apiKey,
                    (current, total, result) => {
                        setBatchProgress({ current, total });
                        setImages(prev => prev.map((img, idx) =>
                            idx === current - 1
                                ? { ...img, status: result?.success ? 'done' : 'error', result }
                                : img
                        ));
                    }
                );

                const mergedResult = mergeOCRResults(results);

                if (mergedResult.success) {
                    setState('success');
                    log(`Batch complete: ${mergedResult.extractedItems.length} items found`);
                    const actions = generateQuickActions(mergedResult.extractedItems);
                    onResult(mergedResult, actions);
                    setTimeout(handleClose, 500);
                } else {
                    setState('error');
                    setError('部分图片识别失败');
                }
            }
        } catch (err) {
            setState('error');
            setError('识别过程出错');
            log(`Analysis error: ${err}`);
        }
    };

    // ========================================
    // Cropping
    // ========================================

    const handleStartCrop = () => {
        if (images.length > 0) {
            setCurrentImageBase64(images[0].base64);
            setState('cropping');
        }
    };

    const handleCropComplete = (croppedBase64: string) => {
        const previewUrl = getImagePreviewUrl(croppedBase64);
        setImages(prev => prev.map((img, idx) =>
            idx === 0 ? { ...img, base64: croppedBase64, previewUrl } : img
        ));
        setCurrentImageBase64(croppedBase64);
        setState('preview');
        log('Image cropped');
    };

    // ========================================
    // Camera
    // ========================================

    const handleStartCamera = () => {
        setState('camera');
    };

    const handleCameraCapture = (base64: string) => {
        const previewUrl = getImagePreviewUrl(base64);
        const newImage: ImageItem = {
            id: Date.now().toString(),
            base64,
            previewUrl,
            status: 'pending'
        };

        if (mode === 'single') {
            setImages([newImage]);
        } else {
            setImages(prev => [...prev, newImage].slice(0, 10));
        }

        setCurrentImageBase64(base64);
        setState('preview');
        log('Photo captured');
    };

    // ========================================
    // Image Management
    // ========================================

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
        if (images.length === 1) {
            setState('idle');
        }
    };

    if (!visible) return null;

    // Render Camera Capture
    if (state === 'camera') {
        return (
            <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setState(images.length > 0 ? 'preview' : 'idle')}
                onLog={log}
            />
        );
    }

    // Render Image Cropper
    if (state === 'cropping' && currentImageBase64) {
        return (
            <ImageCropper
                imageUrl={getImagePreviewUrl(currentImageBase64)}
                onCrop={handleCropComplete}
                onCancel={() => setState('preview')}
            />
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2">
                        <Camera size={20} />
                        <span className="font-semibold">📷 图像识别</span>
                        {mode === 'batch' && images.length > 0 && (
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                {images.length}/10
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Toggle */}
                {state === 'idle' && (
                    <div className="px-4 pt-4">
                        <div className="flex rounded-lg bg-gray-100 p-1">
                            <button
                                onClick={() => setMode('single')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === 'single'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600'
                                    }`}
                            >
                                单图识别
                            </button>
                            <button
                                onClick={() => setMode('batch')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${mode === 'batch'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600'
                                    }`}
                            >
                                <Images size={14} />
                                批量
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4">
                    {/* Idle State */}
                    {state === 'idle' && (
                        <div className="space-y-3">
                            {/* Upload Area */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                                    ${isDragging
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <p className="text-gray-700 font-medium mb-1">
                                    {isDragging ? '松开上传' : '点击或拖拽上传'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {mode === 'batch' ? '最多 10 张' : 'JPG/PNG, ≤10MB'}
                                </p>
                            </div>

                            {/* Camera Button */}
                            <button
                                onClick={handleStartCamera}
                                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <CameraIcon size={18} />
                                <span>拍照识别</span>
                            </button>

                            {/* Offline Toggle */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <WifiOff size={14} />
                                    <span>离线模式</span>
                                </div>
                                <button
                                    onClick={() => setForceOffline(!forceOffline)}
                                    className={`w-10 h-6 rounded-full transition-colors ${forceOffline ? 'bg-indigo-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${forceOffline ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preview State */}
                    {state === 'preview' && (
                        <div className="space-y-4">
                            {/* Single Image Preview */}
                            {mode === 'single' && images[0] && (
                                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                                    <img
                                        src={images[0].previewUrl}
                                        alt="Preview"
                                        className="w-full h-48 object-contain"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button
                                            onClick={handleStartCrop}
                                            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                                            title="裁剪"
                                        >
                                            <Crop size={14} />
                                        </button>
                                        <button
                                            onClick={reset}
                                            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Batch Preview Grid */}
                            {mode === 'batch' && (
                                <div className="grid grid-cols-4 gap-2">
                                    {images.map(img => (
                                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                            <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                                            {img.status === 'done' && (
                                                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                                    <CheckCircle className="text-white" size={20} />
                                                </div>
                                            )}
                                            {img.status === 'error' && (
                                                <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                                                    <AlertCircle className="text-white" size={20} />
                                                </div>
                                            )}
                                            {img.status === 'processing' && (
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <Loader2 className="text-white animate-spin" size={20} />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeImage(img.id)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 10 && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-indigo-400 hover:bg-gray-50"
                                        >
                                            <Plus size={24} className="text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {mode === 'batch' && (
                                    <button
                                        onClick={handleStartCamera}
                                        className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                                    >
                                        <CameraIcon size={20} className="text-gray-600" />
                                    </button>
                                )}
                                <button
                                    onClick={handleAnalyze}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    <span>🔍 {mode === 'batch' ? `识别 ${images.length} 张` : '开始识别'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Analyzing State */}
                    {state === 'analyzing' && (
                        <div className="py-8 text-center">
                            <Loader2 size={40} className="text-indigo-600 animate-spin mx-auto mb-4" />

                            {mode === 'batch' && batchProgress.total > 0 ? (
                                <>
                                    <p className="text-gray-700 font-medium">
                                        正在识别 {batchProgress.current}/{batchProgress.total}
                                    </p>
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all"
                                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </>
                            ) : progress ? (
                                <>
                                    <p className="text-gray-700 font-medium">{progress.status}</p>
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all"
                                            style={{ width: `${progress.progress * 100}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500">
                                    {forceOffline ? '离线识别中...' : 'AI 识别中...'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Success State */}
                    {state === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <p className="text-gray-700 font-semibold">识别完成！</p>
                        </div>
                    )}

                    {/* Error State */}
                    {state === 'error' && (
                        <div className="text-center py-6">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            <p className="text-red-600 font-semibold mb-2">识别失败</p>
                            <p className="text-sm text-gray-500 mb-4">{error}</p>
                            <button
                                onClick={reset}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {error && state === 'idle' && (
                        <p className="text-center text-sm text-red-500 mt-2">{error}</p>
                    )}
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple={mode === 'batch'}
                    onChange={handleInputChange}
                    className="hidden"
                />

                {/* Privacy Notice */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                        🔒 图片仅用于本次识别，不会被保存
                    </p>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Image Upload Button (Compact version)
// ============================================================================

interface ImageUploadButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ onClick, disabled }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-colors
                ${disabled
                    ? 'bg-indigo-700/30 text-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-600 active:scale-95'
                }
            `}
            title="图片识别"
        >
            <Camera size={18} />
        </button>
    );
};

export default ImageUploadPanel;
