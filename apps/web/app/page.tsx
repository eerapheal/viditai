"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Zap, Scissors, Layout, ArrowRight, Play, CheckCircle, Smartphone } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard/user");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 py-6 px-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">viditai</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
             <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</Link>
             <Link href="#mobile" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Mobile</Link>
             <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-300 hover:text-white px-4 py-2 transition-all">
              Log In
            </Link>
            <Link 
              href="/signup" 
              className="px-6 py-2.5 rounded-full bg-white text-slate-950 font-bold hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-blue-600/20 blur-[120px] rounded-full -z-10 opacity-30" />
        <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full -z-10 opacity-30" />

        <div className="max-w-6xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-wide"
          >
            <Zap size={14} fill="currentColor" />
            <span>AI-POWERED VIDEO REVOLUTION</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter max-w-4xl mx-auto leading-[0.9] md:leading-[0.85]"
          >
            Edit Videos at <span className="text-glow text-blue-500 italic">the speed</span> of thought.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Transform raw footage into viral masterpieces with precision AI. High-performance cutting, 
            smart silence removal, and social-first optimized exports.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              href="/signup" 
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-lg font-bold transition-all shadow-2xl shadow-blue-600/20 hover:scale-105 active:scale-95"
            >
              <span>Start Creating Free</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#demo" 
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 border border-slate-800 text-lg font-bold hover:bg-slate-800 transition-all active:scale-95"
            >
              <Play size={18} fill="currentColor" />
              <span>Watch Demo</span>
            </Link>
          </motion.div>
        </div>

        {/* Floating Preview Card */}
        <motion.div
           initial={{ opacity: 0, y: 100 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, delay: 0.6 }}
           className="mt-24 max-w-5xl mx-auto"
        >
           <GlassCard className="p-2 border-slate-800 bg-slate-900/40">
              <div className="relative aspect-video rounded-2xl bg-slate-950 overflow-hidden group">
                 <div className="absolute inset-0 flex items-center justify-center bg-blue-600/5 group-hover:bg-transparent transition-colors duration-700" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                    <Play size={32} fill="white" className="ml-1" />
                 </div>
                 <div className="absolute bottom-0 inset-x-0 p-8 flex items-end justify-between bg-gradient-to-t from-slate-950">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10" />
                       <div className="space-y-1">
                          <div className="h-2 w-32 bg-slate-700 rounded" />
                          <div className="h-2 w-20 bg-slate-800 rounded" />
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <div className="h-8 w-8 rounded-lg bg-slate-800" />
                       <div className="h-8 w-8 rounded-lg bg-slate-800" />
                    </div>
                 </div>
              </div>
           </GlassCard>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Scissors className="text-blue-500" />}
              title="Pattern Precision"
              description="Define loops of keep and cut durations. Perfect for raw logs and multi-take cleanup in seconds."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title="AI Smart Cut"
              description="Automatically detects silence, filler words, and low-motion segments. Instant engagement boost."
            />
            <FeatureCard 
              icon={<Layout className="text-purple-500" />}
              title="Social Optimizer"
              description="One-click reframe for TikTok, Reels, and Shorts. Auto-captions and face-tracking included."
            />
          </div>
        </div>
      </section>

      {/* Mobile Promo */}
      <section id="mobile" className="py-24 px-6">
         <div className="max-w-7xl mx-auto">
            <GlassCard className="p-0 border-slate-800 overflow-hidden bg-gradient-to-br from-slate-900/50 to-blue-900/10">
               <div className="flex flex-col md:flex-row items-center gap-12 p-8 md:p-16">
                  <div className="flex-1 space-y-8">
                     <div className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs">
                        <Smartphone size={16} />
                        <span>Available Now</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black tracking-tight">Vidit AI is now in your pocket.</h2>
                     <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                        Edit on the go with our fully-featured mobile app. Sync your projects between 
                        web and mobile seamlessly using the Vidit AI Studio Cloud.
                     </p>
                     <div className="flex gap-4">
                        <div className="px-6 py-3 rounded-xl bg-slate-950 border border-slate-800 font-bold hover:bg-slate-900 transition-colors cursor-pointer">App Store</div>
                        <div className="px-6 py-3 rounded-xl bg-slate-950 border border-slate-800 font-bold hover:bg-slate-900 transition-colors cursor-pointer">Play Store</div>
                     </div>
                  </div>
                  <div className="w-full md:w-1/3 aspect-[9/16] bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl opacity-50" />
                     <div className="p-8 space-y-6">
                        <div className="h-6 w-24 bg-slate-800 rounded-full" />
                        <div className="space-y-2">
                           <div className="h-4 w-full bg-slate-900 rounded-full" />
                           <div className="h-4 w-2/3 bg-slate-900 rounded-full" />
                        </div>
                        <div className="aspect-[4/5] bg-slate-900/50 rounded-2xl border border-white/5 flex items-center justify-center">
                           <Sparkles size={40} className="text-slate-700" />
                        </div>
                        <div className="h-10 w-full bg-blue-600 rounded-xl" />
                     </div>
                  </div>
               </div>
            </GlassCard>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 opacity-60">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-500" />
              <span className="text-lg font-bold">viditai</span>
            </div>
            <p className="text-sm max-w-xs leading-relaxed">
               The future of video editing is here. Powered by AI, designed for creators.
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-12">
            <FooterLinkGroup title="Product" links={["Features", "Wizards", "Mobile", "Enterprise"]} />
            <FooterLinkGroup title="Company" links={["About", "Careers", "News", "Press"]} />
            <FooterLinkGroup title="Support" links={["Help Center", "Community", "Safety", "API"]} />
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-20 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© 2026 Vidit AI. Built with futuristic precision.</p>
          <div className="flex gap-8">
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
            <Link href="#">Cookie Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <GlassCard className="p-10 border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-2 group">
      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-8 border border-white/5 group-hover:bg-blue-600 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { size: 24, className: "group-hover:text-white transition-colors" })}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium">{description}</p>
    </GlassCard>
  );
}

function FooterLinkGroup({ title, links }: { title: string, links: string[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-white font-bold text-sm tracking-widest uppercase">{title}</h4>
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <Link key={link} href="#" className="text-sm hover:text-white transition-colors capitalize">{link}</Link>
        ))}
      </div>
    </div>
  );
}
