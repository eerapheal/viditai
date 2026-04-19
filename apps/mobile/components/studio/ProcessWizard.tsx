import React, { useState, useEffect } from 'react';
import { Wand2, Zap, Scissors, Layout, ChevronRight, Check, Minus, Plus, Music, VolumeX, Volume2, Mic, Languages, Activity } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Switch } from 'react-native';
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
  
  // Custom Settings (Phase 2 & 3)
  const [keepSeconds, setKeepSeconds] = useState(4);
  const [cutSeconds, setCutSeconds] = useState(1);
  const [audioMode, setAudioMode] = useState<'original' | 'mute' | 'replace'>('original');

  // AI Features (Phase 4)
  const [addCaptions, setAddCaptions] = useState(false);
  const [removeSilence, setRemoveSilence] = useState(true);
  const [removeLowMotion, setRemoveLowMotion] = useState(true);
  const [voiceoverText, setVoiceoverText] = useState('');

  useEffect(() => {
    fetchPresets();
  }, []);

  useEffect(() => {
    if (selectedPreset) {
      if (selectedPreset.parameters.keep_seconds) setKeepSeconds(selectedPreset.parameters.keep_seconds);
      if (selectedPreset.parameters.cut_seconds) setCutSeconds(selectedPreset.parameters.cut_seconds);
      if (selectedPreset.parameters.audio_mode) setAudioMode(selectedPreset.parameters.audio_mode);
      if (selectedPreset.parameters.add_captions) setAddCaptions(selectedPreset.parameters.add_captions);
      if (selectedPreset.parameters.remove_silence) setRemoveSilence(selectedPreset.parameters.remove_silence);
      if (selectedPreset.parameters.remove_low_motion) setRemoveLowMotion(selectedPreset.parameters.remove_low_motion);
    }
  }, [selectedPreset]);

  const handleStart = () => {
    if (selectedPreset) {
      onProcess(selectedPreset.id, {
        keep_seconds: keepSeconds,
        cut_seconds: cutSeconds,
        audio_mode: audioMode,
        add_captions: addCaptions,
        remove_silence: removeSilence,
        remove_low_motion: removeLowMotion,
        text: voiceoverText,
      });
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
                 preset.job_type === 'voiceover_generation' ? <Mic color="#f59e0b" size={24} /> :
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
        <View style={styles.customSection}>
          <View style={styles.divider} />
          
          {/* Pattern Controls (Phase 2) */}
          {selectedPreset.job_type === 'pattern_cut' && (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>RHYTHM PATTERN</Text>
              <View style={styles.controlsRow}>
                <View style={styles.controlItem}>
                  <Text style={styles.controlLabel}>Keep (s)</Text>
                  <View style={styles.numericInput}>
                    <TouchableOpacity onPress={() => setKeepSeconds(Math.max(1, keepSeconds - 1))}>
                      <Minus size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    <Text style={styles.numericValue}>{keepSeconds}</Text>
                    <TouchableOpacity onPress={() => setKeepSeconds(keepSeconds + 1)}>
                      <Plus size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.controlItem}>
                  <Text style={styles.controlLabel}>Cut (s)</Text>
                  <View style={styles.numericInput}>
                    <TouchableOpacity onPress={() => setCutSeconds(Math.max(0.5, cutSeconds - 0.5))}>
                      <Minus size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    <Text style={styles.numericValue}>{cutSeconds}</Text>
                    <TouchableOpacity onPress={() => setCutSeconds(cutSeconds + 0.5)}>
                      <Plus size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* AI Smart Trim Options (Phase 4) */}
          {selectedPreset.job_type === 'ai_smart_cut' && (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>SMART TRIMMING</Text>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelGroup}>
                  <Activity size={18} color="#94a3b8" />
                  <Text style={styles.switchLabel}>Remove Silence</Text>
                </View>
                <Switch 
                  value={removeSilence} 
                  onValueChange={setRemoveSilence}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                />
              </View>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelGroup}>
                  <Zap size={18} color="#94a3b8" />
                  <Text style={styles.switchLabel}>Low Motion Trim</Text>
                </View>
                <Switch 
                  value={removeLowMotion} 
                  onValueChange={setRemoveLowMotion}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                />
              </View>
            </View>
          )}

          {/* AI Subtitles Toggle (Phase 4) */}
          {(selectedPreset.job_type === 'ai_smart_cut' || selectedPreset.job_type === 'subtitle_generation') && (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>ACCESSIBILITY</Text>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelGroup}>
                  <Languages size={18} color="#94a3b8" />
                  <Text style={styles.switchLabel}>AI Captions (Burned-in)</Text>
                </View>
                <Switch 
                  value={addCaptions} 
                  onValueChange={setAddCaptions}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                />
              </View>
            </View>
          )}

          {/* AI Voiceover Input (Phase 4) */}
          {selectedPreset.job_type === 'voiceover_generation' && (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>VOICEOVER SCRIPT</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What should the AI say?"
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
                value={voiceoverText}
                onChangeText={setVoiceoverText}
              />
            </View>
          )}

          {/* Audio Modes (Phase 3) */}
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>AUDIO EXPERIENCE</Text>
            <View style={styles.audioModes}>
              <TouchableOpacity 
                style={[styles.audioChip, audioMode === 'original' && styles.selectedChip]}
                onPress={() => setAudioMode('original')}
              >
                <Volume2 size={16} color={audioMode === 'original' ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, audioMode === 'original' && styles.selectedChipText]}>Original</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.audioChip, audioMode === 'mute' && styles.selectedChip]}
                onPress={() => setAudioMode('mute')}
              >
                <VolumeX size={16} color={audioMode === 'mute' ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, audioMode === 'mute' && styles.selectedChipText]}>Mute</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.audioChip, audioMode === 'replace' && styles.selectedChip]}
                onPress={() => setAudioMode('replace')}
              >
                <Music size={16} color={audioMode === 'replace' ? '#fff' : '#64748b'} />
                <Text style={[styles.chipText, audioMode === 'replace' && styles.selectedChipText]}>Remix</Text>
              </TouchableOpacity>
            </View>
          </View>

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
    paddingBottom: 10,
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
  customSection: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  settingGroup: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  controlItem: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  numericInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  numericValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  audioModes: {
    flexDirection: 'row',
    gap: 10,
  },
  audioChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
  },
  chipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedChipText: {
    color: '#f8fafc',
  },
  buttonContainer: {
    marginTop: 10,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  switchLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    color: '#f8fafc',
    padding: 16,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
  },
});
