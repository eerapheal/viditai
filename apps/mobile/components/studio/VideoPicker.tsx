import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Video as VideoIcon, CheckCircle2 } from 'lucide-react-native';
import { GlassCard } from '../ui/GlassCard';

interface VideoPickerProps {
  onVideoSelected: (uri: string, name: string, type: string, file?: any) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export function VideoPicker({ onVideoSelected, isUploading, uploadProgress }: VideoPickerProps) {
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const filename = asset.fileName || `video_${Date.now()}.mp4`;
      const type = asset.mimeType || 'video/mp4';
      onVideoSelected(asset.uri, filename, type, (asset as any).file);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickVideo} disabled={isUploading}>
        <GlassCard style={styles.card}>
          <View style={styles.content}>
            {isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.statusText}>Uploading...</Text>
                {uploadProgress > 0 && (
                   <View style={styles.progressBg}>
                     <View style={[styles.progressFill, { width: `${uploadProgress * 100}%` }]} />
                   </View>
                )}
              </View>
            ) : uploadProgress === 1 ? (
              <View style={styles.successContainer}>
                <CheckCircle2 color="#22c55e" size={48} />
                <Text style={styles.successText}>Upload Complete!</Text>
              </View>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <Upload color="#f59e0b" size={32} />
                </View>
                <Text style={styles.title}>Upload Video</Text>
                <Text style={styles.subtitle}>Select a clip from your library to start editing with AI</Text>
              </>
            )}
          </View>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#334155',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  statusText: {
    color: '#f8fafc',
    marginTop: 12,
    fontWeight: '600',
  },
  progressBg: {
    width: 200,
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    marginTop: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  successContainer: {
    alignItems: 'center',
  },
  successText: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
});
