import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LogOut, User as UserIcon, Shield, CreditCard, Bell, ChevronRight, Settings } from 'lucide-react-native';
import { useAuth } from '@/lib/contexts/auth-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of Vidit AI?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.topLogout} onPress={handleLogout}>
            <LogOut size={22} color="#ef4444" />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase() || 'V'}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Vidit User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.planBadge}>
            <Text style={styles.planText}>PRO PLAN</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <GlassCard style={styles.menuCard}>
            <MenuItem icon={<UserIcon size={20} color="#94a3b8" />} title="Account Details" />
            <MenuItem icon={<Bell size={20} color="#94a3b8" />} title="Notifications" />
            <MenuItem icon={<Settings size={20} color="#94a3b8" />} title="App Settings" border={false} />
          </GlassCard>

          <Text style={styles.sectionTitle}>LEGAL & BILLING</Text>
          <GlassCard style={styles.menuCard}>
            <MenuItem icon={<CreditCard size={20} color="#94a3b8" />} title="Subscription" />
            <MenuItem icon={<Shield size={20} color="#94a3b8" />} title="Security & Privacy" border={false} />
          </GlassCard>

          <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.logoutButton}>
            <GlassCard style={styles.logoutCard}>
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out of Account</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Vidit AI v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, title, border = true }: { icon: React.ReactNode, title: string, border?: boolean }) {
  return (
    <TouchableOpacity style={[styles.menuItem, border && styles.menuBorder]}>
      <View style={styles.menuLeft}>
        {icon}
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <ChevronRight size={18} color="#475569" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    paddingTop: 40,
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  topLogout: {
    position: 'absolute',
    top: 20,
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 22,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f59e0b',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  planBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  planText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: 1.5,
  },
  menuContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  logoutButton: {
    marginTop: 24,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    marginTop: 40,
    textAlign: 'center',
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
});
