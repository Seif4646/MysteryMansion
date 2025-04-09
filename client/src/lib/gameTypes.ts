// Game Type Definitions

// Player type
export type Player = {
  id: number;
  name: string;
  sessionId: string;
  roomCode: string | null;
  ready: boolean;
  isHost: boolean;
};

// Room type
export type Room = {
  id: number;
  code: string;
  status: 'waiting' | 'playing' | 'ended';
  playersCount: number;
  maxPlayers: number;
  minPlayers: number;
  createdAt: Date;
};

// Game elements
export type Suspect = 
  | 'colonel_mustard'
  | 'professor_plum'
  | 'reverend_green'
  | 'mrs_peacock'
  | 'miss_scarlet'
  | 'mrs_white';

export type Weapon = 
  | 'knife'
  | 'candlestick'
  | 'revolver'
  | 'rope'
  | 'wrench'
  | 'lead_pipe';

export type GameRoom = 
  | 'study'
  | 'hall'
  | 'lounge'
  | 'library'
  | 'billiard_room'
  | 'dining_room'
  | 'conservatory'
  | 'kitchen';

// Card type
export type Card = {
  type: 'suspect' | 'weapon' | 'room';
  value: string;
};

// Game state
export type GameState = {
  solution: {
    suspect: Suspect;
    weapon: Weapon;
    room: GameRoom;
  };
  currentTurn: number;
  gameCards: {
    suspects: Suspect[];
    weapons: Weapon[];
    rooms: GameRoom[];
  };
  playerCards: Record<string, Array<Suspect | Weapon | GameRoom>>;
};

// Accusation
export type Accusation = {
  suspect: Suspect;
  weapon: Weapon;
  room: GameRoom;
  isFinal?: boolean;
};
