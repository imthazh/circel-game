import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  useWindowDimensions,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { 
  Bluetooth, 
  Wifi, 
  Users, 
  Play, 
  X, 
  Search,
  Crown,
  Trophy,
  Skull,
} from 'lucide-react-native';
import { useMultiplayer } from '@/providers/MultiplayerProvider';
import { GameState, Player, MultiplayerState } from '@/types/game';
import { GAME_CONFIG } from '@/constants/gameConfig';

interface MultiplayerGameScreenProps {
  onBackToSinglePlayer: () => void;
}

export default function MultiplayerGameScreen({ onBackToSinglePlayer }: MultiplayerGameScreenProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const {
    multiplayerState,
    currentGame,
    connectionInfo,
    availableDevices,
    connectionType,
    playerName,
    searchForDevices,
    connectToDevice,
    hostGame,
    startMultiplayerGame,
    updatePlayerBird,
    updatePlayerScore,
    playerDied,
    disconnect,
    stopSearching,
    savePlayerName,
  } = useMultiplayer();

  const [showModeSelection, setShowModeSelection] = useState<boolean>(true);
  const [showConnectionType, setShowConnectionType] = useState<boolean>(false);
  const [showDeviceList, setShowDeviceList] = useState<boolean>(false);
  const [showPlayerNameModal, setShowPlayerNameModal] = useState<boolean>(false);
  const [selectedMode, setSelectedMode] = useState<{ players: number; name: string } | null>(null);
  const [tempPlayerName, setTempPlayerName] = useState<string>(playerName);
  const [myBird, setMyBird] = useState<{ x: number; y: number; velocity: number }>({
    x: SCREEN_WIDTH * 0.2,
    y: SCREEN_HEIGHT * 0.5,
    velocity: 0,
  });

  const gameLoopRef = useRef<number | null>(null);
  const birdAnimatedValue = useRef(new Animated.Value(myBird.y)).current;

  const multiplayerModes = [
    { players: 2, name: '1 vs 1' },
    { players: 4, name: '2 vs 2' },
    { players: 6, name: '3 vs 3' },
    { players: 10, name: '5 vs 5' },
    { players: 20, name: '10 vs 10' },
  ];

  const jump = useCallback(() => {
    if (currentGame?.gameState === GameState.PLAYING && connectionInfo) {
      const newBird = { ...myBird, velocity: GAME_CONFIG.JUMP_FORCE };
      setMyBird(newBird);
      updatePlayerBird(newBird);
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [currentGame, connectionInfo, myBird, updatePlayerBird]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: jump,
  });

  const checkCollision = useCallback((birdY: number): boolean => {
    const birdLeft = myBird.x;
    const birdRight = myBird.x + GAME_CONFIG.BIRD_SIZE;
    const birdTop = birdY;
    const birdBottom = birdY + GAME_CONFIG.BIRD_SIZE;

    if (birdBottom >= SCREEN_HEIGHT - 50 || birdTop <= 0) {
      return true;
    }

    if (currentGame?.pipes) {
      for (const pipe of currentGame.pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + GAME_CONFIG.PIPE_WIDTH;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
            return true;
          }
        }
      }
    }

    return false;
  }, [myBird.x, SCREEN_HEIGHT, currentGame?.pipes]);

  const gameLoop = useCallback(() => {
    if (currentGame?.gameState !== GameState.PLAYING || !connectionInfo) return;

    setMyBird(prev => {
      const newVelocity = prev.velocity + GAME_CONFIG.GRAVITY;
      const newY = prev.y + newVelocity;
      const newBird = { ...prev, y: newY, velocity: newVelocity };
      
      if (checkCollision(newY)) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          playerDied();
        }, 0);
        return prev;
      }
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        updatePlayerBird(newBird);
      }, 0);
      return newBird;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [currentGame?.gameState, connectionInfo, checkCollision, playerDied, updatePlayerBird]);

  useEffect(() => {
    if (currentGame?.gameState === GameState.PLAYING) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [currentGame?.gameState, gameLoop]);

  useEffect(() => {
    Animated.timing(birdAnimatedValue, {
      toValue: myBird.y,
      duration: 16,
      useNativeDriver: false,
    }).start();
  }, [myBird.y, birdAnimatedValue]);

  const handleModeSelect = (mode: { players: number; name: string }) => {
    setSelectedMode(mode);
    setShowModeSelection(false);
    setShowConnectionType(true);
  };

  const handleConnectionTypeSelect = (type: 'bluetooth' | 'lan') => {
    setShowConnectionType(false);
    setShowDeviceList(true);
    searchForDevices(type);
  };

  const handleHostGame = () => {
    if (selectedMode) {
      setShowDeviceList(false);
      hostGame(selectedMode.players, connectionType);
    }
  };

  const handleDeviceConnect = (device: any) => {
    connectToDevice(device);
  };

  const handleStartGame = () => {
    if (connectionInfo?.isHost) {
      startMultiplayerGame();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowModeSelection(true);
    setShowConnectionType(false);
    setShowDeviceList(false);
  };

  const handleSavePlayerName = () => {
    if (tempPlayerName.trim()) {
      savePlayerName(tempPlayerName.trim());
      setShowPlayerNameModal(false);
    }
  };

  const renderPlayer = (player: Player, index: number) => {
    const isMe = player.id === connectionInfo?.id;
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    const color = colors[index % colors.length];
    
    return (
      <View key={player.id} style={styles.playerBird}>
        <Animated.View
          style={[
            styles.bird,
            {
              left: player.bird.x,
              top: isMe ? birdAnimatedValue : player.bird.y,
            },
            isMe ? [styles.myBirdStyle, { backgroundColor: color }] : [styles.otherBirdStyle, { backgroundColor: color }],
          ]}
        />
      </View>
    );
  };

  const renderPipes = () => {
    if (!currentGame?.pipes) return null;
    
    return currentGame.pipes.map(pipe => (
      <View key={pipe.id}>
        <View
          style={[
            styles.pipe,
            styles.topPipe,
            {
              left: pipe.x,
              height: pipe.topHeight,
            },
          ]}
        />
        <View
          style={[
            styles.pipe,
            styles.bottomPipe,
            {
              left: pipe.x,
              top: pipe.bottomY,
              height: SCREEN_HEIGHT - pipe.bottomY - 50,
            },
          ]}
        />
      </View>
    ));
  };

  const renderPlayerList = () => {
    if (!currentGame?.players) return null;

    return (
      <View style={styles.playerListContainer}>
        <Text style={styles.playerListTitle}>Players ({currentGame.players.length}/{currentGame.maxPlayers})</Text>
        {currentGame.players.map((player, index) => {
          const isMe = player.id === connectionInfo?.id;
          const isHost = player.id === currentGame.hostId;
          const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
          const color = colors[index % colors.length];
          
          return (
            <View key={player.id} style={styles.playerItem}>
              <View style={[styles.playerColor, { backgroundColor: color }]} />
              <Text style={[styles.playerNameText, isMe && styles.myPlayerName]}>
                {player.name} {isMe && '(You)'}
              </Text>
              {isHost && <Crown size={16} color="#FFD700" />}
              <Text style={styles.playerScore}>{player.score}</Text>
              {!player.isAlive && <Skull size={16} color="#FF6B6B" />}
            </View>
          );
        })}
      </View>
    );
  };

  const renderModeSelection = () => (
    <Modal visible={showModeSelection} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Game Mode</Text>
            <TouchableOpacity onPress={onBackToSinglePlayer} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.playerNameButton}
            onPress={() => setShowPlayerNameModal(true)}
          >
            <Text style={styles.playerNameButtonText}>Player Name: {playerName}</Text>
          </TouchableOpacity>

          <ScrollView style={styles.modeList}>
            {multiplayerModes.map((mode) => (
              <TouchableOpacity
                key={mode.name}
                style={styles.modeButton}
                onPress={() => handleModeSelect(mode)}
              >
                <Users size={24} color="#333" />
                <View style={styles.modeInfo}>
                  <Text style={styles.modeName}>{mode.name}</Text>
                  <Text style={styles.modeDescription}>{mode.players} players total</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderConnectionTypeSelection = () => (
    <Modal visible={showConnectionType} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Connection Type</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowConnectionType(false);
                setShowModeSelection(true);
              }} 
              style={styles.closeButton}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.connectionOptions}>
            <TouchableOpacity
              style={styles.connectionButton}
              onPress={() => handleConnectionTypeSelect('bluetooth')}
            >
              <Bluetooth size={32} color="#4A90E2" />
              <Text style={styles.connectionButtonText}>Bluetooth</Text>
              <Text style={styles.connectionDescription}>Connect nearby devices</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectionButton}
              onPress={() => handleConnectionTypeSelect('lan')}
            >
              <Wifi size={32} color="#4A90E2" />
              <Text style={styles.connectionButtonText}>LAN/WiFi</Text>
              <Text style={styles.connectionDescription}>Connect over network</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDeviceList = () => (
    <Modal visible={showDeviceList} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {connectionType === 'bluetooth' ? 'Bluetooth Devices' : 'LAN Devices'}
            </Text>
            <TouchableOpacity onPress={stopSearching} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.hostButton} onPress={handleHostGame}>
            <Crown size={24} color="#FFD700" />
            <Text style={styles.hostButtonText}>Host Game</Text>
          </TouchableOpacity>

          {multiplayerState === MultiplayerState.SEARCHING && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.searchingText}>Searching for devices...</Text>
            </View>
          )}

          <ScrollView style={styles.deviceList}>
            {availableDevices.map((device) => (
              <TouchableOpacity
                key={device.id}
                style={styles.deviceButton}
                onPress={() => handleDeviceConnect(device)}
              >
                <Search size={20} color="#666" />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceDetails}>
                    {connectionType === 'bluetooth' 
                      ? (device as any).address 
                      : `${(device as any).ip}:${(device as any).port}`
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderPlayerNameModal = () => (
    <Modal visible={showPlayerNameModal} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.nameModalContent}>
          <Text style={styles.nameModalTitle}>Enter Your Name</Text>
          <TextInput
            style={styles.nameInput}
            value={tempPlayerName}
            onChangeText={setTempPlayerName}
            placeholder="Player name"
            maxLength={20}
            autoFocus
          />
          <View style={styles.nameModalButtons}>
            <TouchableOpacity 
              style={[styles.nameModalButton, styles.cancelButton]}
              onPress={() => {
                setTempPlayerName(playerName);
                setShowPlayerNameModal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.nameModalButton, styles.saveButton]}
              onPress={handleSavePlayerName}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLobby = () => (
    <View style={[styles.lobbyContainer, { paddingTop: insets.top + 20 }]}>
      <View style={styles.lobbyHeader}>
        <Text style={styles.lobbyTitle}>Game Lobby</Text>
        <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
          <X size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <View style={styles.connectionStatus}>
        <Text style={styles.connectionStatusText}>
          Connected via {connectionType === 'bluetooth' ? 'Bluetooth' : 'LAN'}
        </Text>
        {connectionInfo?.isHost && (
          <View style={styles.hostBadge}>
            <Crown size={16} color="#FFD700" />
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        )}
      </View>

      {renderPlayerList()}

      {connectionInfo?.isHost && currentGame && (
        <TouchableOpacity 
          style={[
            styles.startGameButton,
            currentGame.players.length < 2 && styles.disabledButton
          ]}
          onPress={handleStartGame}
          disabled={currentGame.players.length < 2}
        >
          <Play size={24} color="white" />
          <Text style={styles.startGameButtonText}>Start Game</Text>
        </TouchableOpacity>
      )}

      {!connectionInfo?.isHost && (
        <Text style={styles.waitingText}>Waiting for host to start the game...</Text>
      )}
    </View>
  );

  const renderGame = () => (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#B0E0E6']}
        style={styles.background}
      />
      
      <View style={styles.ground} />
      
      {renderPipes()}
      
      {currentGame?.players.map((player, index) => renderPlayer(player, index))}
      
      <View style={styles.gameUI}>
        <View style={styles.scoreContainer}>
          <Trophy size={24} color="#FFD700" />
          <Text style={styles.scoreText}>
            {currentGame?.players.find(p => p.id === connectionInfo?.id)?.score || 0}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.leaveGameButton} onPress={handleDisconnect}>
          <X size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.miniPlayerList}>
        {currentGame?.players.slice(0, 5).map((player, index) => {
          const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
          const color = colors[index % colors.length];
          const isMe = player.id === connectionInfo?.id;
          
          return (
            <View key={player.id} style={styles.miniPlayerItem}>
              <View style={[styles.miniPlayerColor, { backgroundColor: color }]} />
              <Text style={[styles.miniPlayerName, !player.isAlive && styles.deadPlayer]}>
                {player.name.substring(0, 8)}{isMe ? ' (You)' : ''}
              </Text>
              <Text style={styles.miniPlayerScore}>{player.score}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (multiplayerState === MultiplayerState.IN_GAME && currentGame?.gameState === GameState.PLAYING) {
    return renderGame();
  }

  if (multiplayerState === MultiplayerState.CONNECTED || multiplayerState === MultiplayerState.IN_GAME) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#87CEEB', '#98D8E8', '#B0E0E6']}
          style={styles.background}
        />
        {renderLobby()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#B0E0E6']}
        style={styles.background}
      />
      
      {renderModeSelection()}
      {renderConnectionTypeSelection()}
      {renderDeviceList()}
      {renderPlayerNameModal()}
      
      {multiplayerState === MultiplayerState.CONNECTING && (
        <View style={[styles.connectingOverlay, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}
    </View>
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
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#8B4513',
  },
  bird: {
    position: 'absolute',
    width: GAME_CONFIG.BIRD_SIZE,
    height: GAME_CONFIG.BIRD_SIZE,
    borderRadius: GAME_CONFIG.BIRD_SIZE / 2,
    borderWidth: 2,
  },
  playerBird: {
    position: 'absolute',
  },
  pipe: {
    position: 'absolute',
    width: GAME_CONFIG.PIPE_WIDTH,
    backgroundColor: '#228B22',
    borderWidth: 2,
    borderColor: '#006400',
  },
  topPipe: {
    top: 0,
  },
  bottomPipe: {
    bottom: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  playerNameButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  playerNameButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  modeList: {
    maxHeight: 400,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
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
  connectionOptions: {
    gap: 15,
  },
  connectionButton: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  connectionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  hostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  hostButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  searchingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  searchingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  deviceInfo: {
    marginLeft: 15,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  nameModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
  },
  nameModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  nameModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  nameModalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  lobbyContainer: {
    flex: 1,
    padding: 20,
  },
  lobbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  lobbyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  connectionStatusText: {
    fontSize: 16,
    color: 'white',
    marginRight: 10,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  hostBadgeText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  playerListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  playerListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  playerNameText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  myPlayerName: {
    fontWeight: 'bold',
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginHorizontal: 10,
  },
  startGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  startGameButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  waitingText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  connectingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  connectingText: {
    fontSize: 18,
    color: 'white',
    marginTop: 20,
  },
  gameUI: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  leaveGameButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
    padding: 10,
    borderRadius: 20,
  },
  miniPlayerList: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 10,
    maxWidth: 150,
  },
  miniPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  miniPlayerColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  miniPlayerName: {
    flex: 1,
    fontSize: 12,
    color: 'white',
  },
  deadPlayer: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  miniPlayerScore: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  myBirdStyle: {
    borderColor: '#FFA500',
    borderWidth: 3,
  },
  otherBirdStyle: {
    borderColor: '#333',
    borderWidth: 2,
  },
  playerBirdContainer: {
    position: 'absolute',
  },
});