import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Beef,
    Apple,
    Milk,
    ShoppingBag,
    CupSoda,
    Cookie,
    Package,
    Heart,
    Headphones,
    Bike
} from 'lucide-react';

const mainCategories = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Meat & Seafood', icon: Beef, path: '/category/Meat%20%26%20Seafood' },
    { label: 'Fruits & Vegetables', icon: Apple, path: '/categories' },
    { label: 'Dairy & Eggs', icon: Milk, path: '/categories' },
    { label: 'Grocery', icon: ShoppingBag, path: '/categories' },
    { label: 'Beverages', icon: CupSoda, path: '/categories' },
    { label: 'Snacks & More', icon: Cookie, path: '/categories' },
];

const secondaryNav = [
    { label: 'My Orders', icon: Package, path: '/orders' },
    { label: 'Wishlist', icon: Heart, path: '/wishlist' },
    { label: 'Help & Support', icon: Headphones, path: '/support' },
];

const DesktopSidebarNav = () => {
    const location = useLocation();

    return (
        <aside className="w-56 lg:w-60 flex-shrink-0 select-none py-2">
            <div className="space-y-1">
                {mainCategories.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === '/' 
                        ? location.pathname === '/' 
                        : location.pathname.startsWith(item.path);

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                                isActive 
                                    ? 'text-[#741721] font-bold bg-[#741721]/10' 
                                    : 'text-slate-600 hover:text-[#741721] hover:bg-[#741721]/5'
                            }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[#741721]' : 'text-slate-500'} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            <hr className="my-4 border-slate-200/80" />

            <div className="space-y-1">
                {secondaryNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                                isActive 
                                    ? 'text-[#741721] font-bold bg-[#741721]/10' 
                                    : 'text-slate-600 hover:text-[#741721] hover:bg-[#741721]/5'
                            }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[#741721]' : 'text-slate-500'} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Free Delivery Promo Box */}
            <div className="mt-8 p-4 rounded-2xl bg-[#FDF2F2] border border-[#FADCDD] flex flex-col items-center text-center shadow-xs">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#741721] shadow-xs mb-2">
                    <Bike size={22} strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-[#741721]">Free Delivery</p>
                <p className="text-[11px] text-slate-500 mt-0.5">on orders above ₹499</p>
            </div>
        </aside>
    );
};

export default DesktopSidebarNav;
