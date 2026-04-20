import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share as RNShare, Alert, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Download, Share2, ArrowLeft, Shield, Info, CheckCircle2 } from 'lucide-react-native';
import { Job } from '../../lib/hooks/use-jobs';
import { GlassCard } from '../ui/GlassCard';

import { API_BASE } from '../../lib/api';

interface VideoResultViewProps {
  job: Job;
  onBack: () => void;
}

export function VideoResultView({ job, onBack }: VideoResultViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const videoRef = useRef<Video>(null);

  const videoUrl = job.download_url?.startsWith('http') 
    ? job.download_url 
    : `${API_BASE}${job.download_url}`;

  const handleShare = async () => {
    if (!job.download_url) return;
    
    try {
      if (Platform.OS === 'web') {
        await RNShare.share({
          message: 'Check out my AI video!',
          url: videoUrl,
        });
      } else {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const fileUri = FileSystem.cacheDirectory + (job.output_filename || 'video.mp4');
          const { uri } = await FileSystem.downloadAsync(videoUrl, fileUri);
          await Sharing.shareAsync(uri);
        } else {
          await RNShare.share({
            message: 'Check out my AI video!',
            url: videoUrl,
          });
        }
      }
    } catch (error: any) {
      Alert.alert('Share Error', error.message);
    }
  };

  const handleDownload = async () => {
    if (!job.download_url) return;
    
    try {
      setIsDownloading(true);
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to save videos.');
        return;
      }

      const fileUri = FileSystem.cacheDirectory + (job.output_filename || 'video.mp4');
      const { uri } = await FileSystem.downloadAsync(videoUrl, fileUri);
      
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Video saved to your gallery!');
    } catch (error: any) {
      Alert.alert('Save Error', error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color="#94a3b8" />
          <Text style={styles.backText}>Studio</Text>
        </TouchableOpacity>
        
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Share2 size={20} color="#f8fafc" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDownload} 
            disabled={isDownloading}
            style={[styles.actionBtn, styles.downloadBtn]}
          >
            <Download size={20} color="#f8fafc" />
          </TouchableOpacity>
        </View>
      </View>

      <GlassCard style={styles.playerCard}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
        />
      </GlassCard>

      <View style={styles.successNote}>
        <CheckCircle2 size={24} color="#22c55e" />
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle}>Video is ready!</Text>
          <Text style={styles.noteSub}>Your AI masterpiece has been processed and is ready for social media.</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <GlassCard style={styles.riskCard}>
           <View style={styles.cardHeader}>
             <Shield size={16} color="#64748b" />
             <Text style={styles.cardLabel}>RISK ANALYSIS</Text>
             <View style={[styles.riskBadge, { borderColor: getRiskColor(job.risk_level) }]}>
               <Text style={[styles.riskText, { color: getRiskColor(job.risk_level) }]}>
                 {(job.risk_level || 'LOW').toUpperCase()}
               </Text>
             </View>
           </View>
           
           <View style={styles.riskItem}>
             <View style={styles.riskDot} />
             <Text style={styles.riskDesc}>
               {job.risk_level === 'high' 
                 ? 'Copyrighted audio detected. High risk of removal.'
                 : 'AI-modified visuals detected. Good for social algorithms.'}
             </Text>
           </View>

           <View style={styles.infoBox}>
             <Info size={12} color="#64748b" />
             <Text style={styles.infoText}>This is an AI estimate. Always verify rights.</Text>
           </View>
        </GlassCard>

        <GlassCard style={styles.statsCard}>
           <Text style={styles.cardLabel}>EXPORT DETAILS</Text>
           <View style={styles.statRow}>
             <Text style={styles.statLabel}>Duration</Text>
             <Text style={styles.statVal}>{job.output_duration_seconds?.toFixed(1) || '0.0'}s</Text>
           </View>
           <View style={styles.statRow}>
             <Text style={styles.statLabel}>Format</Text>
             <Text style={styles.statVal}>MP4</Text>
           </View>
           <View style={styles.statRow}>
             <Text style={styles.statLabel}>Size</Text>
             <Text style={styles.statVal}>
               {(job.output_size_bytes / (1024*1024)).toFixed(1)} MB
             </Text>
           </View>
        </GlassCard>
      </View>
    </View>
  );
}

function getRiskColor(level?: string) {
  switch (level) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    backgroundColor: '#2563eb',
  },
  playerCard: {
    height: 250,
    overflow: 'hidden',
    backgroundColor: '#000',
    padding: 0,
  },
  video: {
    flex: 1,
  },
  successNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.1)',
    gap: 16,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  noteSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    gap: 16,
  },
  riskCard: {
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    flex: 1,
  },
  riskBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '800',
  },
  riskItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    padding: 12,
    borderRadius: 12,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginTop: 6,
  },
  riskDesc: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },
  statsCard: {
    padding: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  statVal: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
});
