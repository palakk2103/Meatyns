import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, Wallet, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { useAuth } from '../../../core/context/AuthContext';

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WalletPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { user } = useAuth();

    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Recharge states
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeLoading, setRechargeLoading] = useState(false);
    const [verificationState, setVerificationState] = useState(null); // 'verifying' | 'success' | 'failed' | null
    const [verifiedAmount, setVerifiedAmount] = useState(0);

    const walletMetrics = useMemo(() => {
        let totalEarned = 0;
        let usedCoins = 0;
        let expiredCoins = 0;
        const now = new Date();

        transactions.forEach((tx) => {
            const amt = Number(tx.coins || tx.amount || 0);
            if (tx.status === 'Expired' || (tx.expiryDate && new Date(tx.expiryDate) < now && tx.type === 'credit')) {
                expiredCoins += amt;
            } else if (tx.type === 'credit') {
                totalEarned += amt;
            } else if (tx.type === 'debit') {
                usedCoins += amt;
            }
        });

        return {
            walletBalance: balance,
            availableCoins: balance,
            usedCoins,
            expiredCoins,
            totalEarned,
        };
    }, [balance, transactions]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, txRes] = await Promise.all([
                customerApi.getProfile(),
                customerApi.getWalletTransactions({ page: 1, limit: 50 }),
            ]);
            const profile = profileRes.data?.result ?? profileRes.data?.data ?? profileRes.data;
            const txData = txRes.data?.result ?? txRes.data?.data ?? txRes.data;
            setBalance(profile?.walletBalance ?? 0);
            setTransactions(Array.isArray(txData?.items) ? txData.items : []);
        } catch (err) {
            console.error('Wallet fetch error:', err);
            setBalance(0);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Check for merchantOrderId in URL for redirect verification
        const params = new URLSearchParams(window.location.search);
        const merchantOrderId = params.get('merchantOrderId');
        if (merchantOrderId) {
            verifyRecharge(merchantOrderId);
        }
    }, []);

    const verifyRecharge = async (merchantOrderId) => {
        setVerificationState('verifying');
        try {
            const res = await customerApi.verifyPaymentStatus(merchantOrderId);
            const status = res.data?.result?.status || res.data?.data?.status;
            const paymentAmount = res.data?.result?.payment?.amount || res.data?.data?.payment?.amount || 0;
            if (status === 'CAPTURED') {
                setVerifiedAmount(paymentAmount / 100);
                setVerificationState('success');
                // Remove query param without reload
                window.history.replaceState({}, document.title, window.location.pathname);
                await fetchData();
            } else {
                setVerificationState('failed');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setVerificationState('failed');
        }
    };

    const openRazorpayWalletModal = (key, orderId, amount, currency) => {
        const options = {
            key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || "",
            amount: amount,
            currency: currency || "INR",
            name: settings?.appName || "Anita Megamart",
            description: "Wallet Recharge",
            order_id: orderId,
            handler: async function (response) {
                setRechargeLoading(true);
                showToast("Verifying payment...", "info");
                try {
                    const verifyRes = await customerApi.verifyRazorpayPayment({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                    if (verifyRes.data.success) {
                        setVerifiedAmount(amount / 100);
                        setVerificationState('success');
                        showToast("Wallet recharged successfully!", "success");
                        await fetchData();
                    } else {
                        throw new Error(verifyRes.data.message || "Payment verification failed");
                    }
                } catch (err) {
                    console.error("Razorpay verification failed", err);
                    setVerificationState('failed');
                    showToast(err.message || "Payment verification failed.", "error");
                } finally {
                    setRechargeLoading(false);
                    setIsRechargeModalOpen(false);
                }
            },
            prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.phone || "",
            },
            theme: {
                color: "#741721",
            },
            modal: {
                ondismiss: function () {
                    setRechargeLoading(false);
                    showToast("Payment cancelled by user.", "warning");
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp) {
            setRechargeLoading(false);
            showToast(resp.error?.description || "Payment failed. Please try again.", "error");
        });
        rzp.open();
    };

    const handleRecharge = async () => {
        const amt = Number(rechargeAmount);
        if (!amt || isNaN(amt) || amt < 1) {
            alert('Please enter a valid amount (minimum ₹1)');
            return;
        }
        setRechargeLoading(true);
        try {
            const res = await customerApi.createWalletRechargeOrder({ amount: amt });
            const resultData = res.data?.result || res.data?.data || res.data;
            const gatewayName = resultData?.gatewayName || resultData?.payment?.gatewayName;

            if (gatewayName === 'RAZORPAY') {
                const key = resultData?.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "";
                const payment = resultData?.payment;
                const orderId = payment?.gatewayOrderId;
                const amount = payment?.amount;
                const currency = payment?.currency || "INR";

                if (!window.Razorpay) {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.async = true;
                    script.onload = () => {
                        openRazorpayWalletModal(key, orderId, amount, currency);
                    };
                    script.onerror = () => {
                        showToast("Failed to load Razorpay SDK", "error");
                        setRechargeLoading(false);
                    };
                    document.body.appendChild(script);
                } else {
                    openRazorpayWalletModal(key, orderId, amount, currency);
                }
            } else {
                const redirectUrl = resultData?.redirectUrl;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    alert(res.data?.message || 'Failed to initiate recharge payment');
                }
            }
        } catch (err) {
            console.error('Recharge error:', err);
            alert('Error initiating recharge. Please try again.');
        } finally {
            setRechargeLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF6F0] pb-24 font-outfit text-[#1A1A1A] relative">
            {/* Top Burgundy App Header */}
            <header
                className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3.5 shadow-sm select-none"
                style={{ background: "#741721" }}
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                    className="w-8 h-8 flex items-center justify-center text-white active:scale-90 transition-transform rounded-full hover:bg-white/10 -ml-1"
                >
                    <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <h1 className="text-[17px] sm:text-lg font-bold text-white tracking-wide">
                    Wallet
                </h1>
            </header>

            <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-3.5 relative z-20 space-y-4">
                {/* Primary Balance Header Card */}
                <div className="bg-white rounded-2xl border border-[#EBE3D5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[0_4px_16px_rgba(116,23,33,0.04)]">
                    <div>
                        <p className="text-[11px] font-bold text-[#7A6A60] uppercase tracking-wider">Wallet Balance</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#741721] mt-1 tracking-tight">
                            {loading ? '...' : `₹${(walletMetrics.walletBalance || 0).toLocaleString('en-IN')}`}
                        </h2>
                        <p className="text-xs font-semibold text-[#8C7E72] mt-1.5">Use up to 25% wallet coins at checkout</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsRechargeModalOpen(true)}
                            className="px-6 py-3 text-white rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:opacity-95 active:scale-95 flex items-center gap-2 select-none"
                            style={{ background: "#741721" }}
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            Add Money via Razorpay
                        </button>
                    </div>
                </div>

                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="bg-white rounded-2xl border border-[#EBE3D5] p-3.5 text-center shadow-[0_2px_8px_rgba(116,23,33,0.03)]">
                        <p className="text-[10px] font-bold text-[#8C7E72] uppercase tracking-wider">Available Coins</p>
                        <h3 className="text-lg font-extrabold text-[#741721] mt-0.5">{loading ? '...' : walletMetrics.availableCoins}</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#EBE3D5] p-3.5 text-center shadow-[0_2px_8px_rgba(116,23,33,0.03)]">
                        <p className="text-[10px] font-bold text-[#8C7E72] uppercase tracking-wider">Used Coins</p>
                        <h3 className="text-lg font-extrabold text-[#B45309] mt-0.5">{loading ? '...' : walletMetrics.usedCoins}</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#EBE3D5] p-3.5 text-center shadow-[0_2px_8px_rgba(116,23,33,0.03)]">
                        <p className="text-[10px] font-bold text-[#8C7E72] uppercase tracking-wider">Expired Coins</p>
                        <h3 className="text-lg font-extrabold text-[#9E8E80] mt-0.5">{loading ? '...' : walletMetrics.expiredCoins}</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#EBE3D5] p-3.5 text-center shadow-[0_2px_8px_rgba(116,23,33,0.03)]">
                        <p className="text-[10px] font-bold text-[#8C7E72] uppercase tracking-wider">Total Earned</p>
                        <h3 className="text-lg font-extrabold text-[#047857] mt-0.5">{loading ? '...' : walletMetrics.totalEarned}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#EBE3D5] shadow-[0_4px_16px_rgba(116,23,33,0.03)] overflow-hidden">
                    <div className="px-4 py-3 bg-[#FAF6F0] border-b border-[#F2EDE4] flex items-center justify-between">
                        <h3 className="text-[14px] sm:text-base font-bold text-[#741721]">Transaction History</h3>
                        <Wallet size={18} className="text-[#CEB186]" />
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center items-center gap-2.5 text-[#741721] text-sm font-semibold">
                            <Loader2 className="animate-spin" size={20} />
                            Loading...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-14 h-14 rounded-full bg-[#FFF0EF] border border-[#F2B8BF] flex items-center justify-center text-[#741721] mb-3">
                                <Wallet size={26} />
                            </div>
                            <p className="text-sm font-bold text-[#1A1A1A] mb-1">No wallet transactions yet</p>
                            <p className="text-xs text-[#7A6A60]">
                                Wallet credits, debits, and orders will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F6F1EA]">
                            {transactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-3.5 flex items-center justify-between hover:bg-[#FAF6F0]/60 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]/60' : 'bg-[#FFF0EF] text-[#741721] border border-[#F2B8BF]/60'}`}>
                                            {tx.type === 'credit' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-[#1A1A1A] text-sm">{tx.title || tx.transactionType}</h4>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FAF6F0] text-[#7A6A60] border border-[#EBE3D5] uppercase">
                                                    {tx.status || 'Settled'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#7A6A60] mt-0.5">
                                                {tx.reason ? tx.reason : formatDate(tx.date)}
                                            </p>
                                            <p className="text-[10px] text-[#9E8E80]">
                                                {formatDate(tx.date)} {tx.orderId ? `• Order #${tx.orderId}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-extrabold ${tx.type === 'credit' ? 'text-[#047857]' : 'text-[#741721]'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}{(tx.coins || tx.amount || 0).toLocaleString('en-IN')} Coins
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Money Modal */}
            {isRechargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full border border-[#EBE3D5] shadow-2xl p-6 relative overflow-hidden">
                        <button
                            onClick={() => setIsRechargeModalOpen(false)}
                            className="absolute top-4 right-4 text-[#8C7E72] hover:text-[#741721] transition-colors p-1"
                        >
                            <XCircle size={22} />
                        </button>
                        <h3 className="text-lg font-bold text-[#1A1A1A]">Add Money to Wallet</h3>
                        <p className="text-xs text-[#7A6A60] mt-1">Recharge instantly using UPI, Cards or NetBanking.</p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#741721] uppercase tracking-wider mb-1.5">Enter Amount (₹)</label>
                                <input
                                    type="number"
                                    placeholder="Enter amount (e.g. 500)"
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#FAF6F0] border border-[#E4D5BE] rounded-xl text-lg font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#741721] focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                {[100, 500, 1000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setRechargeAmount(String(amt))}
                                        className={`py-2.5 px-3 border rounded-xl text-sm font-bold transition-all ${
                                            rechargeAmount === String(amt)
                                                ? 'bg-[#FFF0EF] border-[#741721] text-[#741721] shadow-sm'
                                                : 'border-[#EBE3D5] text-[#1A1A1A] hover:bg-[#FAF6F0]'
                                        }`}
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleRecharge}
                                disabled={rechargeLoading}
                                className="w-full py-3.5 text-white rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "#741721" }}
                            >
                                {rechargeLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Initiating Payment...
                                    </>
                                ) : (
                                    'Proceed to Pay'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Status Modal */}
            {verificationState && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-sm w-full border border-[#EBE3D5] shadow-2xl p-6 text-center">
                        {verificationState === 'verifying' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <Loader2 size={44} className="text-[#741721] animate-spin" />
                                <h3 className="text-lg font-bold text-[#1A1A1A] mt-2">Verifying Recharge</h3>
                                <p className="text-xs text-[#7A6A60]">Please wait while we verify your payment status with the bank...</p>
                            </div>
                        )}
                        {verificationState === 'success' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <CheckCircle2 size={48} className="text-[#047857]" />
                                <h3 className="text-lg font-bold text-[#1A1A1A] mt-2">Recharge Successful!</h3>
                                <p className="text-2xl font-black text-[#741721]">₹{verifiedAmount}</p>
                                <p className="text-xs text-[#7A6A60]">Your wallet balance has been successfully credited.</p>
                                <button
                                    onClick={() => setVerificationState(null)}
                                    className="mt-4 px-8 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all active:scale-95"
                                    style={{ background: "#741721" }}
                                >
                                    Done
                                </button>
                            </div>
                        )}
                        {verificationState === 'failed' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <XCircle size={48} className="text-[#BE123C]" />
                                <h3 className="text-lg font-bold text-[#1A1A1A] mt-2">Payment Verification Failed</h3>
                                <p className="text-xs text-[#7A6A60]">We could not confirm your payment. If money was deducted, it will be refunded or credited shortly.</p>
                                <button
                                    onClick={() => setVerificationState(null)}
                                    className="mt-4 px-8 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
