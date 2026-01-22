/**
 * CameraCapture - 相机拍摄组件
 * 使用 WebRTC getUserMedia API 实现实时预览和拍照
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageBase64: string) => void;
    onClose: () => void;
    onLog?: (message: string) => void;
}

type CameraState = 'initializing' | 'ready' | 'captured' | 'error';
type FacingMode = 'user' | 'environment';

export const CameraCapture: React.FC<CameraCaptureProps> = ({
    onCapture,
    onClose,
    onLog
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [state, setState] = useState<CameraState>('initializing');
    const [facingMode, setFacingMode] = useState<FacingMode>('environment');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    const log = (message: string) => {
        console.log(`[Camera] ${message}`);
        onLog?.(message);
    };

    // 检测可用摄像头
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setHasMultipleCameras(videoInputs.length > 1);
            log(`Found ${videoInputs.length} camera(s)`);
        });
    }, []);

    // 启动相机
    const startCamera = useCallback(async () => {
        setState('initializing');
        setError(null);

        try {
            // 先停止之前的流
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            log(`Requesting camera with facing mode: ${facingMode}`);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setState('ready');
                log('Camera started successfully');
            }
        } catch (err) {
            console.error('Camera error:', err);
            setState('error');

            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    setError('请授权访问摄像头');
                } else if (err.name === 'NotFoundError') {
                    setError('未检测到摄像头');
                } else if (err.name === 'NotReadableError') {
                    setError('摄像头被占用');
                } else {
                    setError(`摄像头错误: ${err.message}`);
                }
            } else {
                setError('无法访问摄像头');
            }
            log(`Camera error: ${err}`);
        }
    }, [facingMode]);

    // 初始化相机
    useEffect(() => {
        startCamera();

        return () => {
            // 清理：停止所有媒体轨道
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    // 拍照
    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 如果是前置摄像头，水平翻转
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);

        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(base64);
        setState('captured');
        log('Photo captured');
    }, [facingMode]);

    // 切换摄像头
    const handleSwitchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        log('Switching camera');
    }, []);

    // 重新拍照
    const handleRetake = useCallback(() => {
        setCapturedImage(null);
        setState('ready');
    }, []);

    // 使用拍摄的照片
    const handleUsePhoto = useCallback(() => {
        if (!capturedImage) return;

        // 移除 data:image/jpeg;base64, 前缀
        const base64Data = capturedImage.split(',')[1];
        onCapture(base64Data);
    }, [capturedImage, onCapture]);

    // 关闭时清理
    const handleClose = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        onClose();
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/50 absolute top-0 left-0 right-0 z-10">
                <div className="flex items-center gap-2 text-white">
                    <Camera size={20} />
                    <span className="font-semibold">📸 拍照识别</span>
                </div>
                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Video/Preview Area */}
            <div className="flex-1 relative">
                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Video stream */}
                {state !== 'captured' && (
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                        playsInline
                        muted
                    />
                )}

                {/* Captured image preview */}
                {state === 'captured' && capturedImage && (
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Loading state */}
                {state === 'initializing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-center">
                            <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
                            <p className="text-white/80">正在启动相机...</p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {state === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-center px-8">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            <p className="text-white font-medium mb-2">{error}</p>
                            <button
                                onClick={startCamera}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
                            >
                                重试
                            </button>
                        </div>
                    </div>
                )}

                {/* Viewfinder overlay */}
                {state === 'ready' && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Corner markers */}
                        <div className="absolute top-1/4 left-1/4 w-8 h-8 border-t-2 border-l-2 border-white/50" />
                        <div className="absolute top-1/4 right-1/4 w-8 h-8 border-t-2 border-r-2 border-white/50" />
                        <div className="absolute bottom-1/4 left-1/4 w-8 h-8 border-b-2 border-l-2 border-white/50" />
                        <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-b-2 border-r-2 border-white/50" />
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-black/80 px-6 py-8 pb-safe">
                {state === 'captured' ? (
                    /* Captured photo controls */
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={handleRetake}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                                <RefreshCw size={24} />
                            </div>
                            <span className="text-white/70 text-xs">重拍</span>
                        </button>

                        <button
                            onClick={handleUsePhoto}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                                <ImageIcon size={28} />
                            </div>
                            <span className="text-white text-xs font-medium">使用此照片</span>
                        </button>
                    </div>
                ) : (
                    /* Camera controls */
                    <div className="flex items-center justify-center gap-8">
                        {/* Camera switch button */}
                        <button
                            onClick={handleSwitchCamera}
                            disabled={!hasMultipleCameras || state !== 'ready'}
                            className={`flex flex-col items-center gap-1 ${hasMultipleCameras && state === 'ready'
                                    ? 'opacity-100'
                                    : 'opacity-30 cursor-not-allowed'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                                <RefreshCw size={20} />
                            </div>
                            <span className="text-white/70 text-xs">切换</span>
                        </button>

                        {/* Capture button */}
                        <button
                            onClick={handleCapture}
                            disabled={state !== 'ready'}
                            className={`flex flex-col items-center gap-1 ${state === 'ready' ? 'opacity-100' : 'opacity-50'
                                }`}
                        >
                            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg transition-transform active:scale-95">
                                <div className="w-16 h-16 rounded-full border-4 border-gray-200" />
                            </div>
                            <span className="text-white text-xs font-medium">拍照</span>
                        </button>

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="flex flex-col items-center gap-1"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                                <X size={20} />
                            </div>
                            <span className="text-white/70 text-xs">取消</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CameraCapture;
