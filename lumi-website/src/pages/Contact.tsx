import { useState } from 'react';
import {
    Sparkles,
    Mail,
    MapPin,
    Send,
    MessageCircle,
    Clock,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'general',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: 'general', message: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const contactMethods = [
        {
            icon: <Mail size={24} />,
            title: 'Email Us',
            detail: 'hello@lumi.ai',
            description: 'We respond within 24 hours'
        },
        {
            icon: <MapPin size={24} />,
            title: 'Visit Us',
            detail: 'London, UK',
            description: 'University College London Area'
        },
        {
            icon: <MessageCircle size={24} />,
            title: 'Pilot & Partnerships',
            detail: 'Request via form',
            description: 'Tell us your use case and timeline'
        }
    ];

    const faqs = [
        {
            question: 'Where can I try Lumi today?',
            answer: 'You can try the live web demo now at lumi-agent-simulator.vercel.app. Mobile pilot access is provided by invitation while we validate module-level workflows.'
        },
        {
            question: 'Why is Digital Twin important in Lumi?',
            answer: 'We found the key gap between people and AI is emotion. Lumi builds a Digital Twin that captures user preferences and current state, then connects this context to LLM reasoning for more targeted suggestions.'
        },
        {
            question: 'How does Lumi protect user privacy?',
            answer: 'Lumi uses a local-first architecture. Sensitive fields are masked before telemetry, and cloud sync is optional behind explicit user consent.'
        },
        {
            question: 'What is Agent Mode in practice?',
            answer: 'Agent Mode is triggered by long-pressing Space in the keyboard. Super Agent then routes tasks through single-agent or multi-agent execution and returns explainable results.'
        },
        {
            question: 'Do you support LIX and Agent Marketplace flows?',
            answer: 'Yes. Lumi includes intent-to-delivery workflows through LIX, plus discover-and-execute workflows in Agent Marketplace, with status and outcome tracking.'
        },
        {
            question: 'How can I delete my data?',
            answer: 'In Lumi settings, users can export or delete profile data at any time. Deletion removes local personalization artifacts and related local records.'
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
                            <span>Contact Us</span>
                        </div>
                        <h1>Get in <span className="gradient-text">Touch</span></h1>
                        <p style={{ maxWidth: '700px', margin: '0 auto' }}>
                            Have questions, feedback, or partnership inquiries?
                            We'd love to hear from you.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Methods */}
            <section className="section" style={{ paddingTop: '40px' }}>
                <div className="container">
                    <div className="grid grid-3">
                        {contactMethods.map((method, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{ padding: '30px', textAlign: 'center' }}
                            >
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)',
                                    margin: '0 auto 16px'
                                }}>
                                    {method.icon}
                                </div>
                                <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{method.title}</h3>
                                <p style={{
                                    color: 'var(--primary)',
                                    fontWeight: 500,
                                    marginBottom: '4px'
                                }}>
                                    {method.detail}
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {method.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="section" style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
                <div className="container">
                    <div className="grid grid-2" style={{ gap: '60px', alignItems: 'start' }}>
                        {/* Form */}
                        <div className="card" style={{ padding: '40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <MessageCircle size={24} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ margin: 0 }}>Send a Message</h2>
                            </div>

                            {submitted ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: '16px'
                                }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: 'var(--success)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 16px'
                                    }}>
                                        <Send size={24} color="white" />
                                    </div>
                                    <h3 style={{ marginBottom: '8px' }}>Message Sent!</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Thank you for reaching out. We'll get back to you within 24 hours.
                                    </p>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ marginTop: '20px' }}
                                        onClick={() => setSubmitted(false)}
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Your Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="form-input"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-input"
                                            placeholder="john@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Subject</label>
                                        <select
                                            name="subject"
                                            className="form-input"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <option value="general">General Inquiry</option>
                                            <option value="support">Technical Support</option>
                                            <option value="partnership">Partnership</option>
                                            <option value="press">Press & Media</option>
                                            <option value="careers">Careers</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Message</label>
                                        <textarea
                                            name="message"
                                            className="form-input"
                                            placeholder="Tell us how we can help..."
                                            rows={5}
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            style={{ resize: 'vertical', minHeight: '120px' }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: '100%' }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="loading-spinner" style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    border: '2px solid rgba(255,255,255,0.3)',
                                                    borderTopColor: 'white',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Info */}
                        <div>
                            <div className="card" style={{ padding: '30px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <Clock size={20} style={{ color: 'var(--primary)' }} />
                                    <h4 style={{ margin: 0 }}>Response Time</h4>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                    We typically respond within 24 hours during business days.
                                    For pilot and partnership requests, include your team size and timeline.
                                </p>
                            </div>

                            <div className="card" style={{ padding: '30px' }}>
                                <h4 style={{ marginBottom: '16px' }}>Connect With Us</h4>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {['Twitter', 'LinkedIn', 'Discord', 'GitHub'].map((platform) => (
                                        <a
                                            key={platform}
                                            href="#"
                                            style={{
                                                padding: '12px 20px',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: '10px',
                                                color: 'var(--text-primary)',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = 'var(--primary)';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                                e.currentTarget.style.color = 'var(--text-primary)';
                                            }}
                                        >
                                            {platform}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Frequently Asked <span className="gradient-text">Questions</span></h2>
                        <p>Quick answers to common questions</p>
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="card"
                                style={{
                                    marginBottom: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '20px 24px'
                                }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{faq.question}</h4>
                                    {expandedFaq === index ? (
                                        <ChevronUp size={20} style={{ color: 'var(--primary)' }} />
                                    ) : (
                                        <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
                                    )}
                                </div>

                                {expandedFaq === index && (
                                    <div style={{
                                        padding: '0 24px 20px',
                                        color: 'var(--text-secondary)',
                                        borderTop: '1px solid var(--border-color)',
                                        marginTop: '-4px',
                                        paddingTop: '16px'
                                    }}>
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Map/Location placeholder */}
            <section className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div style={{
                        width: '100%',
                        height: '300px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <MapPin size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                            <h3 style={{ marginBottom: '8px' }}>London, United Kingdom</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                University College London Area, WC1E 6BT
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Contact;
