// Guided enquiry chatbot content. Edit text/options here; no component changes needed.
export const SUPPORT_PHONE = '+91 75585 98590';

// Each node: { message, options: [{ label, next }] }.
// Every screen automatically shows the "Call us" card and a "Main menu" action.
export const BOT_START = 'root';

export const BOT_NODES = {
    root: {
        message: 'Hi! 👋 Welcome to Meatyns. How can we help you today?',
        options: [
            { label: 'Bulk order enquiry', next: 'bulk' },
            { label: 'Products we offer', next: 'products' },
            { label: 'Delivery information', next: 'delivery' },
            { label: 'Payment & pricing', next: 'payment' },
            { label: 'Talk to our team', next: 'call' },
        ],
    },
    bulk: {
        message: 'We take bulk orders for events, restaurants, caterers and parties. What would you like to know?',
        options: [
            { label: 'Minimum bulk quantity', next: 'bulk_qty' },
            { label: 'Bulk pricing & discounts', next: 'bulk_price' },
            { label: 'Bulk delivery & timing', next: 'bulk_delivery' },
            { label: 'How to place a bulk order', next: 'bulk_how' },
        ],
    },
    bulk_qty: {
        message: 'Bulk orders usually start from 10 kg per product. For exact quantities and availability, please call our team.',
        options: [
            { label: 'Bulk pricing & discounts', next: 'bulk_price' },
            { label: 'Back', next: 'bulk' },
        ],
    },
    bulk_price: {
        message: 'Special bulk rates are available based on product and quantity. Call us with your requirement and we will share the best price.',
        options: [
            { label: 'How to place a bulk order', next: 'bulk_how' },
            { label: 'Back', next: 'bulk' },
        ],
    },
    bulk_delivery: {
        message: 'Bulk orders are delivered fresh, on your chosen date and time. Please book at least 24 hours in advance.',
        options: [
            { label: 'How to place a bulk order', next: 'bulk_how' },
            { label: 'Back', next: 'bulk' },
        ],
    },
    bulk_how: {
        message: 'Simply call our team with the product, quantity, delivery date and address. We will confirm the price and arrange everything for you.',
        options: [{ label: 'Back', next: 'bulk' }],
    },
    products: {
        message: 'We offer fresh chicken, mutton, fish and other meat products, cleaned and cut to your preference. You can browse all items on the Home screen.',
        options: [{ label: 'Bulk order enquiry', next: 'bulk' }],
    },
    delivery: {
        message: 'We deliver fresh products to your doorstep. Delivery time and charges depend on your location and are shown at checkout.',
        options: [{ label: 'Bulk delivery & timing', next: 'bulk_delivery' }],
    },
    payment: {
        message: 'You can pay online at checkout. Prices are shown per product, and bulk orders get special rates.',
        options: [{ label: 'Bulk pricing & discounts', next: 'bulk_price' }],
    },
    call: {
        message: 'Our team is happy to help. Please call us on the number below.',
        options: [],
    },
};
