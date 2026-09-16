import React from 'react';
import { Zap, ShieldCheck, Lock } from 'lucide-react';

const DesktopDeliveryInfoCard = () => {
    return (
        <div className="w-64 xl:w-72 flex-shrink-0 space-y-4 select-none">
            {/* Delivery Information Card */}
            <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">
                    Delivery Information
                </h3>

                <div className="space-y-4">
                    {/* Fast Delivery */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                            <Zap size={16} className="text-slate-700" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">Fast Delivery</p>
                            <p className="text-[11px] text-slate-500">15-30 mins</p>
                        </div>
                    </div>

                    {/* Fresh & Hygienic */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-[#741721] flex-shrink-0">
                            <ShieldCheck size={16} className="text-[#741721]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">Fresh & Hygienic</p>
                            <p className="text-[11px] text-slate-500">100% quality check</p>
                        </div>
                    </div>

                    {/* Secure Packaging */}
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 flex-shrink-0">
                            <Lock size={15} className="text-slate-700" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">Secure Packaging</p>
                            <p className="text-[11px] text-slate-500">Leak-proof & safe</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promo Card: Fresh Choices for a Healthy You */}
            <div className="relative overflow-hidden rounded-2xl border border-[#ede5df] shadow-xs bg-[#fbf5f2] min-h-[300px] flex flex-col justify-end p-5">
                <img
                    src="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80"
                    alt="Fresh Meat"
                    className="absolute inset-0 w-full h-full object-cover object-center brightness-[0.92]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="relative z-10 text-center">
                    <p className="font-serif italic text-xl md:text-2xl text-white font-bold drop-shadow-md leading-snug">
                        Fresh Choices<br />
                        <span className="text-[#ffd3d8]">for a Healthy You</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DesktopDeliveryInfoCard;
