import { 
  type Player, 
  type InsertPlayer, 
  type Room, 
  type InsertRoom,
  type GameState,
  type Suspect,
  type Weapon,
  type GameRoom,
  type Accusation,
  suspects,
  weapons,
  rooms as gameRooms
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Player methods
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerBySessionId(sessionId: string): Promise<Player | undefined>;
  getPlayersByRoomCode(roomCode: string): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;
  
  // Room methods
  getRoom(id: number): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  updateRoomGameState(code: string, gameState: GameState): Promise<boolean>;
  getRoomGameState(code: string): Promise<GameState | undefined>;
  
  // Game methods
  generateRoomCode(): string;
  initializeGame(roomCode: string, playerIds: number[]): Promise<GameState>;
  checkAccusation(roomCode: string, accusation: Accusation): Promise<boolean | {cardType: string, cardValue: string, playerId: number}>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private rooms: Map<number, Room>;
  private playerIdCounter: number;
  private roomIdCounter: number;

  constructor() {
    this.players = new Map();
    this.rooms = new Map();
    this.playerIdCounter = 1;
    this.roomIdCounter = 1;
  }

  // Player methods
  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerBySessionId(sessionId: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(
      (player) => player.sessionId === sessionId
    );
  }

  async getPlayersByRoomCode(roomCode: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(
      (player) => player.roomCode === roomCode
    );
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerIdCounter++;
    const player: Player = { ...insertPlayer, id, ready: false };
    this.players.set(id, player);
    return player;
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }

  async deletePlayer(id: number): Promise<boolean> {
    return this.players.delete(id);
  }

  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(
      (room) => room.code === code
    );
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const createdAt = new Date();
    const room: Room = { 
      ...insertRoom, 
      id, 
      status: "waiting", 
      playersCount: 0,
      createdAt 
    };
    this.rooms.set(id, room);
    return room;
  }

  async updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async updateRoomGameState(code: string, gameState: GameState): Promise<boolean> {
    const room = await this.getRoomByCode(code);
    if (!room) return false;
    
    const updatedRoom = { ...room, gameState };
    this.rooms.set(room.id, updatedRoom);
    return true;
  }
  
  async getRoomGameState(code: string): Promise<GameState | undefined> {
    const room = await this.getRoomByCode(code);
    return room?.gameState as GameState | undefined;
  }

  // Game methods
  generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitting confusing characters
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async initializeGame(roomCode: string, playerIds: number[]): Promise<GameState> {
    // Create array versions of the constants
    const suspectsArray = [...suspects];
    const weaponsArray = [...weapons];
    const roomsArray = [...gameRooms];
    
    // 1. Get random solution (one suspect, one weapon, one room)
    const solution = {
      suspect: suspectsArray[Math.floor(Math.random() * suspectsArray.length)],
      weapon: weaponsArray[Math.floor(Math.random() * weaponsArray.length)],
      room: roomsArray[Math.floor(Math.random() * roomsArray.length)]
    };
    
    // 2. Create copy of remaining cards
    const remainingSuspects = suspectsArray.filter(s => s !== solution.suspect);
    const remainingWeapons = weaponsArray.filter(w => w !== solution.weapon);
    const remainingRooms = roomsArray.filter(r => r !== solution.room);
    
    // 3. Shuffle all remaining cards together
    const allCards: Array<{type: string, value: string}> = [
      ...remainingSuspects.map(s => ({type: 'suspect', value: s})),
      ...remainingWeapons.map(w => ({type: 'weapon', value: w})),
      ...remainingRooms.map(r => ({type: 'room', value: r}))
    ];
    
    // Fisher-Yates shuffle
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    
    // 4. Deal cards to players
    const playerCards: Record<string, Array<Suspect | Weapon | GameRoom>> = {};
    const numPlayers = playerIds.length;
    
    playerIds.forEach((id, index) => {
      playerCards[id.toString()] = [];
    });
    
    // Deal cards one at a time to each player
    let currentPlayerIndex = 0;
    for (const card of allCards) {
      const playerId = playerIds[currentPlayerIndex].toString();
      playerCards[playerId].push(card.value as any);
      
      currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
    }
    
    // 5. Create game state
    const gameState: GameState = {
      solution,
      currentTurn: 0, // Index of the player whose turn it is
      gameCards: {
        suspects: suspectsArray,
        weapons: weaponsArray,
        rooms: roomsArray
      },
      playerCards
    };
    
    // 6. Update the room with the game state
    await this.updateRoomGameState(roomCode, gameState);
    
    return gameState;
  }
  
  async checkAccusation(roomCode: string, accusation: Accusation): Promise<boolean | {cardType: string, cardValue: string, playerId: number}> {
    const gameState = await this.getRoomGameState(roomCode);
    if (!gameState) return false;
    
    // For final accusation, check if it matches the solution
    if (accusation.isFinal) {
      return (
        accusation.suspect === gameState.solution.suspect &&
        accusation.weapon === gameState.solution.weapon &&
        accusation.room === gameState.solution.room
      );
    }
    
    // For regular accusation (suggestion), find if any other player has any of the cards
    const players = await this.getPlayersByRoomCode(roomCode);
    
    // Filter out the accusing player
    const otherPlayers = players.filter(p => p.id.toString() !== accusation.playerId);
    
    // Check each player's cards to see if they can disprove the accusation
    for (const player of otherPlayers) {
      const playerCardsList = gameState.playerCards[player.id.toString()];
      if (!playerCardsList) continue;
      
      // Check if player has any of the accused cards
      if (playerCardsList.some(card => card === accusation.suspect)) {
        return { cardType: 'suspect', cardValue: accusation.suspect, playerId: player.id };
      }
      if (playerCardsList.some(card => card === accusation.weapon)) {
        return { cardType: 'weapon', cardValue: accusation.weapon, playerId: player.id };
      }
      if (playerCardsList.some(card => card === accusation.room)) {
        return { cardType: 'room', cardValue: accusation.room, playerId: player.id };
      }
    }
    
    // If no one can disprove, return true (accusation stands)
    return true;
  }
}

export const storage = new MemStorage();
