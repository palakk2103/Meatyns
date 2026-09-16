import React from 'react';
import ProductCard from '../components/shared/ProductCard';

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
        name: 'Chicken Thigh',
        category: 'Chicken',
        price: 129,
        originalPrice: 159,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 3,
        name: 'Beef Boneless',
        category: 'Meat',
        price: 399,
        originalPrice: 449,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=600&h=600',
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
    {
        id: 7,
        name: 'Tender Lamb Chops',
        category: 'Meat',
        price: 429,
        originalPrice: 499,
        weight: '400 g',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 8,
        name: 'Chicken Drumsticks (Tangdi)',
        category: 'Chicken',
        price: 149,
        originalPrice: 189,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 9,
        name: 'Fresh Atlantic Salmon Steaks',
        category: 'Fish',
        price: 529,
        originalPrice: 599,
        weight: '300 g',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 10,
        name: 'Mutton Keema / Mince',
        category: 'Meat',
        price: 359,
        originalPrice: 399,
        weight: '450 g',
        image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 11,
        name: 'Fresh Chicken Curry Cut',
        category: 'Chicken',
        price: 139,
        originalPrice: 169,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&q=80&w=600&h=600',
    },
    {
        id: 12,
        name: 'Goat Meat Boneless',
        category: 'Meat',
        price: 449,
        originalPrice: 499,
        weight: '500 g',
        image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=600&h=600',
    },
];

const ProductsPage = () => {
    return (
        <div className="relative z-10 py-8 w-full max-w-[1920px] mx-auto px-4 md:px-[50px] animate-in fade-in slide-in-from-bottom-4 duration-700 mt-36 md:mt-24">
            <div className="mb-8 text-left">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-primary mb-1">All Products</h1>
                <p className="text-gray-500 text-sm md:text-lg font-medium">
                    Showing {products.length} fresh and organic items
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default ProductsPage;

