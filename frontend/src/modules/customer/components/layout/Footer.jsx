import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, ShieldCheck, Snowflake, Zap } from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';
import { Link } from 'react-router-dom';

const Footer = () => {
    const { settings } = useSettings();

    return (
        <footer
            className="relative pt-16 pb-10 mt-16 md:mt-24 text-[#1A1A1A] overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #FECD04 0%, #FDCE04 55%, #F5C502 100%)',
            }}
        >
            {/* Subtle Ambient Glow Overlays */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-40 blur-[140px] bg-amber-200" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-30 blur-[140px] bg-yellow-300" />
            </div>

            {/* Top Curved Divider transitioning from page background */}
            <div className="absolute top-[-1px] left-0 w-full overflow-hidden leading-[0] pointer-events-none">
                <svg
                    className="relative block w-[calc(100%+1.3px)] h-[25px] md:h-[45px]"
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                >
                    <path d="M0,0 Q600,90 1200,0 V0 H0 Z" fill="#F8FAFC"></path>
                </svg>
            </div>

            <div className="container mx-auto px-4 lg:px-8 z-10 relative pt-4">
                {/* ──── Top Trust Strip ──── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-12 mb-12 border-b border-black/10">
                    <div className="flex items-center gap-3.5 bg-black/5 hover:bg-black/[0.08] transition-all rounded-2xl p-4 border border-black/10 shadow-sm backdrop-blur-sm">
                        <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-[#FDCE04] shrink-0 shadow-sm">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h4 className="text-[#1A1A1A] font-extrabold text-sm leading-tight">100% Fresh &amp; Hygienic</h4>
                            <p className="text-[#1A1A1A]/75 text-xs font-medium mt-0.5">Sourced daily from certified farms</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-black/5 hover:bg-black/[0.08] transition-all rounded-2xl p-4 border border-black/10 shadow-sm backdrop-blur-sm">
                        <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-[#FDCE04] shrink-0 shadow-sm">
                            <Snowflake size={22} />
                        </div>
                        <div>
                            <h4 className="text-[#1A1A1A] font-extrabold text-sm leading-tight">Chilled, Never Frozen</h4>
                            <p className="text-[#1A1A1A]/75 text-xs font-medium mt-0.5">Stored strictly at 0–4°C always</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-black/5 hover:bg-black/[0.08] transition-all rounded-2xl p-4 border border-black/10 shadow-sm backdrop-blur-sm">
                        <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-[#FDCE04] shrink-0 shadow-sm">
                            <Zap size={22} />
                        </div>
                        <div>
                            <h4 className="text-[#1A1A1A] font-extrabold text-sm leading-tight">15–30 Mins Express</h4>
                            <p className="text-[#1A1A1A]/75 text-xs font-medium mt-0.5">Fast temperature-controlled delivery</p>
                        </div>
                    </div>
                </div>

                {/* ──── 4-Column Main Grid ──── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
                    {/* Column 1: Brand Info */}
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex items-center gap-3 select-none">
                            <img
                                src="/meatyns_logo_2x.png"
                                alt="Meatyns"
                                className="h-9 w-auto object-contain"
                            />
                        </div>

                        <p className="text-sm leading-relaxed text-[#1A1A1A]/85 font-medium">
                            Your trusted destination for farm-fresh chicken, tender mutton, ocean-fresh fish &amp; coastal seafood. Hygienically packed, temperature-controlled, and delivered fresh to your door.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 pt-2">
                            <a href={settings?.facebook || "#"} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 bg-black/10 hover:bg-black hover:text-[#FDCE04] text-[#1A1A1A] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <Facebook size={17} />
                            </a>
                            <a href={settings?.twitter || "#"} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-9 h-9 bg-black/10 hover:bg-black hover:text-[#FDCE04] text-[#1A1A1A] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <Twitter size={17} />
                            </a>
                            <a href={settings?.instagram || "#"} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 bg-black/10 hover:bg-black hover:text-[#FDCE04] text-[#1A1A1A] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <Instagram size={17} />
                            </a>
                            <a href={settings?.youtube || "#"} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-9 h-9 bg-black/10 hover:bg-black hover:text-[#FDCE04] text-[#1A1A1A] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <Youtube size={17} />
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h3 className="text-[#1A1A1A] font-black text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1.5 w-4 bg-black rounded-full"></span> Quick Links
                        </h3>
                        <ul className="space-y-2.5 md:space-y-3.5">
                            <li><Link to="/" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Home</Link></li>
                            <li><Link to="/about" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>About Meatyns</Link></li>
                            <li><Link to="/category/all" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>All Categories</Link></li>
                            <li><Link to="/offers" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Offers &amp; Deals</Link></li>
                            <li><Link to="/support" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Customer Support</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Meatyns Categories */}
                    <div>
                        <h3 className="text-[#1A1A1A] font-black text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1.5 w-4 bg-black rounded-full"></span> Categories
                        </h3>
                        <ul className="space-y-2.5 md:space-y-3.5">
                            <li><Link to="/search?q=chicken" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Fresh Chicken</Link></li>
                            <li><Link to="/search?q=mutton" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Tender Mutton</Link></li>
                            <li><Link to="/search?q=fish" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Fish &amp; Seafood</Link></li>
                            <li><Link to="/search?q=prawns" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Prawns &amp; Crabs</Link></li>
                            <li><Link to="/search?q=meat" className="text-[#1A1A1A]/80 hover:text-black hover:font-bold transition-all text-sm md:text-[15px] font-medium flex items-center group"><span className="w-0 h-0.5 bg-black group-hover:w-3 group-hover:mr-2 transition-all rounded-full"></span>Prime Cuts &amp; Steaks</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Contact Info */}
                    <div>
                        <h3 className="text-[#1A1A1A] font-black text-base md:text-lg mb-4 md:mb-6 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-1.5 w-4 bg-black rounded-full"></span> Contact Us
                        </h3>
                        <ul className="space-y-3.5 md:space-y-4">
                            <li className="flex items-start gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black shrink-0 group-hover:bg-black group-hover:text-[#FDCE04] transition-colors">
                                    <MapPin size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-[#1A1A1A]/85 pt-1 font-medium leading-snug">
                                    {settings?.address || 'Ramkrishna Nagar, Patna 800020'}
                                </span>
                            </li>
                            <li className="flex items-center gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black shrink-0 group-hover:bg-black group-hover:text-[#FDCE04] transition-colors">
                                    <Phone size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-[#1A1A1A]/85 font-medium">
                                    {settings?.supportPhone || '+91 9555581201'}
                                </span>
                            </li>
                            <li className="flex items-center gap-3.5 group">
                                <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black shrink-0 group-hover:bg-black group-hover:text-[#FDCE04] transition-colors">
                                    <Mail size={18} />
                                </div>
                                <span className="text-sm md:text-[14.5px] text-[#1A1A1A]/85 font-medium">
                                    {settings?.supportEmail || 'support@meatyns.com'}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* ──── Bottom Legal & Copyright Bar ──── */}
                <div className="border-t border-black/15 mt-12 pt-8 text-center text-xs md:text-sm md:flex md:justify-between md:items-center">
                    <p className="text-[#1A1A1A]/70 font-medium">
                        &copy; {new Date().getFullYear()} Meatyns. All rights reserved.
                    </p>
                    <div className="flex gap-6 justify-center md:justify-end mt-4 md:mt-0 font-medium">
                        <Link to="/privacy" className="text-[#1A1A1A]/70 hover:text-black transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="text-[#1A1A1A]/70 hover:text-black transition-colors">Terms of Service</Link>
                        <Link to="/shipping-policy" className="text-[#1A1A1A]/70 hover:text-black transition-colors">Shipping Policy</Link>
                        <Link to="/return-policy" className="text-[#1A1A1A]/70 hover:text-black transition-colors">Return Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
