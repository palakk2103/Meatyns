import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation as useRouterLocation, Link } from 'react-router-dom';
import { Search, Mic, ArrowLeft, X, TrendingUp, ChevronRight, History, ShoppingCart, MapPin, ChevronDown, Zap, CircleUserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { customerApi } from '../services/customerApi';
import ProductCard from '../components/shared/ProductCard';
import LocationDrawer from '../components/shared/LocationDrawer';
import { LeafLogo } from '../components/shared/MainLocationHeader';
import { useProductDetail } from '../context/ProductDetailContext';
import { useSettings } from '@core/context/SettingsContext';
import { cn } from '@/lib/utils';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import { getJSON, setJSON, STORAGE_KEYS } from '@core/utils/storage';
import Lottie from 'lottie-react';

const SearchPage = () => {
    const navigate = useNavigate();
    const location = useRouterLocation();
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const { settings } = useSettings();
    const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();
    const [isLocationOpen, setIsLocationOpen] = useState(false);
    const { cartCount } = useCart();
    const appName = settings?.appName || 'App';

    // Get initial query from URL state or params
    const initialQuery = location.state?.query || new URLSearchParams(location.search).get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    const [noServiceData, setNoServiceData] = useState(null);

    // Manage Recent Searches with LocalStorage
    const [pastSearches, setPastSearches] = useState(() => {
        const saved = getJSON(STORAGE_KEYS.RECENT_SEARCHES, []);
        return Array.isArray(saved) ? saved.filter((s) => typeof s === 'string') : [];
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 400); 
        return () => clearTimeout(timer);
    }, [query]);

    // Voice Search Logic (Enhanced)
    const handleVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice search is not supported in your browser. Please try Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setQuery(''); // Clear previous search if starting fresh
        };
        
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }

            if (transcript) {
                setQuery(transcript);
                // Save to history only if it's the final result
                if (event.results[event.results.length - 1].isFinal) {
                    saveSearch(transcript);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please enable it in your browser settings.');
            } else {
                console.warn('Voice recognition stopped due to error:', event.error);
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Recognition start error:', e);
            setIsListening(false);
        }
    };

    // Fetch search results from backend API dynamically
    useEffect(() => {
        let isCancelled = false;
        const fetchSearchResults = async () => {
            const trimmedQuery = debouncedQuery.trim();
            setIsLoading(true);
            try {
                const params = {
                    limit: 50,
                };
                if (trimmedQuery) {
                    params.search = trimmedQuery;
                }
                if (
                    Number.isFinite(currentLocation?.latitude) &&
                    Number.isFinite(currentLocation?.longitude)
                ) {
                    params.lat = currentLocation.latitude;
                    params.lng = currentLocation.longitude;
                }

                // Force refresh when user explicitly searches to bypass stale client cache
                const response = await customerApi.getProducts(params, {
                    forceRefresh: Boolean(trimmedQuery),
                });

                if (!isCancelled && response?.data?.success) {
                    const rawResult = response.data.result;
                    const dbProds = Array.isArray(response.data.results)
                        ? response.data.results
                        : Array.isArray(rawResult?.items)
                        ? rawResult.items
                        : Array.isArray(rawResult)
                        ? rawResult
                        : [];
                    const formattedProds = dbProds.map((p) => ({
                        ...p,
                        id: p._id,
                        image:
                            p.mainImage ||
                            p.image ||
                            "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=400&h=400",
                        price: p.salePrice || p.price,
                        originalPrice: p.price,
                        weight: p.weight || "",
                        deliveryTime: "8-15 mins",
                    }));

                    if (trimmedQuery) {
                        setResults(formattedProds);
                    } else {
                        setAllProducts(formattedProds);
                        setResults([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching search results:", error);
                if (!isCancelled && trimmedQuery) {
                    setResults([]);
                }
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        fetchSearchResults();

        return () => {
            isCancelled = true;
        };
    }, [debouncedQuery, currentLocation?.latitude, currentLocation?.longitude]);

    // Save search term to history
    const saveSearch = (term) => {
        if (!term || !term.trim()) return;
        const trimmed = term.trim();
        const updated = [trimmed, ...pastSearches.filter((s) => s !== trimmed)].slice(0, 10);
        setPastSearches(updated);
        setJSON(STORAGE_KEYS.RECENT_SEARCHES, updated);
    };

    // Remove specific search term
    const handleRemoveSearch = (e, term) => {
        e.stopPropagation();
        const updated = pastSearches.filter((s) => s !== term);
        setPastSearches(updated);
        setJSON(STORAGE_KEYS.RECENT_SEARCHES, updated);
    };

    // Trigger save on Enter or clicking a result
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            saveSearch(query);
        }
    };

    // Dynamically load no-service Lottie when results are empty
    useEffect(() => {
        if (!isLoading) {
            import('@/assets/lottie/animation.json')
                .then((m) => setNoServiceData(m.default))
                .catch(() => {});
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Lowest Price Section
    const lowestPriceProducts = useMemo(() => {
        return [...allProducts]
            .sort((a, b) => a.price - b.price)
            .slice(0, 10);
    }, [allProducts]);

    const handleClear = () => {
        setQuery('');
        setResults([]);
    };

    return (
        <div className="min-h-screen bg-[#FFF9F4] font-outfit">
            {/* Header / Search Input */}
            <div
                className={cn(
                    "sticky top-0 z-50 bg-white border-b-[3px] border-[#FAB82C] shadow-xs relative overflow-hidden",
                    isProductDetailOpen && "hidden md:block"
                )}
            >
                {/* ──── Desktop Header Layout (md+) matching Home Page ──── */}
                <div className="hidden md:flex items-center justify-between relative z-20 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-2">
                    {/* Left Section: Meatyns Official Brand Logo */}
                    <div
                        onClick={() => navigate('/')}
                        className="flex items-center cursor-pointer group shrink-0 select-none py-0.5"
                    >
                        <img
                            src="/meatyns_logo_2x.png"
                            alt="Meatyns"
                            className="h-8 lg:h-9 w-auto object-contain group-hover:scale-[1.03] transition-transform duration-200"
                        />
                    </div>

                    {/* Center Section: Pill Search Bar (matching Home Page desktop search bar) */}
                    <div className="flex-1 max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] mx-4 lg:mx-8">
                        <div className="w-full h-11 bg-white rounded-full px-4 flex items-center gap-3 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                            <Search size={18} className="text-[#111111] shrink-0 stroke-[2.2]" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search for meat, fish, seafood, etc..."
                                value={query}
                                onKeyDown={handleKeyDown}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    navigate(`/search?q=${encodeURIComponent(e.target.value)}`, { replace: true });
                                }}
                                className="flex-1 bg-transparent border-none outline-none text-[#111111] placeholder:text-slate-400 font-normal text-[13.5px]"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
                                >
                                    <X size={14} strokeWidth={2.5} className="text-slate-400 hover:text-slate-600" />
                                </button>
                            )}
                            <div className="w-[1px] h-4 bg-slate-200" />
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                className={cn(
                                    "p-1 transition-all rounded-full cursor-pointer relative border-0 bg-transparent",
                                    isListening ? "text-red-500 scale-110" : "text-[#111111] hover:opacity-80"
                                )}
                            >
                                <Mic size={17} strokeWidth={2.2} className={cn(isListening && "animate-pulse")} />
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Section: Delivery & Actions */}
                    <div className="flex items-center gap-6 lg:gap-8 shrink-0">
                        {/* Deliver to */}
                        <button
                            type="button"
                            onClick={() => {
                                refreshLocation?.();
                                setIsLocationOpen(true);
                            }}
                            className="flex items-center gap-2 text-left text-[#111111] bg-transparent border-0 p-0 cursor-pointer group hover:opacity-90 transition-opacity"
                        >
                            <MapPin size={20} className="text-[#111111] shrink-0 stroke-[2]" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-normal text-slate-500 tracking-wide leading-tight">
                                    Deliver to
                                </span>
                                <div className="flex items-center gap-1 text-[13px] lg:text-sm font-bold text-[#111111] leading-tight">
                                    <span className="max-w-[110px] lg:max-w-[140px] truncate">
                                        {isFetchingLocation
                                            ? "Detecting..."
                                            : (currentLocation?.name || "Indore")}
                                    </span>
                                    <ChevronDown size={13} className="text-slate-500 shrink-0" />
                                </div>
                            </div>
                        </button>

                        {/* Delivery in */}
                        <div className="flex items-center gap-2 text-[#111111]">
                            <Zap size={18} className="text-[#111111] fill-current shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-normal text-slate-500 tracking-wide leading-tight">
                                    Delivery in
                                </span>
                                <span className="text-[13px] lg:text-sm font-bold text-[#111111] whitespace-nowrap leading-tight">
                                    {currentLocation?.time || "12-15 mins"}
                                </span>
                            </div>
                        </div>

                        {/* Profile Icon */}
                        <button
                            type="button"
                            onClick={() => navigate("/profile")}
                            aria-label="Profile"
                            className="text-[#111111] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <CircleUserRound size={28} className="stroke-[1.8] text-[#111111]" />
                        </button>

                        {/* Cart Icon with badge */}
                        <button
                            type="button"
                            onClick={() => navigate("/cart")}
                            aria-label="Shopping Cart"
                            className="relative text-[#111111] hover:opacity-85 transition-opacity flex items-center justify-center p-1 bg-transparent border-0 cursor-pointer"
                        >
                            <ShoppingCart size={24} className="stroke-[2.2] text-[#111111]" />
                            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#C81017] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md leading-none">
                                {cartCount || 0}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ──── Mobile Search Header (Strictly md:hidden, preserved for mobile) ──── */}
                <div className="block md:hidden">
                    <div className="px-4 pt-3 pb-3 flex items-center justify-between gap-2.5 relative z-10 w-full">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full text-[#111111] border border-slate-200 transition-all flex-shrink-0 shadow-sm active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="w-full h-10 bg-white rounded-full px-3.5 flex items-center gap-2.5 shadow-xs border border-slate-200">
                                <Search size={17} className="text-[#111111] shrink-0 stroke-[2.2]" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search for meat, fish, seafood, etc..."
                                    value={query}
                                    onKeyDown={handleKeyDown}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        navigate(`/search?q=${encodeURIComponent(e.target.value)}`, { replace: true });
                                    }}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#111111] placeholder:text-slate-400 font-normal text-[13px]"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
                                    >
                                        <X size={14} strokeWidth={2.5} className="text-slate-400 hover:text-slate-600" />
                                    </button>
                                )}
                                <div className="w-[1px] h-4 bg-slate-200 shrink-0" />
                                <button
                                    type="button"
                                    onClick={handleVoiceSearch}
                                    className={cn(
                                        "p-1 transition-all rounded-full cursor-pointer relative border-0 bg-transparent shrink-0",
                                        isListening ? "text-red-500 scale-110" : "text-[#111111] hover:opacity-80"
                                    )}
                                >
                                    <Mic size={16} strokeWidth={2.2} className={cn(isListening && "animate-pulse")} />
                                    {isListening && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="min-h-[calc(100vh-68px)] bg-[#FFF9F4]">
                <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-5 md:py-8 space-y-8 pb-24">
                    {/* Search Results List */}
                    {query ? (
                        <section>
                            <div className="flex justify-between items-center mb-5 md:mb-6">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight font-serif">
                                    Search Results for <span className="text-[#111111] font-extrabold underline decoration-[#FAB82C] decoration-4">"{query}"</span>
                                </h2>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{results.length} found</span>
                            </div>

                            {results.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8 gap-2.5 sm:gap-3.5 md:gap-4">
                                    {results.map((product) => (
                                        <div key={product.id} onClick={() => saveSearch(query)} className="flex justify-center w-full">
                                            <ProductCard product={product} variant="homeDesktop" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 flex flex-col items-center text-center">
                                    <div className="w-48 h-48 md:w-64 md:h-64 mb-6">
                                        {noServiceData ? (
                                            <Lottie animationData={noServiceData} loop={true} />
                                        ) : (
                                            <div className="w-48 h-48 md:w-64 md:h-64" />
                                        )}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-2">No items found</h3>
                                    <p className="text-slate-500 font-medium max-w-xs text-sm">We couldn't find anything for "{query}". Try different keywords!</p>
                                </div>
                            )}
                        </section>
                    ) : (
                        <>
                            {/* 1. Recently Searched Item Section */}
                            {pastSearches.length > 0 && (
                                <section>
                                    <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recently Searched</h3>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {pastSearches.map((term) => (
                                            <div
                                                key={term}
                                                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 shadow-xs rounded-full whitespace-nowrap active:scale-95 transition-transform cursor-pointer hover:border-[#FAB82C]"
                                                onClick={() => {
                                                    setQuery(term);
                                                    navigate(`/search?q=${encodeURIComponent(term)}`, { replace: true });
                                                }}
                                            >
                                                <div className="h-5 w-5 rounded-full flex items-center justify-center bg-[#FAB82C]/20">
                                                    <History size={12} className="text-[#111111]" />
                                                </div>
                                                <span className="text-xs md:text-sm font-bold text-slate-700">{term}</span>
                                                <button
                                                    onClick={(e) => handleRemoveSearch(e, term)}
                                                    className="ml-1 p-0.5 hover:bg-slate-100 rounded-full transition-colors border-0 bg-transparent cursor-pointer"
                                                >
                                                    <X size={12} className="text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 2. Lowest Price Ever Section */}
                            <section>
                                <div className="flex justify-between items-center mb-5">
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight font-serif">Lowest Price Ever!</h2>
                                    <button 
                                        className="flex items-center gap-1 md:gap-1.5 px-3 py-1 md:px-4 md:py-1.5 bg-white border border-slate-200 hover:border-[#FAB82C] rounded-full text-xs md:text-sm font-bold text-[#111111] transition-all cursor-pointer" 
                                        onClick={() => navigate('/category/all')}
                                    >
                                        See All <ChevronRight size={14} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-x-auto no-scrollbar -mx-4 md:mx-0 px-4 md:px-0 pb-3 snap-x">
                                    {isLoading && allProducts.length === 0 ? (
                                        [...Array(5)].map((_, i) => (
                                            <div key={i} className="w-[136px] sm:w-[155px] md:w-[172px] shrink-0 h-48 sm:h-56 md:h-64 bg-white rounded-xl md:rounded-2xl animate-pulse border border-slate-100 shadow-xs" />
                                        ))
                                    ) : lowestPriceProducts.map((product) => (
                                        <div key={product.id} className="w-[136px] sm:w-[155px] md:w-[172px] shrink-0 snap-start flex justify-center">
                                            <ProductCard product={product} variant="homeDesktop" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            <LocationDrawer
                isOpen={isLocationOpen}
                onClose={() => setIsLocationOpen(false)}
            />
        </div>
    );
};

export default SearchPage;
