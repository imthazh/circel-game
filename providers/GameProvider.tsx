import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, Difficulty } from '@/types/game';
import { DEFAULT_DIFFICULTY } from '@/constants/gameConfig';

export const [GameProvider, useGameStore] = createContextHook(() => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>({
    [Difficulty.EASY]: 0,
    [Difficulty.NORMAL]: 0,
    [Difficulty.HARD]: 0,
    [Difficulty.SUPER_HARD]: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const savedHighScore = await AsyncStorage.getItem('flappyBird_highScore');
        const savedGamesPlayed = await AsyncStorage.getItem('flappyBird_gamesPlayed');
        const savedDifficulty = await AsyncStorage.getItem('flappyBird_difficulty');
        const savedHighScores = await AsyncStorage.getItem('flappyBird_highScores');
        
        if (savedHighScore) {
          setHighScore(parseInt(savedHighScore, 10));
        }
        if (savedGamesPlayed) {
          setGamesPlayed(parseInt(savedGamesPlayed, 10));
        }
        if (savedDifficulty && Object.values(Difficulty).includes(savedDifficulty as Difficulty)) {
          setDifficulty(savedDifficulty as Difficulty);
        }
        if (savedHighScores) {
          setHighScores(JSON.parse(savedHighScores));
        }
      } catch (error) {
        console.error('Failed to load game stats:', error);
      }
    };

    loadStats();
  }, []);

  const startGame = useCallback(() => {
    setGameState(GameState.PLAYING);
    setScore(0);
  }, []);

  const endGame = useCallback(async () => {
    const currentDifficultyHighScore = highScores[difficulty];
    const newDifficultyHighScore = Math.max(score, currentDifficultyHighScore);
    const newHighScore = Math.max(score, highScore);
    const newGamesPlayed = gamesPlayed + 1;
    
    const newHighScores = {
      ...highScores,
      [difficulty]: newDifficultyHighScore,
    };
    
    setGameState(GameState.GAME_OVER);
    setHighScore(newHighScore);
    setHighScores(newHighScores);
    setGamesPlayed(newGamesPlayed);

    try {
      await AsyncStorage.setItem('flappyBird_highScore', newHighScore.toString());
      await AsyncStorage.setItem('flappyBird_highScores', JSON.stringify(newHighScores));
      await AsyncStorage.setItem('flappyBird_gamesPlayed', newGamesPlayed.toString());
    } catch (error) {
      console.error('Failed to save game stats:', error);
    }
  }, [score, highScore, highScores, difficulty, gamesPlayed]);

  const updateScore = useCallback((newScore: number) => {
    if (typeof newScore !== 'number' || newScore < 0) return;
    setScore(newScore);
  }, []);

  const resetGame = useCallback(() => {
    setGameState(GameState.MENU);
    setScore(0);
  }, []);

  const changeDifficulty = useCallback(async (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    
    try {
      await AsyncStorage.setItem('flappyBird_difficulty', newDifficulty);
    } catch (error) {
      console.error('Failed to save difficulty:', error);
    }
  }, []);

  const resetStats = useCallback(async () => {
    const emptyHighScores = {
      [Difficulty.EASY]: 0,
      [Difficulty.NORMAL]: 0,
      [Difficulty.HARD]: 0,
      [Difficulty.SUPER_HARD]: 0,
    };
    
    setHighScore(0);
    setHighScores(emptyHighScores);
    setGamesPlayed(0);
    
    try {
      await AsyncStorage.removeItem('flappyBird_highScore');
      await AsyncStorage.removeItem('flappyBird_highScores');
      await AsyncStorage.removeItem('flappyBird_gamesPlayed');
    } catch (error) {
      console.error('Failed to reset game stats:', error);
    }
  }, []);

  return useMemo(() => ({
    gameState,
    score,
    highScore,
    highScores,
    gamesPlayed,
    difficulty,
    startGame,
    endGame,
    updateScore,
    resetGame,
    resetStats,
    changeDifficulty,
  }), [gameState, score, highScore, highScores, gamesPlayed, difficulty, startGame, endGame, updateScore, resetGame, resetStats, changeDifficulty]);
});