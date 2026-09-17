import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, Leaf, ShieldCheck, Zap } from "lucide-react";
import Header from "../layout/Header";

const DesktopOrderConfirmation = ({
  orderId = "FK123456",
  itemCount = 4,
  totalAmount = 1226,
  onViewDetails,
  onContinueShopping,
}) => {
  const navigate = useNavigate();

  const handleView = () => {
    if (onViewDetails) {
      onViewDetails();
    } else if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate("/orders");
    }
  };

  const handleContinue = () => {
    if (onContinueShopping) {
      onContinueShopping();
    } else {
      navigate("/");
    }
  };

  const displayOrderId = orderId ? (orderId.startsWith("#") ? orderId : `#${orderId.slice(-8).toUpperCase()}`) : "#FK123456";

  return (
    <div className="min-h-screen bg-[#FBF8F5] pb-16">
      <Header />
      <div className="pt-28 px-6 lg:px-12 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">
          Order Confirmation
        </h1>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Column: Success Details & Order Summary */}
          <div className="col-span-7 xl:col-span-8 space-y-4">
            {/* Main Success Box */}
            <div className="bg-white rounded-2xl p-8 border border-[#ede5df] shadow-xs text-center">
              {/* Green Circle Checkmark */}
              <div className="w-16 h-16 rounded-full bg-[#15803D] text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Check size={36} strokeWidth={3} />
              </div>

              <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mb-1.5">
                Order Placed Successfully!
              </h2>

              <p className="text-xs text-slate-600 font-medium mb-1">
                Your order <span className="font-bold text-slate-800">{displayOrderId}</span> has been confirmed.
              </p>

              <p className="text-[11px] text-slate-400 mb-8">
                You will receive an order update on your WhatsApp shortly.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleView}
                  className="px-6 py-3 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-xs font-extrabold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  View Order Details
                </button>
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold transition-all active:scale-95 hover:bg-slate-50 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="bg-white rounded-2xl p-5 border border-[#ede5df] shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Order Summary
              </h3>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">
                  {itemCount} {itemCount === 1 ? "Item" : "Items"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Total Amount</span>
                  <span className="text-sm font-black text-slate-900">
                    ₹{Number(totalAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Fresh Meat Promo Card */}
          <div className="col-span-5 xl:col-span-4 select-none">
            <div className="bg-white rounded-2xl overflow-hidden border border-[#ede5df] shadow-xs">
              <div className="p-6 text-center space-y-1">
                <h3 className="font-serif italic text-xl font-bold text-slate-900">
                  Fresh Meat &amp; Seafood
                </h3>
                <p className="text-xs text-slate-500">
                  Delivered to Your Door
                </p>

                {/* 3 circular badges */}
                <div className="flex items-center justify-center gap-6 pt-5 pb-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#FDCE04]/20 border border-[#FDE68A] flex items-center justify-center text-[#1A1A1A]">
                      <Leaf size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">Fresh</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#FDCE04]/20 border border-[#FDE68A] flex items-center justify-center text-[#1A1A1A]">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">Hygienic</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#FDCE04]/20 border border-[#FDE68A] flex items-center justify-center text-[#1A1A1A]">
                      <Zap size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">Fast</span>
                  </div>
                </div>
              </div>

              {/* Appetizing fresh meat photo */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80"
                  alt="Fresh Meat and Seafood"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopOrderConfirmation;
