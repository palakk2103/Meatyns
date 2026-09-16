import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { cn } from '@/lib/utils';

/* ──── Header Burgundy palette ──── */
const MEAT_PRIMARY = '#741721';
const INACTIVE_COLOR = '#6B7280';

const navItems = [
    { label: 'Home', icon: Home, path: '/', isHome: true },
    { label: 'Categories', icon: LayoutGrid, path: '/categories' },
    { label: 'Cart', icon: ShoppingCart, path: '/checkout', isCart: true },
    { label: 'Orders', icon: ClipboardList, path: '/orders' },
    { label: 'Account', icon: User, path: '/profile' },
];

const BottomNav = () => {
    const location = useLocation();
    const { cartCount } = useCart();

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[500] md:hidden border-t flex items-center justify-around h-[62px] sm:h-[66px] px-1 pb-[env(safe-area-inset-bottom)]"
            style={{
                background: '#ffffff',
                borderColor: '#F0E6E6',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
            }}
        >
            {navItems.map((item) => {
                const isActive =
                    item.path === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.path);

                const IconComponent = item.icon;

                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className="flex-1 flex flex-col items-center justify-center h-full relative select-none active:scale-95 transition-transform"
                    >
                        <div className="flex flex-col items-center justify-center relative">
                            {/* Icon wrapper */}
                            <div className="relative flex items-center justify-center">
                                <IconComponent
                                    size={21}
                                    strokeWidth={isActive ? 2.4 : 1.9}
                                    style={{
                                        color: isActive ? MEAT_PRIMARY : INACTIVE_COLOR,
                                        fill: (isActive && item.isHome) ? MEAT_PRIMARY : 'none',
                                    }}
                                    className="transition-colors duration-200"
                                />

                                {/* Red Cart Badge */}
                                {item.isCart && cartCount > 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#E53935] text-white text-[9.5px] font-black rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(229,57,53,0.5)] leading-none border border-white"
                                    >
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    'text-[10px] sm:text-[10.5px] mt-1 tracking-tight transition-colors duration-200',
                                    isActive ? 'font-black' : 'font-semibold',
                                )}
                                style={{
                                    color: isActive ? MEAT_PRIMARY : INACTIVE_COLOR,
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

export default BottomNav;
