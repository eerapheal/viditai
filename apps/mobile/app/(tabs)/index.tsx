import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Sparkles, Zap, Scissors, Layout, ArrowRight, Play, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../lib/contexts/auth-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Sparkles size={14} color="#f59e0b" />
          <Text style={styles.badgeText}>VIDIT AI MOBILE</Text>
        </View>
        <Text style={styles.heroTitle}>Create without limits.</Text>
        <Text style={styles.heroSubtitle}>
          The future of video editing is here, powered by precision AI and designed for mobile speed.
        </Text>
        
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/studio')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>Start Studio</Text>
          <ArrowRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Features Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CAPABILITIES</Text>
        <Text style={styles.sectionTitle}>Built for AI Masters</Text>
        
        <View style={styles.featureGrid}>
          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Scissors color="#3b82f6" size={24} />
            </View>
            <Text style={styles.featureTitle}>Pattern Cut</Text>
            <Text style={styles.featureDesc}>Automatic loop-based trimming for rapid logs.</Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
              <Zap color="#eab308" size={24} />
            </View>
            <Text style={styles.featureTitle}>Smart Trim</Text>
            <Text style={styles.featureDesc}>AI-driven silence and filler removal.</Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
              <Layout color="#a855f7" size={24} />
            </View>
            <Text style={styles.featureTitle}>Multi-Format</Text>
            <Text style={styles.featureDesc}>One-tap exports for Reels, TikTok, and Shorts.</Text>
          </GlassCard>

          <GlassCard style={styles.featureCard}>
             <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <CheckCircle2 color="#22c55e" size={24} />
            </View>
            <Text style={styles.featureTitle}>Cloud Sync</Text>
            <Text style={styles.featureDesc}>Edit on web and mobile with shared projects.</Text>
          </GlassCard>
        </View>
      </View>

      {/* Welcome Back Card (If Auth) */}
      {user && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/studio')}>
            <GlassCard style={styles.welcomeCard}>
              <View style={styles.welcomeInfo}>
                <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
                <Text style={styles.welcomeTitle}>{user.full_name || user.email}</Text>
                <Text style={styles.welcomeSub}>Open Studio to resume your projects.</Text>
              </View>
              <View style={styles.startBadge}>
                <Play color="#fff" size={20} fill="#fff" />
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  badgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 3,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 24,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    padding: 20,
    minHeight: 160,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 2,
    marginBottom: 6,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  startBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
