import {
    Sparkles,
    Target,
    Heart,
    Lightbulb,
    Globe,
    Award,
    Linkedin,
    Twitter,
    GraduationCap,
    Briefcase,
    TrendingUp
} from 'lucide-react';

const About = () => {
    const values = [
        {
            icon: <Heart size={28} />,
            title: 'User-Centric',
            description: 'Every feature we build starts with user needs. We obsess over creating experiences that truly help people.'
        },
        {
            icon: <Target size={28} />,
            title: 'Privacy First',
            description: 'We believe your data belongs to you. Our technology is designed to keep your information private and secure.'
        },
        {
            icon: <Lightbulb size={28} />,
            title: 'Innovation',
            description: 'We push the boundaries of what AI can do, constantly exploring new ways to make technology more personal.'
        },
        {
            icon: <Globe size={28} />,
            title: 'Accessibility',
            description: 'AI assistance should be available to everyone, regardless of language, location, or technical ability.'
        }
    ];

    const team = [
        {
            name: 'Songyi Li',
            role: 'Founder & CEO',
            education: [
                'Ph.D. Candidate, Financial Technology (FinTech), University College London (UCL)',
                'M.Sc. Venture Capital and Private Equity (VCPE), UCL',
                'B.Sc. Mathematics, Xi\'an Jiaotong-Liverpool University & University of Liverpool'
            ],
            bio: 'Leading the convergence of FinTech innovation and AI-powered productivity tools.',
            image: null
        },
        {
            name: 'Bo Zhao',
            role: 'Co-Founder & COO',
            education: [
                'M.Sc. Venture Capital and Private Equity (VCPE), University College London (UCL)',
                'B.Sc. Finance, Durham University'
            ],
            experience: 'Former financial professional at Guosen Securities',
            bio: 'Bringing venture capital expertise and financial acumen to scale Lumi.AI globally.',
            image: null
        }
    ];

    const coreObjectives = [
        {
            number: 1,
            title: 'Product Utility',
            question: 'Do users adopt Lumi as their "Second Brain" for high-frequency input tasks?'
        },
        {
            number: 2,
            title: 'Privacy Value',
            question: 'Is "Local-First" data sovereignty a compelling driver for user conversion and brand loyalty?'
        },
        {
            number: 3,
            title: 'Monetization Potential',
            question: 'Confirming willingness to pay for premium, privacy-centric AI productivity tools?'
        }
    ];

    const milestones = [
        { year: '2024', event: 'Lumi.AI founded in London, UK' },
        { year: '2025', event: 'Seed Round target: $1,000,000' },
        { year: 'Dec 2025', event: 'Demo product concept initiated' },
        { year: 'Feb 2026', event: 'Demo product created' }
    ];

    const fundingAllocation = [
        { label: 'Product R&D', percentage: 70, color: '#6366f1' },
        { label: 'Market Acquisition', percentage: 20, color: '#8b5cf6' },
        { label: 'Legal & Compliance', percentage: 10, color: '#ec4899' }
    ];

    return (
        <>
            {/* Hero */}
            <section className="hero" style={{ paddingTop: '140px', minHeight: 'auto' }}>
                <div className="container">
                    <div className="section-header">
                        <div className="badge" style={{ margin: '0 auto 20px' }}>
                            <Sparkles size={16} />
                            <span>About Us</span>
                        </div>
                        <h1>The Convergence of <span className="gradient-text">FinTech & AI</span></h1>
                        <p style={{ maxWidth: '700px', margin: '0 auto' }}>
                            UCL innovation meets venture capital expertise. We're building the future
                            of personal AI with a privacy-first approach.
                        </p>
                    </div>
                </div>
            </section>

            {/* Vision Section */}
            <section className="section">
                <div className="container">
                    <div className="grid grid-2" style={{ alignItems: 'center', gap: '60px' }}>
                        <div>
                            <h2 style={{ marginBottom: '20px' }}>
                                Our <span className="gradient-text">Vision</span>
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1.1rem' }}>
                                At Lumi.AI, we're creating the world's most personal AI assistant —
                                one that becomes your "Second Brain" for everyday tasks while keeping
                                your data completely private.
                            </p>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                We found that the core gap between people and AI is <strong style={{ color: 'var(--primary)' }}>emotion</strong>.
                                Lumi builds a <strong style={{ color: 'var(--primary)' }}>Digital Twin</strong> for each user and connects it with
                                LLM reasoning, so recommendations can reflect personal preferences and current state.
                                Combined with <strong style={{ color: 'var(--primary)' }}>Super Agent orchestration</strong>, this creates more specific
                                and actionable outcomes while keeping data local-first.
                            </p>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Founded at University College London, we combine cutting-edge FinTech research
                                with practical venture capital experience to build technology that
                                truly respects user privacy and delivers exceptional utility.
                            </p>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                            borderRadius: '24px',
                            padding: '40px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    HEADQUARTERS
                                </h4>
                                <p style={{ fontSize: '1.1rem' }}>London, United Kingdom</p>
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    ACADEMIC PARTNER
                                </h4>
                                <p style={{ fontSize: '1.1rem' }}>University College London (UCL)</p>
                            </div>
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    SEED ROUND TARGET
                                </h4>
                                <p style={{ fontSize: '1.1rem' }}>$1,000,000</p>
                            </div>
                            <div>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    FOCUS AREAS
                                </h4>
                                <p style={{ fontSize: '1.1rem' }}>FinTech • AI Productivity • Privacy Tech</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Objectives */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="section-header">
                        <h2>Core <span className="gradient-text">Objectives</span></h2>
                        <p>The key questions driving our product development</p>
                    </div>

                    <div className="grid grid-3">
                        {coreObjectives.map((obj, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{ padding: '30px' }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    marginBottom: '16px'
                                }}>
                                    {obj.number}
                                </div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{obj.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    {obj.question}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Founding <span className="gradient-text">Team</span></h2>
                        <p>UCL innovation meets venture capital expertise</p>
                    </div>

                    <div className="grid grid-2" style={{ gap: '40px', maxWidth: '900px', margin: '0 auto' }}>
                        {team.map((member, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{ padding: '40px' }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: index === 0
                                        ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px',
                                    fontSize: '1.5rem',
                                    color: 'white',
                                    fontWeight: 600
                                }}>
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </div>

                                <h3 style={{ marginBottom: '4px', fontSize: '1.25rem' }}>{member.name}</h3>
                                <p style={{
                                    color: index === 0 ? '#f59e0b' : 'var(--primary)',
                                    fontSize: '0.9rem',
                                    marginBottom: '16px',
                                    fontWeight: 600
                                }}>
                                    {member.role}
                                </p>

                                <div style={{ marginBottom: '16px' }}>
                                    {member.education.map((edu, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '10px',
                                                padding: '8px 0',
                                                borderBottom: i < member.education.length - 1 ? '1px solid var(--border-color)' : 'none'
                                            }}
                                        >
                                            <GraduationCap size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                                {edu}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {member.experience && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 12px',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        borderRadius: '8px',
                                        marginBottom: '16px'
                                    }}>
                                        <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                            {member.experience}
                                        </p>
                                    </div>
                                )}

                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                    {member.bio}
                                </p>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <a
                                        href="#"
                                        style={{
                                            color: 'var(--text-muted)',
                                            transition: 'color 0.3s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                        <Linkedin size={18} />
                                    </a>
                                    <a
                                        href="#"
                                        style={{
                                            color: 'var(--text-muted)',
                                            transition: 'color 0.3s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                        <Twitter size={18} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Funding & Timeline */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="grid grid-2" style={{ gap: '60px' }}>
                        {/* Funding Allocation */}
                        <div className="card" style={{ padding: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <TrendingUp size={24} style={{ color: 'var(--primary)' }} />
                                <h3>Seed Round Target: $1,000,000</h3>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                {fundingAllocation.map((item, i) => (
                                    <div key={i} style={{ marginBottom: '16px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                                            <span style={{
                                                fontWeight: 600,
                                                color: item.color
                                            }}>{item.percentage}%</span>
                                        </div>
                                        <div style={{
                                            height: '8px',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${item.percentage}%`,
                                                height: '100%',
                                                background: item.color,
                                                borderRadius: '4px'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="card" style={{ padding: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <Award size={24} style={{ color: 'var(--primary)' }} />
                                <h3>Our Journey</h3>
                            </div>

                            {milestones.map((milestone, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        gap: '16px',
                                        padding: '12px 0',
                                        borderBottom: index < milestones.length - 1 ? '1px solid var(--border-color)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        width: '60px',
                                        flexShrink: 0,
                                        fontWeight: 700,
                                        color: 'var(--primary)'
                                    }}>
                                        {milestone.year}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)' }}>
                                        {milestone.event}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Our <span className="gradient-text">Values</span></h2>
                        <p>The principles that guide everything we do</p>
                    </div>

                    <div className="features-grid">
                        {values.map((value, index) => (
                            <div key={index} className="card feature-card">
                                <div className="feature-icon">
                                    {value.icon}
                                </div>
                                <h3>{value.title}</h3>
                                <p>{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Join Us CTA */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="cta-section">
                        <h2>Join Our Mission</h2>
                        <p>
                            We're building the future of personal AI in London.
                            Interested in joining or partnering with us?
                        </p>
                        <a href="/contact" className="btn btn-primary">
                            Get in Touch
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
};

export default About;
