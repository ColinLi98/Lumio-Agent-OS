import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, X, Hand, Zap, CheckCircle } from 'lucide-react';

interface OnboardingOverlayProps {
    onComplete: () => void;
    onSkip: () => void;
}

const ONBOARDING_KEY = 'lumi_onboarding_completed';

/**
 * Onboarding overlay
 * 3-step guide: long-press space -> choose feature -> see results
 */
export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete, onSkip }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            icon: <Hand size={48} className="text-indigo-400" />,
            title: 'Open an Entry Surface',
            description: 'Start from the Lumi App or long-press space in an input field to wake the IME agent entry',
            highlight: 'Cross-app intent intake'
        },
        {
            icon: <Zap size={48} className="text-amber-400" />,
            title: 'Clarify the Task',
            description: 'Add constraints, context, and missing details so Lumi can decompose the task correctly',
            highlight: 'Intent before execution'
        },
        {
            icon: <CheckCircle size={48} className="text-emerald-400" />,
            title: 'Review the Execution',
            description: 'Inspect the plan, evidence, and suggested next action before you commit',
            highlight: 'Explainable delivery'
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            onComplete();
        }
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        onSkip();
    };

    const currentStep = steps[step];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-[400px] bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-8 shadow-2xl border border-indigo-500/30 animate-scaleIn">
                {/* Skip Button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={20} className="text-indigo-400" />
                    <span className="text-indigo-300 text-sm font-medium">Welcome to Lumi Agent OS</span>
                </div>

                {/* Step Content */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center animate-pulse">
                        {currentStep.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {currentStep.title}
                    </h2>
                    <p className="text-slate-300 mb-2">
                        {currentStep.description}
                    </p>
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                        {currentStep.highlight}
                    </span>
                </div>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2 mb-6">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all ${index === step
                                    ? 'w-6 bg-indigo-500'
                                    : index < step
                                        ? 'bg-indigo-400'
                                        : 'bg-slate-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleNext}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-[1.02]"
                >
                    <span>{step === steps.length - 1 ? 'Start Now' : 'Next'}</span>
                    <ChevronRight size={18} />
                </button>

                {/* Step Counter */}
                <div className="text-center mt-4 text-slate-500 text-sm">
                    {step + 1} / {steps.length}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

// Check if onboarding should be shown
export const shouldShowOnboarding = (): boolean => {
    return localStorage.getItem(ONBOARDING_KEY) !== 'true';
};

// Reset onboarding (for testing)
export const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
};

export default OnboardingOverlay;
