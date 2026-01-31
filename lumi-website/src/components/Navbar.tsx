import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const links = [
        { path: '/', label: 'Home' },
        { path: '/product', label: 'Product' },
        { path: '/about', label: 'About' },
        { path: '/contact', label: 'Contact' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
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
                    <span>Lumi.AI</span>
                </Link>

                <div className="navbar-links">
                    {links.map(link => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={{
                                color: location.pathname === link.path ? '#fff' : undefined
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="navbar-cta">
                    <a
                        href="https://lumi-agent-simulator.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        Try Demo
                    </a>
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'var(--nav-height)',
                    left: 0,
                    right: 0,
                    background: 'rgba(10, 10, 15, 0.98)',
                    backdropFilter: 'blur(20px)',
                    padding: '20px',
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    {links.map(link => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            style={{
                                display: 'block',
                                padding: '12px 0',
                                color: location.pathname === link.path ? '#fff' : 'var(--text-secondary)',
                                borderBottom: '1px solid var(--border-color)',
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
