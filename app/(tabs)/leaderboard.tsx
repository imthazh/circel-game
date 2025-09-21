import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Medal, Award, Users, Wifi, Bluetooth } from 'lucide-react-native';
import { useGameStore } from '@/providers/GameProvider';
import { useMultiplayer } from '@/providers/MultiplayerProvider';

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { highScore, gamesPlayed, resetStats } = useGameStore();
  const { multiplayerState, currentGame, disconnect } = useMultiplayer();

  const multiplayerModes = [
    { id: '1v1', name: '1 vs 1', players: 2, icon: Users },
    { id: '2v2', name: '2 vs 2', players: 4, icon: Users },
    { id: '3v3', name: '3 vs 3', players: 6, icon: Users },
    { id: '5v5', name: '5 vs 5', players: 10, icon: Users },
    { id: '10v10', name: '10 vs 10', players: 20, icon: Users },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#B0E0E6']}
        style={styles.background}
      />
      
      <View style={[styles.header, { paddingTop: 60 + insets.top }]}>
        <Trophy size={40} color="#FFD700" />
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Award size={30} color="#FFD700" />
          <Text style={styles.statValue}>{highScore}</Text>
          <Text style={styles.statLabel}>High Score</Text>
        </View>
        
        <View style={styles.statCard}>
          <Medal size={30} color="#C0C0C0" />
          <Text style={styles.statValue}>{gamesPlayed}</Text>
          <Text style={styles.statLabel}>Games Played</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Multiplayer Status</Text>
        
        {currentGame ? (
          <View style={styles.currentGameCard}>
            <Text style={styles.currentGameTitle}>Current Game</Text>
            <Text style={styles.currentGameInfo}>
              {currentGame.players.length}/{currentGame.maxPlayers} players
            </Text>
            <Text style={styles.currentGameInfo}>
              Connection: {currentGame.connectionType === 'bluetooth' ? 'Bluetooth' : 'LAN'}
            </Text>
            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionSubtitle}>Available - Connect via Bluetooth or LAN</Text>
            
            <View style={styles.connectionOptions}>
              <View style={styles.connectionCard}>
                <Bluetooth size={24} color="#4A90E2" />
                <Text style={styles.connectionText}>Bluetooth</Text>
              </View>
              
              <View style={styles.connectionCard}>
                <Wifi size={24} color="#4A90E2" />
                <Text style={styles.connectionText}>LAN</Text>
              </View>
            </View>

            <Text style={styles.modesTitle}>Available Modes:</Text>
            {multiplayerModes.map((mode) => (
              <View key={mode.id} style={styles.modeCard}>
                <mode.icon size={24} color="#4A90E2" />
                <View style={styles.modeInfo}>
                  <Text style={styles.modeName}>{mode.name}</Text>
                  <Text style={styles.modeDescription}>
                    {mode.players} players total
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetStats}>
        <Text style={styles.resetButtonText}>Reset Statistics</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  connectionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    minWidth: 100,
  },
  connectionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    fontWeight: '600',
  },
  modeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modeInfo: {
    marginLeft: 15,
    flex: 1,
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  disabledText: {
    color: '#999',
  },
  currentGameCard: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  currentGameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  currentGameInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  disconnectButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    marginTop: 10,
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});