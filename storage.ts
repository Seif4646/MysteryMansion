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
  suspects as suspectsList,
  weapons as weaponsList,
  gameRooms as roomsList
} from "@shared/schema";

// Convert readonly arrays to regular arrays for iteration
const suspects = [...suspectsList] as Suspect[];
const weapons = [...weaponsList] as Weapon[];
const gameRooms = [...roomsList] as GameRoom[];

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
  addPlayerPoints(id: number, points: number): Promise<Player | undefined>; // Add points to player
  
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
    const player: Player = { 
      ...insertPlayer, 
      id, 
      ready: false,
      points: 0, // Initialize points for new player
      roomCode: insertPlayer.roomCode || null,
      isHost: insertPlayer.isHost || false // Default to false if not provided
    };
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
  
  async addPlayerPoints(id: number, points: number): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const currentPoints = player.points || 0;
    const updatedPlayer = { 
      ...player, 
      points: currentPoints + points 
    };
    
    this.players.set(id, updatedPlayer);
    console.log(`Added ${points} points to player ${player.name}. New total: ${updatedPlayer.points}`);
    return updatedPlayer;
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
      maxPlayers: insertRoom.maxPlayers || 6, // Default max players
      minPlayers: insertRoom.minPlayers || 2, // Default min players
      gameState: {}, // Initialize empty game state
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
    
    console.log('Updating game state for room:', code, JSON.stringify(gameState));
    
    // Make sure to create a deep copy of gameState to avoid reference issues
    const gameStateCopy = JSON.parse(JSON.stringify(gameState));
    const updatedRoom = { ...room, gameState: gameStateCopy };
    this.rooms.set(room.id, updatedRoom);
    return true;
  }
  
  async getRoomGameState(code: string): Promise<GameState | undefined> {
    const room = await this.getRoomByCode(code);
    if (!room) return undefined;
    
    // Log the game state when retrieving
    const gameState = room.gameState as GameState | undefined;
    console.log('Retrieved game state for room:', code, JSON.stringify(gameState));
    return gameState;
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
    // 1. Get random solution (one suspect, one weapon, one room)
    const solution = {
      suspect: suspects[Math.floor(Math.random() * suspects.length)],
      weapon: weapons[Math.floor(Math.random() * weapons.length)],
      room: gameRooms[Math.floor(Math.random() * gameRooms.length)]
    };
    
    // 2. Create copy of remaining cards
    const remainingSuspects = suspects.filter(s => s !== solution.suspect);
    const remainingWeapons = weapons.filter(w => w !== solution.weapon);
    const remainingRooms = gameRooms.filter(r => r !== solution.room);
    
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
        suspects: suspects,
        weapons: weapons,
        rooms: gameRooms
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
