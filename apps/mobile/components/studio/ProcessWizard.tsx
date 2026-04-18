import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Wand2, Zap, Scissors, Layout, ChevronRight, Check } from 'lucide-react-native';
import { GlassCard } from '../ui/GlassCard';
import { AIButton } from '../ui/AIButton';
import { usePresets, Preset } from '../../lib/hooks/use-presets';

interface ProcessWizardProps {
  videoId: string;
  onProcess: (presetId: string, parameters: any) => void;
  isProcessing: boolean;
}

export function ProcessWizard({ videoId, onProcess, isProcessing }: ProcessWizardProps) {
  const { presets, fetchPresets, isLoading } = usePresets();
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleStart = () => {
    if (selectedPreset) {
      onProcess(selectedPreset.id, {});
    }
  };

  if (isLoading && presets.length === 0) {
    return <ActivityIndicator size="large" color="#f59e0b" style={{ marginVertical: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>CHOOSE AI MAGIC</Text>
      <Text style={styles.title}>Refine your Story</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
        {presets.map((preset) => (
          <TouchableOpacity 
            key={preset.id} 
            onPress={() => setSelectedPreset(preset)}
            activeOpacity={0.7}
          >
            <GlassCard style={[
              styles.presetCard,
              selectedPreset?.id === preset.id && styles.selectedCard
            ]}>
              <View style={styles.iconBox}>
                {preset.job_type === 'pattern_cut' ? <Scissors color="#f59e0b" size={24} /> : 
                 preset.job_type === 'ai_smart_cut' ? <Zap color="#f59e0b" size={24} /> :
                 <Wand2 color="#f59e0b" size={24} />}
              </View>
              <Text style={styles.presetName}>{preset.name}</Text>
              <Text style={styles.presetDesc}>{preset.description}</Text>
              
              {selectedPreset?.id === preset.id && (
                <View style={styles.checkBadge}>
                  <Check color="#fff" size={12} />
                </View>
              )}
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedPreset && (
        <View style={styles.buttonContainer}>
          <AIButton 
            onPress={handleStart} 
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Boost with AI</Text>
              <ChevronRight color="#fff" size={20} />
            </View>
          </AIButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 20,
  },
  presetsList: {
    paddingRight: 20,
    gap: 16,
  },
  presetCard: {
    width: 160,
    height: 180,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  presetDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginTop: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
