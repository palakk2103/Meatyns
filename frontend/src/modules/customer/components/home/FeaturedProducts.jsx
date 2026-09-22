import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../shared/ProductCard';

const products = [
    {
        id: 1,
        name: 'Mutton Curry Cut (with bone)',
        category: 'Meat',
        price: 349,
        originalPrice: 389,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 2,
        name: 'Chicken Thigh (Juicy Cuts)',
        category: 'Chicken',
        price: 129,
        originalPrice: 159,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 3,
        name: 'Fresh Surmai (King Fish) Steaks',
        category: 'Fish',
        price: 389,
        originalPrice: 439,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 4,
        name: 'Chicken Breast Boneless',
        category: 'Chicken',
        price: 169,
        originalPrice: 199,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 5,
        name: 'Fresh Rohu Fish Curry Cut',
        category: 'Fish',
        price: 199,
        originalPrice: 249,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 6,
        name: 'Jumbo Tiger Prawns (Cleaned)',
        category: 'Seafood',
        price: 299,
        originalPrice: 349,
        weight: '250 g',
        image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=600&h=600',
    },
];

const FeaturedProducts = () => {
    return (
        <section className="py-12 bg-white">
            <div className="container w-full max-w-[1920px] mx-auto px-4 md:px-[50px]">
                <div className="flex flex-row items-end justify-between mb-8 gap-4 text-left">
                    <div className="space-y-1">
                        <span className="text-brand-600 font-semibold tracking-wide uppercase text-sm">Best Seller</span>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Featured Products</h2>
                    </div>
                    <Link to="/categories" className="hidden md:inline-flex text-brand-600 font-medium hover:text-brand-700 hover:underline">
                        View All Products &rarr;
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

                <div className="mt-8 text-center md:hidden">
                    <Link to="/categories" className="inline-flex text-brand-600 font-medium hover:text-brand-700 hover:underline">
                        View All Products &rarr;
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FeaturedProducts;
