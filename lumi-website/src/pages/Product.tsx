import {
    Brain,
    Users,
    Sparkles,
    Shield,
    Zap,
    Globe,
    MessageSquare,
    Search,
    Calendar,
    BookOpen,
    Mic,
    Image,
    FileText,
    ArrowRight,
    Check
} from 'lucide-react';

const Product = () => {
    const coreFeatures = [
        {
            icon: <Brain size={32} />,
            title: 'Digital Avatar Personalization',
            description: 'Your AI learns and adapts to become a true extension of yourself.',
            details: [
                'Learns your writing style and tone preferences',
                'Remembers your interests, habits, and preferences',
                'Adapts responses based on context and mood',
                'Builds a private personality model over time'
            ],
            gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        },
        {
            icon: <Users size={32} />,
            title: 'Multi-Agent Orchestration',
            description: 'Multiple specialized AI agents working together seamlessly.',
            details: [
                'Flight, hotel, and restaurant booking agents',
                'Weather and travel planning coordination',
                'Smart task delegation and parallel execution',
                'Unified results with personalized recommendations'
            ],
            gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
        }
    ];

    const tools = [
        { icon: <Globe size={24} />, name: 'Translation', desc: 'Real-time translation in 50+ languages with context awareness' },
        { icon: <MessageSquare size={24} />, name: 'Write Assist', desc: 'Smart writing help that matches your unique style' },
        { icon: <Search size={24} />, name: 'Smart Search', desc: 'Find information with personalized results' },
        { icon: <Calendar size={24} />, name: 'Scheduling', desc: 'Quick calendar management and reminders' },
        { icon: <BookOpen size={24} />, name: 'Memory', desc: 'Save and recall important information instantly' },
        { icon: <Mic size={24} />, name: 'Voice Input', desc: 'Speak naturally with accurate transcription' },
        { icon: <Image size={24} />, name: 'OCR', desc: 'Extract text from images and documents' },
        { icon: <FileText size={24} />, name: 'Summarize', desc: 'Get quick summaries of long content' }
    ];

    const pricingPlans = [
        {
            name: 'Free',
            price: '$0',
            period: 'forever',
            features: [
                '100 AI interactions/day',
                'Basic personalization',
                '5 languages',
                'Standard tools',
                'Community support'
            ],
            cta: 'Get Started',
            highlighted: false
        },
        {
            name: 'Pro',
            price: '$9.99',
            period: 'per month',
            features: [
                'Unlimited AI interactions',
                'Advanced personalization',
                'All 50+ languages',
                'All tools + priority access',
                'Multi-agent orchestration',
                'Priority support',
                'Early access to new features'
            ],
            cta: 'Start Free Trial',
            highlighted: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: 'contact us',
            features: [
                'Everything in Pro',
                'Custom AI training',
                'Dedicated support team',
                'SLA guarantees',
                'On-premise deployment option',
                'API access',
                'Team management'
            ],
            cta: 'Contact Sales',
            highlighted: false
        }
    ];

    return (
        <>
            {/* Hero */}
            <section className="hero" style={{ paddingTop: '140px', minHeight: 'auto' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="badge" style={{ margin: '0 auto 20px' }}>
                            <Sparkles size={16} />
                            <span>Product Overview</span>
                        </div>
                        <h1>The Most <span className="gradient-text">Intelligent</span> AI Keyboard</h1>
                        <p style={{ maxWidth: '700px', margin: '0 auto' }}>
                            Lumi.AI transforms your mobile keyboard into a powerful AI assistant
                            that truly understands you. Experience AI that learns, adapts, and
                            coordinates to help you accomplish more.
                        </p>
                    </div>
                </div>
            </section>

            {/* Core Features */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Core <span className="gradient-text">Capabilities</span></h2>
                        <p>Two revolutionary features that set Lumi.AI apart</p>
                    </div>

                    <div className="grid grid-2" style={{ gap: '40px' }}>
                        {coreFeatures.map((feature, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{
                                    padding: '40px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: feature.gradient
                                }} />

                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    background: feature.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    marginBottom: '24px'
                                }}>
                                    {feature.icon}
                                </div>

                                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                                    {feature.title}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    {feature.description}
                                </p>

                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {feature.details.map((detail, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '8px 0',
                                                color: 'var(--text-secondary)',
                                                borderBottom: i < feature.details.length - 1 ? '1px solid var(--border-color)' : 'none'
                                            }}
                                        >
                                            <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* All Tools */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Smart <span className="gradient-text">Tools</span></h2>
                        <p>Everything you need, integrated into your keyboard</p>
                    </div>

                    <div className="grid grid-4">
                        {tools.map((tool, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{ padding: '30px', textAlign: 'center' }}
                            >
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                    margin: '0 auto 16px'
                                }}>
                                    {tool.icon}
                                </div>
                                <h4 style={{ marginBottom: '8px' }}>{tool.name}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {tool.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Privacy Section */}
            <section className="section">
                <div className="container">
                    <div className="grid grid-2" style={{ alignItems: 'center', gap: '60px' }}>
                        <div>
                            <div className="badge" style={{ marginBottom: '20px' }}>
                                <Shield size={16} />
                                <span>Privacy First</span>
                            </div>
                            <h2 style={{ marginBottom: '20px' }}>
                                Your Data Stays <span className="gradient-text">Yours</span>
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Unlike other AI assistants that send your data to the cloud,
                                Lumi.AI keeps your personal information on your device.
                                Your digital avatar is stored locally, and all personalization
                                happens on-device.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {[
                                    'On-device personalization model',
                                    'No personal data uploaded to servers',
                                    'End-to-end encryption for all communications',
                                    'GDPR and CCPA compliant',
                                    'Option to export or delete all data anytime'
                                ].map((item, i) => (
                                    <li
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 0',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Check size={14} style={{ color: 'var(--success)' }} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            borderRadius: '24px',
                            padding: '60px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <Shield size={80} style={{ color: 'var(--primary)', marginBottom: '24px' }} />
                            <h3 style={{ marginBottom: '12px' }}>100% Private</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Your keyboard data never leaves your device
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Simple, Transparent <span className="gradient-text">Pricing</span></h2>
                        <p>Choose the plan that works for you</p>
                    </div>

                    <div className="grid grid-3" style={{ gap: '30px' }}>
                        {pricingPlans.map((plan, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{
                                    padding: '40px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    border: plan.highlighted ? '2px solid var(--primary)' : undefined,
                                    transform: plan.highlighted ? 'scale(1.05)' : undefined
                                }}
                            >
                                {plan.highlighted && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-12px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: 'white',
                                        padding: '4px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        MOST POPULAR
                                    </div>
                                )}

                                <h3 style={{ marginBottom: '8px' }}>{plan.name}</h3>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>/{plan.period}</span>
                                </div>

                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: '24px 0',
                                    textAlign: 'left'
                                }}>
                                    {plan.features.map((feature, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '8px 0',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ width: '100%' }}
                                >
                                    {plan.cta}
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section">
                <div className="container">
                    <div className="cta-section">
                        <Zap size={48} style={{ marginBottom: '20px' }} />
                        <h2>Ready to Experience the Future?</h2>
                        <p>
                            Try Lumi.AI free for 14 days. No credit card required.
                        </p>
                        <a
                            href="https://lumi-agent-simulator.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            <Sparkles size={18} />
                            Try Demo Now
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Product;
