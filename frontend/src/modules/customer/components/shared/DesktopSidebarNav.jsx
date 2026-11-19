import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Fish,
    Apple,
    Milk,
    ShoppingBag,
    CupSoda,
    Cookie,
    Package,
    Heart,
    Headphones,
} from 'lucide-react';

const mainCategories = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Fresh Chicken', icon: Package, path: '/category/chicken' },
    { label: 'Tender Mutton', icon: Package, path: '/category/mutton' },
    { label: 'All Categories', icon: ShoppingBag, path: '/categories' },
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
                                    ? 'text-[#1A1A1A] font-bold bg-[#FDCE04] shadow-xs' 
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#FFFBEB]'
                            }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[#1A1A1A]' : 'text-slate-500'} strokeWidth={1.8} />
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
                                    ? 'text-[#1A1A1A] font-bold bg-[#FDCE04] shadow-xs' 
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#FFFBEB]'
                            }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[#1A1A1A]' : 'text-slate-500'} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
};

export default DesktopSidebarNav;
