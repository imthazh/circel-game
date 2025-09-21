import { Difficulty, DifficultyConfig } from '@/types/game';

export const GAME_CONFIG = {
  BIRD_SIZE: 30,
  PIPE_WIDTH: 80, // Expanded from 60 to 80
  GROUND_HEIGHT: 50,
  JUMP_FORCE: -12,
  GRAVITY: 0.6,
} as const;

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: {
    pipeGap: 200,
    pipeSpeed: 2,
    gravity: 0.4,
    jumpForce: -10,
    pipeSpacing: 250,
    name: 'Dễ',
    color: '#4CAF50',
  },
  [Difficulty.NORMAL]: {
    pipeGap: 150,
    pipeSpeed: 3,
    gravity: 0.6,
    jumpForce: -12,
    pipeSpacing: 200,
    name: 'Bình thường',
    color: '#2196F3',
  },
  [Difficulty.HARD]: {
    pipeGap: 120,
    pipeSpeed: 4,
    gravity: 0.8,
    jumpForce: -14,
    pipeSpacing: 180,
    name: 'Khó',
    color: '#FF9800',
  },
  [Difficulty.SUPER_HARD]: {
    pipeGap: 100,
    pipeSpeed: 5,
    gravity: 1.0,
    jumpForce: -16,
    pipeSpacing: 160,
    name: 'Siêu khó',
    color: '#F44336',
  },
};

export const DEFAULT_DIFFICULTY = Difficulty.NORMAL;