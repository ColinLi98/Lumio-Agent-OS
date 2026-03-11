import React from 'react';
import { PenLine, Search, Bookmark } from 'lucide-react';

interface FeatureButtonsProps {
  onFeatureSelect: (feature: 'write' | 'find' | 'remember', prompt: string) => void;
  visible: boolean;
}

/**
 * Three core feature quick entries
 * Shown in Agent mode, click to auto-fill corresponding intent
 */
export const FeatureButtons: React.FC<FeatureButtonsProps> = ({
  onFeatureSelect,
  visible
}) => {
  if (!visible) return null;

  const features = [
    {
      id: 'write' as const,
      label: 'Write',
      icon: PenLine,
      prompt: 'Help me write',
      description: 'Generate a reply quickly',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'find' as const,
      label: 'Find',
      icon: Search,
      prompt: 'Help me find',
      description: 'Compare/search/navigate',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30'
    },
    {
      id: 'remember' as const,
      label: 'Remember',
      icon: Bookmark,
      prompt: 'Help me remember',
      description: 'Save important info',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    }
  ];

  return (
    <div className="feature-buttons-container">
      <div className="feature-buttons-header">
        <span className="text-xs text-indigo-300 font-medium">Choose a feature or type directly</span>
      </div>
      <div className="feature-buttons-grid">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onFeatureSelect(feature.id, feature.prompt)}
            className={`feature-button ${feature.bgColor} ${feature.borderColor}`}
          >
            <div className={`feature-icon bg-gradient-to-br ${feature.color}`}>
              <feature.icon size={18} className="text-white" />
            </div>
            <div className="feature-content">
              <span className="feature-label">{feature.label}</span>
              <span className="feature-desc">{feature.description}</span>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .feature-buttons-container {
          padding: 12px 16px;
          background: linear-gradient(180deg, rgba(49, 46, 129, 0.95) 0%, rgba(30, 27, 75, 0.98) 100%);
          border-top: 1px solid rgba(99, 102, 241, 0.2);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .feature-buttons-header {
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feature-buttons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .feature-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 12px;
          border: 1px solid;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          animation: fadeInScale 0.4s ease-out backwards;
        }

        .feature-button:nth-child(1) { animation-delay: 0.1s; }
        .feature-button:nth-child(2) { animation-delay: 0.2s; }
        .feature-button:nth-child(3) { animation-delay: 0.3s; }

        .feature-button:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }

        .feature-button:hover .feature-icon {
          animation: iconPulse 0.6s ease-in-out;
        }

        .feature-button:active {
          transform: translateY(0) scale(0.98);
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: box-shadow 0.25s ease;
        }

        .feature-button:hover .feature-icon {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .feature-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .feature-label {
          font-size: 13px;
          font-weight: 600;
          color: white;
          margin-bottom: 2px;
        }

        .feature-desc {
          font-size: 10px;
          color: rgba(199, 210, 254, 0.7);
          transition: color 0.2s ease;
        }

        .feature-button:hover .feature-desc {
          color: rgba(199, 210, 254, 1);
        }
      `}</style>
    </div>
  );
};

export default FeatureButtons;
