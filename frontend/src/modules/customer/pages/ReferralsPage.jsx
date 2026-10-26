import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gift,
  ChevronLeft,
  Copy,
  Share2,
  Users,
  Coins,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useToast } from "@shared/components/ui/Toast";

const ReferralsPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferralDetails = async () => {
      try {
        const res = await customerApi.getMyReferrals();
        const payload = res?.data?.result || res?.data?.data || null;
        setReferralData(payload);
      } catch (err) {
        console.error("Failed to fetch referral details:", err);
        showToast("Unable to load referral program", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchReferralDetails();
  }, []);

  const handleCopy = () => {
    if (!referralData?.referralCode) return;
    navigator.clipboard.writeText(referralData.referralCode);
    setCopied(true);
    showToast("Referral code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    const code = referralData?.referralCode || "";
    const referrerReward = referralData?.programConfig?.referrerRewardAmount || 100;
    const refereeReward = referralData?.programConfig?.refereeRewardAmount || 50;
    const text = `Order fresh, hygienic meat from Meatyns! Use my referral code ${code} to get ₹${refereeReward} off your first order: ${window.location.origin}/signup?ref=${code}`;

    if (navigator.share) {
      navigator
        .share({
          title: "Join Meatyns & Get Fresh Meat Delivered",
          text,
          url: `${window.location.origin}/signup?ref=${code}`,
        })
        .catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] font-poppins">
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-sm border border-[#EBE3D5]">
          <Loader2 className="animate-spin text-[#FDCE04]" size={22} />
          <span className="text-sm font-semibold text-[#1A1A1A]">Loading referral rewards…</span>
        </div>
      </div>
    );
  }

  const code = referralData?.referralCode || "MEATYNS";
  const stats = referralData?.stats || { totalInvited: 0, totalRewarded: 0, totalEarned: 0 };
  const referralsList = referralData?.referrals || [];
  const referrerReward = referralData?.programConfig?.referrerRewardAmount || 100;
  const refereeReward = referralData?.programConfig?.refereeRewardAmount || 50;

  return (
    <div className="min-h-screen bg-[#FAF6F0] pb-24 font-poppins text-[#1A1A1A]">
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3 shadow-sm select-none"
        style={{ background: "#FDCE04" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform rounded-full hover:bg-black/5 -ml-1"
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>
        <h1 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
          Refer & Earn
        </h1>
      </header>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2E2822] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#FDCE04]/20 blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-[#FDCE04] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} />
            <span>Meatyns Friend Club</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-anton tracking-wide leading-tight mb-2">
            GIVE ₹{refereeReward}, GET ₹{referrerReward}
          </h2>
          <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-5">
            Share your love for fresh cuts! Friends get ₹{refereeReward} wallet credit, and you earn ₹{referrerReward} as soon as their first order arrives.
          </p>

          {/* Referral Code Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Your Unique Code
              </span>
              <span className="text-lg font-black tracking-widest text-[#FDCE04]">
                {code}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {copied ? <CheckCircle2 size={14} className="text-[#FDCE04]" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="px-4 py-2 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
              >
                <Share2 size={14} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 border border-[#EBE3D5] text-center shadow-sm">
            <Users size={18} className="mx-auto text-[#B45309] mb-1" />
            <span className="text-lg font-black text-[#1A1A1A] block">
              {stats.totalInvited}
            </span>
            <span className="text-[10px] font-bold text-[#7A6A60] uppercase">
              Invited
            </span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#EBE3D5] text-center shadow-sm">
            <CheckCircle2 size={18} className="mx-auto text-emerald-600 mb-1" />
            <span className="text-lg font-black text-[#1A1A1A] block">
              {stats.totalRewarded}
            </span>
            <span className="text-[10px] font-bold text-[#7A6A60] uppercase">
              Converted
            </span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#EBE3D5] text-center shadow-sm">
            <Coins size={18} className="mx-auto text-[#FDCE04] mb-1" />
            <span className="text-lg font-black text-[#1A1A1A] block">
              ₹{stats.totalEarned}
            </span>
            <span className="text-[10px] font-bold text-[#7A6A60] uppercase">
              Total Earned
            </span>
          </div>
        </div>

        {/* Referral List */}
        <div className="bg-white rounded-2xl p-4 border border-[#EBE3D5] shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#1A1A1A]">Referral Activity</h3>
          {referralsList.length === 0 ? (
            <div className="text-center py-6">
              <Gift size={28} className="text-[#CEB186] mx-auto mb-2" />
              <p className="text-xs text-[#7A6A60]">
                No friends invited yet. Share your code above to start earning wallet rewards!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2EDE4]">
              {referralsList.map((ref, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{ref.refereeName}</p>
                    <p className="text-[10px] text-[#7A6A60]">
                      Joined {new Date(ref.joinedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        ref.status === "rewarded"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {ref.status === "rewarded" ? `+₹${ref.rewardAmount} Won` : "Pending Order"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;
