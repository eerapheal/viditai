"use client";

import { useState } from "react";
import { Check, Zap, Globe, Shield } from "lucide-react";
import { AIButton } from "@/components/ui/AIButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { API_V1 } from "@/lib/config";
import { useAuth } from "@/lib/contexts/auth-context";

export default function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (gateway: "stripe" | "paystack") => {
    setLoading(gateway);
    try {
      const response = await fetch(`${API_V1}/payments/checkout/${gateway}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
          Unlock the Full Power of AI
        </h1>
        <p className="text-xl text-slate-400">
          Upgrade to Vidit AI Pro and create unlimited content without restrictions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <GlassCard className="p-8 border-slate-800 flex flex-col h-full">
          <div className="space-y-2 mb-6">
            <h3 className="text-2xl font-bold text-white">Free Plan</h3>
            <p className="text-slate-400 text-sm">Perfect for trying out Vidit AI</p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-slate-500 ml-2">/month</span>
            </div>
          </div>
          
          <div className="space-y-4 flex-grow mb-8">
            <FeatureItem text="5 AI Exports per month" />
            <FeatureItem text="120-minute video limit" />
            <FeatureItem text="Subtle Watermark" />
            <FeatureItem text="Standard processing speed" />
          </div>

          <div className="mt-auto">
            <AIButton className="w-full opacity-50 cursor-not-allowed" disabled>
              {user?.plan === "free" ? "Current Plan" : "Downgrade"}
            </AIButton>
          </div>
        </GlassCard>

        {/* Pro Plan */}
        <GlassCard className="p-8 border-blue-500/50 relative overflow-hidden flex flex-col h-full ring-1 ring-blue-500/20">
          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-bl-lg">
            Best Value
          </div>
          
          <div className="space-y-2 mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-400 fill-blue-400" />
              Pro Plan
            </h3>
            <p className="text-slate-400 text-sm">For serious creators and editors</p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-white">$15</span>
              <span className="text-slate-500 ml-2">/month</span>
            </div>
          </div>

          <div className="space-y-4 flex-grow mb-8">
            <FeatureItem text="Unlimited AI Exports" active />
            <FeatureItem text="Unlimited video length" active />
            <FeatureItem text="No Watermarks" active />
            <FeatureItem text="Priority AI processing" active />
            <FeatureItem text="Early access to new features" active />
          </div>

          <div className="mt-auto space-y-3">
            <AIButton 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              onClick={() => handleCheckout("stripe")}
              isLoading={loading === "stripe"}
              disabled={loading !== null || user?.plan === "pro"}
            >
              {user?.plan === "pro" ? "Current Plan" : "Upgrade with Stripe"}
            </AIButton>
            
            <AIButton 
              onClick={() => handleCheckout("paystack")}
              isLoading={loading === "paystack"}
              disabled={loading !== null || user?.plan === "pro"}
              className="w-full bg-transparent border border-blue-500/30 hover:bg-blue-500/10 text-blue-400"
            >
              {user?.plan === "pro" ? "Current Plan" : "Upgrade with Paystack"}
            </AIButton>

            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              <div className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</div>
              <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> Global</div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function FeatureItem({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 rounded-full p-0.5 ${active ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500"}`}>
        <Check className="h-3 w-3" />
      </div>
      <span className={active ? "text-slate-200" : "text-slate-500"}>{text}</span>
    </div>
  );
}
