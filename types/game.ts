export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

export interface Bird {
  x: number;
  y: number;
  velocity: number;
}

export interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  bird: Bird;
  isAlive: boolean;
}

export interface MultiplayerGame {
  id: string;
  players: Player[];
  gameState: GameState;
  maxPlayers: number;
  connectionType: 'bluetooth' | 'lan';
  hostId: string;
  pipes: Pipe[];
  gameStartTime?: number;
}

export interface GameMessage {
  type: 'player_update' | 'game_state' | 'player_join' | 'player_leave' | 'game_start' | 'game_end' | 'pipes_update';
  playerId: string;
  data: any;
  timestamp: number;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  isHost: boolean;
}

export enum MultiplayerState {
  DISCONNECTED = 'disconnected',
  SEARCHING = 'searching',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  IN_GAME = 'in_game',
}

export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  SUPER_HARD = 'super_hard',
}

export interface DifficultyConfig {
  pipeGap: number;
  pipeSpeed: number;
  gravity: number;
  jumpForce: number;
  pipeSpacing: number;
  name: string;
  color: string;
}