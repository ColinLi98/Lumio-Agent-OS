import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link to="/" className="navbar-logo">
                            <img
                                src="/logo.jpg"
                                alt="Lumi.AI"
                                style={{
                                    height: '40px',
                                    width: '40px',
                                    borderRadius: '10px',
                                    objectFit: 'cover'
                                }}
                            />
                            <span style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>Lumi.AI</span>
                        </Link>
                        <p>
                            Your AI-powered digital companion that truly understands you.
                            Experience the future of personalized AI assistance.
                        </p>
                        <div className="footer-social">
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                                <Twitter size={18} />
                            </a>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                <Github size={18} />
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                                <Linkedin size={18} />
                            </a>
                            <a href="mailto:hello@lumi.ai">
                                <Mail size={18} />
                            </a>
                        </div>
                    </div>

                    <div className="footer-column">
                        <h4>Product</h4>
                        <Link to="/product">Features</Link>
                        <Link to="/product">Digital Twin</Link>
                        <Link to="/product">LIX & Agent Market</Link>
                        <a href="https://lumi-agent-simulator.vercel.app" target="_blank" rel="noopener noreferrer">
                            Try Demo
                        </a>
                    </div>

                    <div className="footer-column">
                        <h4>Company</h4>
                        <Link to="/about">About Us</Link>
                        <Link to="/about">Team</Link>
                        <Link to="/contact">Contact</Link>
                        <a href="#">Careers</a>
                    </div>

                    <div className="footer-column">
                        <h4>Resources</h4>
                        <a href="#">Documentation</a>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <a href="#">Press Kit</a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 Lumi.AI. All rights reserved. Built with ❤️ for a smarter future.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
