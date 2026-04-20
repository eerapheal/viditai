import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { LogOut, User as UserIcon, Shield, CreditCard, Bell, ChevronRight, Settings, X } from 'lucide-react-native';
import { useAuth } from '../../lib/contexts/auth-context';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBar } from 'expo-status-bar';
import { API_BASE } from '../../lib/api';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showEditName, setShowEditName] = React.useState(false);
  const [editName, setEditName] = React.useState(user?.full_name || '');

  const totalExports = user?.monthly_exports_used || 0;
  const exportLimit = user?.plan === 'free' ? 10 : 9999;
  const quotaPercentage = Math.min(100, (totalExports / exportLimit) * 100);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of Vidit AI?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: editName.trim() }),
      });
      if (res.ok) {
        await refreshUser();
        setShowEditName(false);
        Alert.alert("Success", "Profile updated!");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This is permanent. All your videos and subscription will be lost. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              const res = await fetch(`${API_BASE}/api/v1/users/me`, {
                method: "DELETE",
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              });
              if (res.ok) logout();
            } catch (err) {
              Alert.alert("Error", "Failed to delete account");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'V'}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Vidit User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={[styles.planBadge, { borderColor: user?.plan?.toLowerCase() === 'free' ? 'rgba(245,158,11,0.3)' : '#3b82f6' }]}>
            <Text style={[styles.planText, { color: user?.plan?.toLowerCase() === 'free' ? '#f59e0b' : '#3b82f6' }]}>
              {(user?.plan || 'FREE').toUpperCase()} PLAN
            </Text>
          </View>

          <View style={styles.quotaContainer}>
            <View style={styles.quotaHeader}>
              <Text style={styles.quotaTitle}>Monthly Usage</Text>
              <Text style={styles.quotaStats}>
                {totalExports} / {exportLimit === 9999 ? '∞' : exportLimit}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${quotaPercentage}%`,
                    backgroundColor: quotaPercentage > 80 ? '#ef4444' : '#22c55e'
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <GlassCard style={styles.menuCard}>
            <MenuItem 
              icon={<UserIcon size={20} color="#94a3b8" />} 
              title="Account Details" 
              onPress={() => { setEditName(user?.full_name || ''); setShowEditName(true); }}
            />
            <MenuItem icon={<Bell size={20} color="#94a3b8" />} title="Notifications" />
            <MenuItem icon={<Settings size={20} color="#94a3b8" />} title="App Settings" border={false} />
          </GlassCard>

          <Text style={styles.sectionTitle}>LEGAL & BILLING</Text>
          <GlassCard style={styles.menuCard}>
            <MenuItem icon={<CreditCard size={20} color="#94a3b8" />} title="Subscription" />
            <MenuItem icon={<Shield size={20} color="#94a3b8" />} title="Security & Privacy" border={false} />
          </GlassCard>

          <View style={styles.dangerZone}>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.7} style={styles.logoutButton}>
              <View style={styles.logoutContent}>
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Sign Out of Vidit AI</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete Account Permanently</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Vidit AI v1.0.0</Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showEditName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Name</Text>
              <TouchableOpacity onPress={() => setShowEditName(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your full name"
              placeholderTextColor="#475569"
              autoFocus
            />
            <TouchableOpacity 
              onPress={handleSaveName} 
              disabled={isUpdating}
              style={styles.modalSaveBtn}
            >
              <Text style={styles.modalSaveText}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, title, border = true, onPress }: { icon: React.ReactNode, title: string, border?: boolean, onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuItem, border && styles.menuBorder]}>
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
  quotaContainer: {
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  quotaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quotaStats: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  upgradeLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  upgradeText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
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
  dangerZone: {
    marginTop: 32,
    gap: 16,
  },
  logoutButton: {
    width: '100%',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  version: {
    marginTop: 40,
    textAlign: 'center',
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 20,
  },
  modalSaveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
});
