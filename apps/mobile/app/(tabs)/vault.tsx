import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, TouchableOpacity, Linking, Share } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Library, Download, Play, Share2, Info, CheckCircle2 } from 'lucide-react-native';
import { useJobs, Job } from '../../lib/hooks/use-jobs';
import { GlassCard } from '../../components/ui/GlassCard';
import { API_URL } from '../../lib/api';

export default function VaultScreen() {
  const { jobs, fetchJobs, isLoading } = useJobs();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, []);

  const completedJobs = jobs.filter(j => j.status === 'completed');

  const handleDownload = (job: Job) => {
    if (job.download_url) {
      Linking.openURL(`${API_URL}${job.download_url}`);
    }
  };

  const handleShare = async (job: Job) => {
    if (job.download_url) {
      try {
        await Share.share({
          message: `Check out my AI-edited video from Vidit AI!`,
          url: `${API_URL}${job.download_url}`,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Library size={32} color="#f59e0b" />
          </View>
          <Text style={styles.title}>Video Vault</Text>
          <Text style={styles.subtitle}>
            Your AI masterpieces, archived and ready for the world.
          </Text>
        </View>

        {completedJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No videos yet</Text>
            <Text style={styles.emptySubtext}>Head over to the Studio to start your first project.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {completedJobs.map((job) => (
              <GlassCard key={job.job_id} style={styles.videoCard}>
                <View style={styles.videoHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{job.job_type.toUpperCase()}</Text>
                  </View>
                  <CheckCircle2 size={16} color="#22c55e" />
                </View>

                <View style={styles.videoBody}>
                  <View style={styles.placeholderThumb}>
                    <Play size={32} color="rgba(255,255,255,0.3)" />
                  </View>
                  
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoDate}>
                      Created {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                    <View style={styles.riskRow}>
                      <Info size={12} color="#64748b" />
                      <Text style={styles.riskLabel}>Copyright Risk: </Text>
                      <Text style={[
                        styles.riskValue, 
                        { color: job.risk_level === 'low' ? '#22c55e' : job.risk_level === 'medium' ? '#f59e0b' : '#ef4444' }
                      ]}>
                        {job.risk_level?.toUpperCase() || 'LOW'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => handleDownload(job)}
                  >
                    <Download size={18} color="#f8fafc" />
                    <Text style={styles.actionText}>Save</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => handleShare(job)}
                  >
                    <Share2 size={18} color="#94a3b8" />
                    <Text style={[styles.actionText, styles.secondaryText]}>Share</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 300,
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
  grid: {
    gap: 16,
  },
  videoCard: {
    padding: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: 'rgba(248, 250, 252, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  videoBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  placeholderThumb: {
    width: 100,
    height: 60,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 6,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riskLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  riskValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#94a3b8',
  },
});
