import React from 'react';

const MobileFooterMessage = () => {
    return (
        <div className="md:hidden w-full flex flex-col items-center pt-6 pb-32 px-6 bg-transparent">
            <div className="relative w-40 h-48 flex items-center justify-center">
                <img
                    src="/mascot/chef_mascot.png"
                    alt="Meatyns Chef Mascot"
                    className="max-h-full max-w-full object-contain select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.12)]"
                    draggable="false"
                    loading="lazy"
                />
            </div>

            <img
                src="/meatyns_logo_2x.png"
                alt="Meatyns"
                className="mt-3 h-9 w-auto object-contain select-none mix-blend-multiply"
                draggable="false"
                loading="lazy"
            />

            <div className="flex items-center gap-3 mt-3">
                <span className="h-[2px] w-8 rounded-full bg-gradient-to-r from-transparent to-red-500"></span>
                <p className="text-[15px] font-extrabold tracking-wide text-slate-800">
                    Click it <span className="text-red-600">&amp;</span> Get it
                </p>
                <span className="h-[2px] w-8 rounded-full bg-gradient-to-l from-transparent to-red-500"></span>
            </div>

            <p className="mt-2 text-[10px] font-bold uppercase tracking-[3px] text-slate-400">
                Fresh · Fast · Reliable
            </p>
        </div>
    );
};

export default MobileFooterMessage;
