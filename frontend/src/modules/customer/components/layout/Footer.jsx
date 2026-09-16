import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, ShieldCheck, Snowflake, Zap } from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';
import { Link } from 'react-router-dom';

// Leaf outline emblem matching the Meatyns header logo
const LeafLogo = ({ className = "w-8 h-8 text-amber-400 shrink-0" }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 27C9 21 11.5 15.5 16 12C18 10.5 20.5 10 20.5 10C20.5 10 19.5 14.5 17 18C14.8 21 13 24 10 27Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 26C14 23 20 18 24 13C27.5 8.5 30 8 30 8C30 8 29.5 12.5 26 17.5C21.5 23.5 16 26.5 11 26Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 22C19 18 23.5 14.5 27.5 11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const Footer = () => {
    const { settings } = useSettings();

    return (
        <footer
            className="relative pt-16 pb-10 mt-16 md:mt-24 text-slate-300 overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #2D050D 0%, #1E0308 55%, #100204 100%)',
            }}
        >
            {/* Subtle Ambient Glow Overlays */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-[150px] bg-[#8B1528]" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-[150px] bg-[#E5A83B]" />
            </div>

            {/* Top Curved Divider transitioning from page background */}
            <div className="absolute top-[-1px] left-0 w-full overflow-hidden leading-[0] pointer-events-none">
                <svg
                    className="relative block w-[calc(100%+1.3px)] h-[25px] md:h-[45px]"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                >
                    <path d="M0,0 Q600,90 1200,0 V0 H0 Z" fill="#FFF9F4"></path>
                </svg>
            </div>

            <div className="container mx-auto px-4 lg:px-8 z-10 relative pt-4">
                {/* ──── Top Trust Strip ──── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-12 mb-12 border-b border-white/10">
                    <div className="flex items-center gap-3.5 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm leading-tight">100% Fresh &amp; Hygienic</h4>
                            <p className="text-white/60 text-xs mt-0.5">Sourced daily from certified farms</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="w-11 h-11 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-300 shrink-0">
                            <Snowflake size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm leading-tight">Chilled, Never Frozen</h4>
                            <p className="text-white/60 text-xs mt-0.5">Stored strictly at 0–4°C always</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400 shrink-0">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm leading-tight">15–30 Mins Express</h4>
                            <p className="text-white/60 text-xs mt-0.5">Fast temperature-controlled delivery</p>
                        </div>
                    </div>
                </div>

                {/* ──── 4-Column Main Grid ──── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
                    {/* Column 1: Brand Info */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3 select-none">
                            <LeafLogo className="w-9 h-9 text-amber-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[26px] font-serif font-bold text-white tracking-tight leading-none">
                                    Meat<span className="text-amber-400">yns</span>
                                </span>
                                <span className="text-[10.5px] font-medium text-white/70 tracking-widest uppercase mt-1">
                                    Fresh Meat &amp; Seafood
                                </span>
                            </div>
                        </div>

                        <p className="text-sm leading-relaxed text-white/80 font-normal">
                            Your trusted destination for farm-fresh chicken, tender mutton, ocean-fresh fish &amp; coastal seafood. Hygienically packed, temperature-controlled, and delivered fresh to your door.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 pt-2">
                            <a href={settings?.facebook || "#"} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 bg-white/10 hover:bg-amber-400/20 hover:text-amber-400 text-white rounded-full flex items-center justify-center transition-all active:scale-95">
                                <Facebook size={17} />
                            </a>
                            <a href={settings?.twitter || "#"} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-9 h-9 bg-white/10 hover:bg-amber-400/20 hover:text-amber-400 text-white rounded-full flex items-center justify-center transition-all active:scale-95">
                                <Twitter size={17} />
                            </a>
                            <a href={settings?.instagram || "#"} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 bg-white/10 hover:bg-amber-400/20 hover:text-amber-400 text-white rounded-full flex items-center justify-center transition-all active:scale-95">
                                <Instagram size={17} />
                            </a>
                            <a href={settings?.youtube || "#"} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-9 h-9 bg-white/10 hover:bg-amber-400/20 hover:text-amber-400 text-white rounded-full flex items-center justify-center transition-all active:scale-95">
                                <Youtube size={17} />
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1 w-4 bg-amber-400 rounded-full"></span> Quick Links
                        </h3>
                        <ul className="space-y-2.5 md:space-y-3.5">
                            <li><Link to="/" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Home</Link></li>
                            <li><Link to="/about" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>About Meatyns</Link></li>
                            <li><Link to="/category/all" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>All Categories</Link></li>
                            <li><Link to="/offers" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Offers &amp; Deals</Link></li>
                            <li><Link to="/support" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Customer Support</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Meatyns Categories */}
                    <div>
                        <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1 w-4 bg-amber-400 rounded-full"></span> Categories
                        </h3>
                        <ul className="space-y-2.5 md:space-y-3.5">
                            <li><Link to="/search?q=chicken" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Fresh Chicken</Link></li>
                            <li><Link to="/search?q=mutton" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Tender Mutton</Link></li>
                            <li><Link to="/search?q=fish" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Fish &amp; Seafood</Link></li>
                            <li><Link to="/search?q=prawns" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Prawns &amp; Crabs</Link></li>
                            <li><Link to="/search?q=meat" className="text-white/80 hover:text-amber-300 transition-colors text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-px bg-amber-400 group-hover:w-3 group-hover:mr-2 transition-all"></span>Prime Cuts &amp; Steaks</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Contact Info */}
                    <div>
                        <h3 className="text-white font-bold text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1 w-4 bg-amber-400 rounded-full"></span> Contact Us
                        </h3>
                        <ul className="space-y-3.5 md:space-y-4">
                            <li className="flex items-start gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-400/20 transition-colors">
                                    <MapPin size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-white/80 pt-1 font-medium leading-snug">
                                    {settings?.address || 'Ramkrishna Nagar, Patna 800020'}
                                </span>
                            </li>
                            <li className="flex items-center gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-400/20 transition-colors">
                                    <Phone size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-white/80 font-medium">
                                    {settings?.supportPhone || '+91 9555581201'}
                                </span>
                            </li>
                            <li className="flex items-center gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-400/20 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-white/80 font-medium">
                                    {settings?.supportEmail || 'support@meatyns.com'}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* ──── Bottom Legal & Copyright Bar ──── */}
                <div className="border-t border-white/10 mt-12 pt-8 text-center text-xs md:text-sm md:flex md:justify-between md:items-center">
                    <p className="text-white/60">
                        &copy; {new Date().getFullYear()} Meatyns. All rights reserved.
                    </p>
                    <div className="flex gap-6 justify-center md:justify-end mt-4 md:mt-0">
                        <Link to="/privacy" className="text-white/60 hover:text-amber-300 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="text-white/60 hover:text-amber-300 transition-colors">Terms of Service</Link>
                        <Link to="/shipping-policy" className="text-white/60 hover:text-amber-300 transition-colors">Shipping Policy</Link>
                        <Link to="/return-policy" className="text-white/60 hover:text-amber-300 transition-colors">Return Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
