import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, Library, User } from 'lucide-react-native';

export default function VaultScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Library size={48} color="#f59e0b" style={styles.icon} />
        <Text style={styles.title}>Video Vault</Text>
        <Text style={styles.subtitle}>
          Your processed videos and drafts will appear here once they are ready.
        </Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No videos yet</Text>
        <Text style={styles.emptySubtext}>Head over to the Studio to start your first project.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
