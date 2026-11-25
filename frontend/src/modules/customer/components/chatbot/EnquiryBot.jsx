import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Phone, Home, Bot } from 'lucide-react';
import { BOT_NODES, BOT_START, SUPPORT_PHONE } from '../../constants/enquiryBotConfig';

const telHref = (p) => `tel:${p.replace(/[^\d+]/g, '')}`;

const startHistory = () => [{ from: 'bot', text: BOT_NODES[BOT_START].message, nodeId: BOT_START }];

const CallCard = () => (
    <a
        href={telHref(SUPPORT_PHONE)}
        className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-green-800 active:scale-[0.98] transition"
    >
        <span className="h-9 w-9 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
            <Phone size={18} />
        </span>
        <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Need help? Call us</span>
            <span className="text-base font-black">{SUPPORT_PHONE}</span>
        </span>
    </a>
);

const EnquiryBot = () => {
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState(startHistory);
    const scrollRef = useRef(null);

    const currentId = history[history.length - 1].nodeId;
    const current = BOT_NODES[currentId] || BOT_NODES[BOT_START];

    // Lock page scroll behind the full-screen chat on mobile.
    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, open]);

    const choose = (opt) => {
        const node = BOT_NODES[opt.next];
        if (!node) return;
        setHistory((h) => [...h, { from: 'user', text: opt.label }, { from: 'bot', text: node.message, nodeId: opt.next }]);
    };

    return (
        <>
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open enquiry chat"
                    className="fixed right-4 bottom-[150px] md:bottom-6 md:right-6 z-[60] h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition"
                >
                    <MessageCircle size={28} fill="currentColor" strokeWidth={1.5} />
                </button>
            )}

            {open && (
                <div className="fixed z-[600] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[620px] md:max-h-[calc(100dvh-48px)] bg-white md:rounded-3xl shadow-2xl md:border md:border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 md:zoom-in-95">
                    <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 flex items-center gap-3">
                        <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center"><Bot size={20} /></span>
                        <div className="flex-1 leading-tight">
                            <p className="font-black text-sm">Meatyns Support</p>
                            <p className="text-[11px] opacity-90">Bulk orders & enquiries</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="p-1.5 rounded-full hover:bg-white/20">
                            <X size={20} />
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3 space-y-2">
                        {history.map((m, i) => (
                            <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                                <div
                                    className={
                                        m.from === 'user'
                                            ? 'max-w-[80%] bg-brand-600 text-white text-sm font-medium px-3.5 py-2 rounded-2xl rounded-br-md'
                                            : 'max-w-[85%] bg-white border border-slate-200 text-slate-800 text-sm px-3.5 py-2 rounded-2xl rounded-bl-md'
                                    }
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-200 bg-white flex flex-col max-h-[60%]">
                        <div className="overflow-y-auto p-3 pb-2 space-y-2">
                            {current.options.map((opt) => (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => choose(opt)}
                                    className="w-full text-left text-sm font-semibold text-brand-700 border border-brand-200 bg-brand-50 rounded-xl px-3.5 py-2.5 active:scale-[0.98] transition"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-3 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-1 shrink-0">
                            <CallCard />
                            {currentId !== BOT_START && (
                                <button
                                    type="button"
                                    onClick={() => setHistory(startHistory())}
                                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 py-1"
                                >
                                    <Home size={14} /> Main menu
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EnquiryBot;
