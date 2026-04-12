import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>AI-POWERED</Text>
        <Text style={styles.heroTitle}>viditai</Text>
        <Text style={styles.heroSubtitle}>
          Your intelligent companion for real-time insights and analysis
        </Text>
      </View>

      {/* Feature Cards */}
      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <Text style={styles.cardEmoji}>{feature.icon}</Text>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const FEATURES = [
  {
    icon: '⚽',
    title: 'Live Football',
    description: 'Real-time scores, standings and match analytics.',
  },
  {
    icon: '📰',
    title: 'Latest News',
    description: 'AI-curated news from trusted global sources.',
  },
  {
    icon: '📊',
    title: 'Smart Analytics',
    description: 'Data-driven predictions and performance insights.',
  },
  {
    icon: '🏆',
    title: 'Tournaments',
    description: 'Track your favourite competitions worldwide.',
  },
];

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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#f59e0b',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
