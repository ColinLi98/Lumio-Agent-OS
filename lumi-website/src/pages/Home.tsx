import { Link } from 'react-router-dom';
import {
    Sparkles,
    Brain,
    Users,
    Shield,
    Zap,
    Download,
    ArrowRight,
    Globe,
    MessageSquare,
    Calendar
} from 'lucide-react';

const Home = () => {
    const features = [
        {
            icon: <Brain size={28} />,
            title: 'Digital Avatar',
            description: 'AI that learns your personality, preferences, and communication style over time.'
        },
        {
            icon: <Users size={28} />,
            title: 'Multi-Agent Orchestration',
            description: 'Multiple specialized AI agents working together to handle complex requests.'
        },
        {
            icon: <Shield size={28} />,
            title: 'Privacy-First',
            description: 'All personalization happens on-device. Your data never leaves your phone.'
        },
        {
            icon: <Zap size={28} />,
            title: 'Smart Context',
            description: 'Understands your app context and conversation history for better assistance.'
        }
    ];

    const stats = [
        { value: '100K+', label: 'Active Users' },
        { value: '50+', label: 'Languages' },
        { value: '10M+', label: 'AI Interactions' },
        { value: '99.9%', label: 'Uptime' }
    ];

    return (
        <>
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge badge">
                            <img
                                src="/logo.jpg"
                                alt=""
                                style={{
                                    height: '20px',
                                    width: '20px',
                                    borderRadius: '4px',
                                    objectFit: 'cover'
                                }}
                            />
                            <span>Your Second Brain for Mobile</span>
                        </div>

                        <h1>
                            AI-Powered<br />
                            <span className="gradient-text">Digital Companion</span>
                        </h1>

                        <p>
                            Lumi becomes your "Second Brain" for high-frequency input tasks.
                            With <strong>Local-First</strong> privacy and <strong>Digital Avatar</strong> personalization,
                            experience AI that truly understands you — all while your data never leaves your device.
                        </p>

                        <div className="hero-buttons">
                            <a
                                href="https://lumi-agent-simulator.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                            >
                                <Sparkles size={18} />
                                Try Demo
                            </a>
                            <Link to="/product" className="btn btn-secondary">
                                Learn More
                                <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="hero-visual" style={{ marginTop: '60px' }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '800px',
                                margin: '0 auto',
                                aspectRatio: '16/9',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                                borderRadius: '20px',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                                }} />
                                <iframe
                                    src="https://lumi-agent-simulator.vercel.app"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        borderRadius: '20px',
                                    }}
                                    title="Lumi.AI Demo"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Why Choose <span className="gradient-text">Lumi.AI</span></h2>
                        <p>
                            A new generation of AI assistance that adapts to you,
                            not the other way around.
                        </p>
                    </div>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="card feature-card">
                                <div className="feature-icon">
                                    {feature.icon}
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>How It <span className="gradient-text">Works</span></h2>
                        <p>
                            Lumi.AI seamlessly integrates into your daily life through
                            an intelligent keyboard that's always ready to help.
                        </p>
                    </div>

                    <div className="grid grid-3">
                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                fontSize: '32px',
                                color: 'white'
                            }}>
                                1
                            </div>
                            <h3 style={{ marginBottom: '12px' }}>Install & Learn</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Install the Lumi keyboard. It begins learning your communication style immediately.
                            </p>
                        </div>

                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                fontSize: '32px',
                                color: 'white'
                            }}>
                                2
                            </div>
                            <h3 style={{ marginBottom: '12px' }}>Ask Anything</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Type naturally. Lumi understands context and coordinates the right AI agents.
                            </p>
                        </div>

                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #ec4899, #06b6d4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                                fontSize: '32px',
                                color: 'white'
                            }}>
                                3
                            </div>
                            <h3 style={{ marginBottom: '12px' }}>Get Results</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Receive personalized, actionable results tailored to your preferences.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="section">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-item">
                                <h3>{stat.value}</h3>
                                <p>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tools Preview */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Built-in <span className="gradient-text">Smart Tools</span></h2>
                        <p>
                            Everything you need, right at your fingertips.
                        </p>
                    </div>

                    <div className="grid grid-4">
                        {[
                            { icon: <Globe size={24} />, name: 'Translation', desc: '50+ languages' },
                            { icon: <MessageSquare size={24} />, name: 'Write Assist', desc: 'Smart drafts' },
                            { icon: <Calendar size={24} />, name: 'Calendar', desc: 'Quick scheduling' },
                            { icon: <Zap size={24} />, name: 'Quick Actions', desc: 'One-tap tasks' }
                        ].map((tool, i) => (
                            <div key={i} className="card" style={{ textAlign: 'center', padding: '30px' }}>
                                <div style={{
                                    color: 'var(--primary)',
                                    marginBottom: '12px'
                                }}>
                                    {tool.icon}
                                </div>
                                <h4 style={{ marginBottom: '4px' }}>{tool.name}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tool.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section">
                <div className="container">
                    <div className="cta-section">
                        <h2>Ready to Transform Your Mobile Experience?</h2>
                        <p>
                            Join thousands of users who are already experiencing
                            the future of AI-powered assistance.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <a href="#" className="btn">
                                <Download size={18} />
                                Download for iOS
                            </a>
                            <a href="#" className="btn">
                                <Download size={18} />
                                Download for Android
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Home;
