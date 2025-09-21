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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '@/providers/GameProvider';
import { useMultiplayer } from '@/providers/MultiplayerProvider';
import { GameState, Bird, Pipe, MultiplayerState, Difficulty } from '@/types/game';
import { GAME_CONFIG, DIFFICULTY_CONFIGS } from '@/constants/gameConfig';
import MultiplayerGameScreen from '@/components/MultiplayerGameScreen';

export default function FlappyBirdGame() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const {
    gameState,
    score,
    highScore,
    highScores,
    difficulty,
    startGame,
    endGame,
    updateScore,
    resetGame,
    changeDifficulty,
  } = useGameStore();

  const [showDifficultySelect, setShowDifficultySelect] = useState<boolean>(false);
  const currentDifficultyConfig = DIFFICULTY_CONFIGS[difficulty];

  const { multiplayerState, disconnect } = useMultiplayer();
  const [showMultiplayer, setShowMultiplayer] = useState<boolean>(false);

  const [bird, setBird] = useState<Bird>({
    x: SCREEN_WIDTH * 0.2,
    y: SCREEN_HEIGHT * 0.5,
    velocity: 0,
  });

  const [pipes, setPipes] = useState<Pipe[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const birdAnimatedValue = useRef(new Animated.Value(bird.y)).current;
  const currentScoreRef = useRef<number>(score);

  const createPipe = useCallback((x: number): Pipe => {
    const gapHeight = currentDifficultyConfig.pipeGap;
    const minPipeHeight = 50;
    const maxPipeHeight = SCREEN_HEIGHT - gapHeight - minPipeHeight - 100;
    const topPipeHeight = Math.random() * (maxPipeHeight - minPipeHeight) + minPipeHeight;
    
    return {
      id: Date.now() + Math.random(),
      x,
      topHeight: topPipeHeight,
      bottomY: topPipeHeight + gapHeight,
      passed: false,
    };
  }, [SCREEN_HEIGHT, currentDifficultyConfig.pipeGap]);

  const jump = useCallback(() => {
    if (gameState === GameState.MENU) {
      currentScoreRef.current = 0;
      startGame();
      return;
    }
    
    if (gameState === GameState.PLAYING) {
      setBird(prev => ({ ...prev, velocity: currentDifficultyConfig.jumpForce }));
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    
    if (gameState === GameState.GAME_OVER) {
      currentScoreRef.current = 0;
      resetGame();
      setBird({
        x: SCREEN_WIDTH * 0.2,
        y: SCREEN_HEIGHT * 0.5,
        velocity: 0,
      });
      setPipes([]);
    }
  }, [gameState, startGame, resetGame, SCREEN_WIDTH, SCREEN_HEIGHT, currentDifficultyConfig.jumpForce]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: jump,
  });

  const checkCollision = useCallback((birdY: number, currentPipes: Pipe[]): boolean => {
    const birdLeft = bird.x;
    const birdRight = bird.x + GAME_CONFIG.BIRD_SIZE;
    const birdTop = birdY;
    const birdBottom = birdY + GAME_CONFIG.BIRD_SIZE;

    if (birdBottom >= SCREEN_HEIGHT - 50 || birdTop <= 0) {
      return true;
    }

    for (const pipe of currentPipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + GAME_CONFIG.PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
          return true;
        }
      }
    }

    return false;
  }, [bird.x, SCREEN_HEIGHT]);

  const gameLoop = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    setBird(prev => {
      const newVelocity = prev.velocity + currentDifficultyConfig.gravity;
      const newY = prev.y + newVelocity;
      return { ...prev, y: newY, velocity: newVelocity };
    });

    setPipes(prev => {
      let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - currentDifficultyConfig.pipeSpeed }));
      
      newPipes = newPipes.filter(pipe => pipe.x > -GAME_CONFIG.PIPE_WIDTH);
      
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < SCREEN_WIDTH - currentDifficultyConfig.pipeSpacing) {
        newPipes.push(createPipe(SCREEN_WIDTH));
      }
      
      let scoreIncreased = false;
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + GAME_CONFIG.PIPE_WIDTH < bird.x) {
          pipe.passed = true;
          scoreIncreased = true;
        }
      });

      if (scoreIncreased) {
        currentScoreRef.current += 1;
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          updateScore(currentScoreRef.current);
        }, 0);
      }

      return newPipes;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, bird.x, updateScore, createPipe, SCREEN_WIDTH, currentDifficultyConfig.pipeSpeed, currentDifficultyConfig.pipeSpacing, currentDifficultyConfig.gravity]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const hasCollision = checkCollision(bird.y, pipes);
      if (hasCollision) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          endGame();
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }, 0);
      }
    }
  }, [bird.y, pipes, gameState, endGame, checkCollision]);

  useEffect(() => {
    currentScoreRef.current = score;
  }, [score]);

  useEffect(() => {
    Animated.timing(birdAnimatedValue, {
      toValue: bird.y,
      duration: 16,
      useNativeDriver: false,
    }).start();
  }, [bird.y, birdAnimatedValue]);

  const renderBird = () => (
    <Animated.View
      style={[
        styles.bird,
        styles.birdPosition,
        {
          left: bird.x,
          top: birdAnimatedValue,
          transform: [
            {
              rotate: `${Math.min(Math.max(bird.velocity * 3, -30), 30)}deg`,
            },
          ],
        },
      ]}
    />
  );

  const renderPipes = () =>
    pipes.map(pipe => (
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

  const renderDifficultySelect = () => {
    const getDifficultyButtonStyle = (diff: Difficulty, isSelected: boolean) => {
      const config = DIFFICULTY_CONFIGS[diff];
      return [
        styles.difficultyButton,
        isSelected && styles.selectedDifficulty,
        diff === Difficulty.EASY && styles.easyButton,
        diff === Difficulty.NORMAL && styles.normalButton,
        diff === Difficulty.HARD && styles.hardButton,
        diff === Difficulty.SUPER_HARD && styles.superHardButton,
      ];
    };

    return (
      <View style={[styles.menuOverlay, styles.menuOverlayPadding]}>
        <Text style={styles.title}>Chọn độ khó</Text>
        <Text style={styles.subtitle}>Chọn mức độ thử thách!</Text>
        
        <View style={styles.difficultyContainer}>
          {Object.values(Difficulty).map((diff) => {
            const config = DIFFICULTY_CONFIGS[diff];
            const isSelected = difficulty === diff;
            const difficultyHighScore = highScores[diff];
            
            return (
              <TouchableOpacity
                key={diff}
                style={getDifficultyButtonStyle(diff, isSelected)}
                onPress={() => {
                  changeDifficulty(diff);
                  setShowDifficultySelect(false);
                }}
              >
                <Text style={styles.difficultyButtonText}>{config.name}</Text>
                <Text style={styles.difficultyScore}>Kỷ lục: {difficultyHighScore}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setShowDifficultySelect(false)}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMenu = () => {
    const getCurrentDifficultyButtonStyle = () => {
      return [
        styles.currentDifficultyButton,
        difficulty === Difficulty.EASY && styles.easyButton,
        difficulty === Difficulty.NORMAL && styles.normalButton,
        difficulty === Difficulty.HARD && styles.hardButton,
        difficulty === Difficulty.SUPER_HARD && styles.superHardButton,
      ];
    };

    return (
      <View style={[styles.menuOverlay, styles.menuOverlayPadding]}>
        <Text style={styles.title}>Flappy Bird</Text>
        <Text style={styles.subtitle}>Chọn chế độ chơi!</Text>
        
        <View style={styles.currentDifficultyContainer}>
          <Text style={styles.currentDifficultyLabel}>Độ khó hiện tại:</Text>
          <TouchableOpacity 
            style={getCurrentDifficultyButtonStyle()}
            onPress={() => setShowDifficultySelect(true)}
          >
            <Text style={styles.currentDifficultyText}>{currentDifficultyConfig.name}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modeContainer}>
          <TouchableOpacity style={styles.modeButton} onPress={jump}>
            <Text style={styles.modeButtonText}>Chơi một mình</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modeButton} 
            onPress={() => setShowMultiplayer(true)}
          >
            <Text style={styles.modeButtonText}>Nhiều người chơi</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.highScoreText}>Kỷ lục chung: {highScore}</Text>
        <Text style={styles.highScoreText}>Kỷ lục {currentDifficultyConfig.name}: {highScores[difficulty]}</Text>
      </View>
    );
  };

  const renderGameOver = () => (
    <View style={[styles.gameOverOverlay, styles.menuOverlayPadding]}>
      <Text style={styles.gameOverTitle}>Kết thúc!</Text>
      <Text style={styles.finalScore}>Điểm: {score}</Text>
      <Text style={styles.difficultyLabel}>Độ khó: {currentDifficultyConfig.name}</Text>
      <Text style={styles.highScoreText}>Kỷ lục chung: {highScore}</Text>
      <Text style={styles.highScoreText}>Kỷ lục {currentDifficultyConfig.name}: {highScores[difficulty]}</Text>
      
      <TouchableOpacity style={styles.restartButton} onPress={jump}>
        <Text style={styles.restartButtonText}>Chạm để chơi lại</Text>
      </TouchableOpacity>
    </View>
  );

  if (showMultiplayer) {
    return (
      <MultiplayerGameScreen 
        onBackToSinglePlayer={() => {
          setShowMultiplayer(false);
          disconnect();
        }}
      />
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#B0E0E6']}
        style={styles.background}
      />
      
      <View style={styles.ground} />
      
      {gameState === GameState.PLAYING && (
        <>
          {renderPipes()}
          {renderBird()}
          <View style={[styles.scoreContainer, styles.scorePosition]}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        </>
      )}
      
      {gameState === GameState.MENU && !showDifficultySelect && renderMenu()}
      {gameState === GameState.MENU && showDifficultySelect && renderDifficultySelect()}
      {gameState === GameState.GAME_OVER && renderGameOver()}
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
    backgroundColor: '#FFD700',
    borderRadius: GAME_CONFIG.BIRD_SIZE / 2,
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  birdPosition: {
    transform: [
      {
        rotate: '0deg',
      },
    ],
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
  scoreContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: 60,
  },
  scorePosition: {
    top: 60,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
  },
  menuOverlayPadding: {
    paddingTop: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
  },
  modeContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 30,
  },
  modeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  modeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  disabledText: {
    color: '#999',
  },
  currentDifficultyContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  currentDifficultyLabel: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  currentDifficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  currentDifficultyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  difficultyContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 30,
  },
  difficultyButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  normalButton: {
    backgroundColor: '#2196F3',
  },
  hardButton: {
    backgroundColor: '#FF9800',
  },
  superHardButton: {
    backgroundColor: '#F44336',
  },
  selectedDifficulty: {
    borderWidth: 3,
    borderColor: 'white',
  },
  difficultyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  difficultyScore: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  difficultyLabel: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  highScoreText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  gameOverOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 20,
  },
  finalScore: {
    fontSize: 24,
    color: 'white',
    marginBottom: 10,
  },
  restartButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 30,
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});