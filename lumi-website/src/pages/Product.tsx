import { Link } from 'react-router-dom';
import {
    Sparkles,
    Brain,
    Shield,
    Users,
    Workflow,
    GitBranch,
    Database,
    Compass,
    BarChart3,
    Lock,
    CheckCircle2,
    ArrowRight,
    Activity
} from 'lucide-react';

const Product = () => {
    const pillars = [
        {
            icon: <Brain size={26} />,
            title: 'Codex as Primary Executor',
            summary:
                'User intent is routed to Codex first. Marketplace agents and skills are fallback and augmentation layers.',
            gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        },
        {
            icon: <Users size={26} />,
            title: 'Twin Prompt Compiler',
            summary:
                'Digital Twin signals are projected into controllable persona fragments: mood, style, risk, preferences, and memory hints.',
            gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
        },
        {
            icon: <Shield size={26} />,
            title: 'Privacy-Guarded Collaboration',
            summary:
                'Raw twin payloads are blocked at collaboration APIs. Local-first learning remains default unless users explicitly authorize sync.',
            gradient: 'linear-gradient(135deg, #06b6d4, #10b981)'
        }
    ];

    const loop = [
        {
            step: '1',
            title: 'Intent In',
            description:
                'User submits intent. Codex receives explicit constraints and required capabilities.'
        },
        {
            step: '2',
            title: 'Persona Compile',
            description:
                'Digital Twin state is compiled into a Persona Pack with controlled fields only.'
        },
        {
            step: '3',
            title: 'Plan & Route',
            description:
                'Codex builds task graph and chooses execution source per step: native, skill registry, or agent market.'
        },
        {
            step: '4',
            title: 'Execute & Fallback',
            description:
                'Execution carries twin preferences and trace metadata with evidence-aware fallback policy.'
        },
        {
            step: '5',
            title: 'Local Learnback',
            description:
                'Discovery, execution, and review outcomes are written back to the Digital Twin locally.'
        }
    ];

    const capabilities = [
        {
            icon: <Activity size={24} />,
            name: 'Shadow & Active Modes',
            desc: 'Run shadow comparisons first, then promote to active orchestration after quality gates.'
        },
        {
            icon: <Compass size={24} />,
            name: 'Explainable Twin Scoring',
            desc: 'Cards expose readable twin reasons: domain fit, evidence quality, latency, and tool affinity.'
        },
        {
            icon: <Database size={24} />,
            name: 'Structured Skill Context',
            desc: 'Skill execution gets orchestrator, trace, step, intent, and twin preference context.'
        },
        {
            icon: <GitBranch size={24} />,
            name: 'Import → Review → Sync',
            desc: 'GitHub import and review outcomes feed back into twin graph and capability priors.'
        },
        {
            icon: <BarChart3 size={24} />,
            name: 'Codex Benefit Metrics',
            desc: 'Track hit-rate, fallback-rate, latency deltas, and shadow sample quality for rollout decisions.'
        },
        {
            icon: <Lock size={24} />,
            name: 'Fallback Discipline',
            desc: 'Failed and timed-out runs never increase preference weights; successful runs strengthen priors.'
        }
    ];

    const layers = [
        {
            icon: <Brain size={24} />,
            title: 'Codex Native Reasoning',
            bullets: [
                'Task planning and decomposition',
                'Persona-aware response framing',
                'Fast path for pure reasoning tasks'
            ]
        },
        {
            icon: <Users size={24} />,
            title: 'Marketplace Agents',
            bullets: [
                'Domain-specific external and internal agents',
                'Evidence-aware fallback execution',
                'Manual execute compatibility preserved'
            ]
        },
        {
            icon: <Workflow size={24} />,
            title: 'Skill Registry',
            bullets: [
                'Local skills with backward-compatible signatures',
                'Structured execution context injection',
                'Top-skill feedback flows back to Digital Twin'
            ]
        }
    ];

    const guardrails = [
        'Raw Digital Twin payloads are rejected on collaboration APIs',
        'Persona projection only: controlled fields with versioned pack',
        'Privacy mode keeps automatic learning local-only',
        'User-authorized publish and sync flows remain explicit',
        'Local learnback continues even when cloud sync is disabled'
    ];

    const qualityGates = [
        { metric: 'Success Rate Delta', target: '>= 0' },
        { metric: 'Evidence Coverage', target: 'No regression' },
        { metric: 'P95 Latency', target: '<= +15%' },
        { metric: 'Fallback Rate', target: 'Controlled / declining' }
    ];

    return (
        <>
            <section className="hero" style={{ paddingTop: '140px', minHeight: 'auto' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="badge" style={{ margin: '0 auto 20px' }}>
                            <Sparkles size={16} />
                            <span>Product Update · Codex × Digital Twin</span>
                        </div>
                        <h1>Closed-Loop <span className="gradient-text">Codex Collaboration</span></h1>
                        <p style={{ maxWidth: '820px', margin: '0 auto' }}>
                            We found the core gap between humans and AI is emotion. Lumi bridges that gap by connecting
                            Digital Twin state to Codex orchestration, creating targeted and explainable task outcomes.
                        </p>
                    </div>

                    <div className="grid grid-3" style={{ gap: '20px', marginTop: '16px' }}>
                        {pillars.map((item, index) => (
                            <div key={index} className="card" style={{ padding: '28px', textAlign: 'left' }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '14px',
                                    background: item.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    marginBottom: '14px'
                                }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ marginBottom: '10px', fontSize: '1.15rem' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{item.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Collaboration <span className="gradient-text">Loop</span></h2>
                        <p>Human intent to execution to Digital Twin learnback</p>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: '16px'
                    }}>
                        {loop.map((item) => (
                            <div key={item.step} className="card" style={{ padding: '22px' }}>
                                <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    marginBottom: '12px'
                                }}>
                                    {item.step}
                                </div>
                                <h3 style={{ marginBottom: '8px', fontSize: '1.05rem' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Execution <span className="gradient-text">Capabilities</span></h2>
                        <p>What powers stable rollout and explainable quality improvements</p>
                    </div>
                    <div className="grid grid-3">
                        {capabilities.map((item, index) => (
                            <div key={index} className="card" style={{ padding: '24px' }}>
                                <div style={{ color: 'var(--primary)', marginBottom: '10px' }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ marginBottom: '8px', fontSize: '1.05rem' }}>{item.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>System <span className="gradient-text">Layers</span></h2>
                        <p>Codex, marketplace agents, and skills collaborate under one orchestration policy</p>
                    </div>
                    <div className="grid grid-3">
                        {layers.map((layer, index) => (
                            <div key={index} className="card" style={{ padding: '28px' }}>
                                <div style={{ color: 'var(--primary)', marginBottom: '10px' }}>{layer.icon}</div>
                                <h3 style={{ marginBottom: '12px' }}>{layer.title}</h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {layer.bullets.map((bullet, i) => (
                                        <li key={i} style={{
                                            display: 'flex',
                                            alignItems: 'start',
                                            gap: '8px',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.9rem',
                                            padding: '6px 0'
                                        }}>
                                            <CheckCircle2 size={14} style={{ color: 'var(--success)', marginTop: '3px', flexShrink: 0 }} />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="grid grid-2" style={{ gap: '28px', alignItems: 'stretch' }}>
                        <div className="card" style={{ padding: '30px' }}>
                            <h3 style={{ marginBottom: '12px' }}>Privacy Boundaries</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {guardrails.map((item, index) => (
                                    <li key={index} style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'start',
                                        padding: '8px 0',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9rem'
                                    }}>
                                        <CheckCircle2 size={14} style={{ color: 'var(--success)', marginTop: '3px', flexShrink: 0 }} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="card" style={{ padding: '30px' }}>
                            <h3 style={{ marginBottom: '12px' }}>Rollout Quality Gates</h3>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {qualityGates.map((item, index) => (
                                    <div key={index} style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '12px'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{item.metric}</span>
                                        <strong style={{ fontSize: '0.92rem' }}>{item.target}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="cta-section">
                        <h2>Explore Technology and Live Demo</h2>
                        <p>
                            Continue to the technical deep dive or run the interactive demo experience.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/technology" className="btn btn-primary">
                                Open Technology
                                <ArrowRight size={16} />
                            </Link>
                            <Link to="/live-demo" className="btn btn-secondary">
                                Open Live Demo
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Product;
