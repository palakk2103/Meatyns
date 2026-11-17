import React from 'react';
import { useSettings } from '@core/context/SettingsContext';

const MobileFooterMessage = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'Meatyns';
    return (
        <div className="md:hidden w-full flex flex-col items-center -mt-8 pt-0 pb-28 px-6 bg-transparent">
            <div className="w-full flex flex-col">
                <h2 className="text-[34px] leading-[1.1] font-black text-slate-300 tracking-tight text-left">
                    Freshness You<br />
                    <span className="whitespace-nowrap">
                        Can Count On.<span className="ml-2 text-[28px] align-middle">❤️</span>
                    </span>
                </h2>

                <div className="w-full h-[1px] bg-slate-200 mt-6 mb-4"></div>

                <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-black text-2xl tracking-tighter text-left">
                        {appName}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-slate-300">
                        Fresh. Fast. Reliable.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MobileFooterMessage;
