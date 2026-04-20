import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Sparkles, History, CheckCircle2, Clock, AlertTriangle } from 'lucide-react-native';

import { GlassCard } from '../../components/ui/GlassCard';
import { VideoPicker } from '../../components/studio/VideoPicker';
import { ProcessWizard } from '../../components/studio/ProcessWizard';
import { useVideos } from '../../lib/hooks/use-videos';
import { useJobs, Job } from '../../lib/hooks/use-jobs';

import { VideoResultView } from '../../components/studio/VideoResultView';

export default function StudioScreen() {
  const { uploadVideo, uploadProgress, isLoading: isUploading } = useVideos();
  const { jobs, fetchJobs, createJob, isLoading: isJobsLoading } = useJobs();
  
  const [lastUploadedVideoId, setLastUploadedVideoId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, []);

  // Auto-poll while jobs are actively processing
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(() => fetchJobs(), 4000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const handleVideoSelected = async (uri: string, filename: string, type: string, file?: any) => {
    try {
      const result = await uploadVideo(uri, filename, type, file);
      setLastUploadedVideoId(result.video_id);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Something went wrong');
    }
  };

  const handleStartProcess = async (presetId: string, parameters: any) => {
    if (!lastUploadedVideoId) return;
    
    try {
      const jobType = parameters._job_type || 'pattern_cut';
      const { _job_type, ...cleanParams } = parameters;
      
      await createJob(lastUploadedVideoId, jobType, { ...cleanParams, preset_id: presetId });
      setLastUploadedVideoId(null);
      Alert.alert('Success', 'AI processing has started!');
    } catch (error: any) {
      Alert.alert('Process Error', error.message || 'Failed to start AI job');
    }
  };

  if (selectedJob) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StatusBar style="light" />
        <View style={styles.header}>
           <VideoResultView job={selectedJob} onBack={() => setSelectedJob(null)} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
      }
    >
      <StatusBar style="light" />

      {/* Hero Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Sparkles size={14} color="#f59e0b" />
          <Text style={styles.badgeText}>AI STUDIO</Text>
        </View>
        <Text style={styles.title}>Creator Lab</Text>
        <Text style={styles.subtitle}>
          Upload your footage and let Vidit AI craft your next masterpiece.
        </Text>
      </View>

      {/* Upload or Wizard Section */}
      <View style={styles.mainSection}>
        {lastUploadedVideoId ? (
          <ProcessWizard 
            videoId={lastUploadedVideoId} 
            onProcess={handleStartProcess}
            isProcessing={isJobsLoading}
          />
        ) : (
          <VideoPicker 
            onVideoSelected={handleVideoSelected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        )}
      </View>

      {/* Active Jobs Section */}
      <View style={styles.jobsSection}>
        <View style={styles.sectionHeader}>
          <History size={20} color="#94a3b8" />
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
        </View>

        {jobs.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active jobs</Text>
            <Text style={styles.emptySubtext}>Your recent processing tasks will appear here.</Text>
          </GlassCard>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity 
              key={job.job_id} 
              onPress={() => job.status === 'completed' && setSelectedJob(job)}
              activeOpacity={job.status === 'completed' ? 0.7 : 1}
            >
              <JobItem job={job} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function JobItem({ job }: { job: Job }) {
  const getStatusColor = () => {
    switch (job.status) {
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getRiskColor = () => {
    switch (job.risk_level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  return (
    <GlassCard style={styles.jobCard}>
      <View style={styles.jobInfo}>
        <View style={styles.jobMain}>
          <Text style={styles.jobType}>{job.job_type.replace(/_/g, ' ').toUpperCase()}</Text>
          <View style={styles.jobMetaRow}>
            <Text style={styles.jobDate}>{new Date(job.created_at).toLocaleDateString()}</Text>
            {job.status === 'completed' && job.risk_level && (
              <View style={[styles.riskBadge, { borderColor: getRiskColor() }]}>
                <Text style={[styles.riskText, { color: getRiskColor() }]}>
                  {job.risk_level.toUpperCase()} RISK
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
          {job.status === 'completed' ? <CheckCircle2 size={12} color="#22c55e" /> :
           job.status === 'failed' ? <AlertTriangle size={12} color="#ef4444" /> :
           <Clock size={12} color="#f59e0b" />}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      {(job.status === 'processing' || job.status === 'pending') && (
        <View style={styles.progressRow}>
          <View style={styles.jobProgressBg}>
            <View style={[styles.jobProgressFill, { width: `${job.progress || 0}%` }]} />
          </View>
          <Text style={styles.progressPct}>{job.progress || 0}%</Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  mainSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  jobsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 13,
  },
  jobCard: {
    padding: 16,
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobMain: {
    flex: 1,
  },
  jobType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  jobProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
  },
  jobProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    width: 35,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
