import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { z } from "zod";
import { insertPlayerSchema, type Player, type Accusation } from "@shared/schema";

type WSClient = {
  id: string;
  playerId?: number;
  ws: WebSocket;
  roomCode?: string;
  username?: string;
};

type WSMessageEvent = {
  type: string;
  payload: any;
};

// Keep track of all connected clients
const clients: Map<string, WSClient> = new Map();
// Keep track of room subscriptions
const roomSubscriptions: Map<string, Set<string>> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a specific path
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // WebSocket connection handler
  wss.on('connection', (ws) => {
    // Generate client ID and store the connection
    const clientId = nanoid();
    clients.set(clientId, { id: clientId, ws });
    
    console.log(`New WebSocket connection: ${clientId}`);
    
    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WSMessageEvent;
        await handleWSMessage(clientId, data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        sendToClient(clientId, {
          type: 'error',
          payload: { message: 'Invalid message format' }
        });
      }
    });
    
    // Handle disconnection
    ws.on('close', async () => {
      const client = clients.get(clientId);
      if (client && client.roomCode) {
        // Notify others in the room about the disconnection
        const roomClients = getRoomClients(client.roomCode);
        for (const roomClientId of roomClients) {
          if (roomClientId !== clientId) {
            sendToClient(roomClientId, {
              type: 'player_left',
              payload: { playerId: client.playerId }
            });
          }
        }
        
        // Remove from room subscription
        removeFromRoom(clientId, client.roomCode);
        
        // Update player in database if needed
        if (client.playerId) {
          const player = await storage.getPlayer(client.playerId);
          if (player) {
            await storage.updatePlayer(player.id, { roomCode: null });
          }
        }
      }
      
      // Remove client from tracking
      clients.delete(clientId);
      console.log(`WebSocket connection closed: ${clientId}`);
    });
    
    // Send initial connection confirmation
    sendToClient(clientId, {
      type: 'connected',
      payload: { clientId }
    });
  });
  
  // REST API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Return HTTP server
  return httpServer;
}

// Handler for WebSocket messages
async function handleWSMessage(clientId: string, event: WSMessageEvent): Promise<void> {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (event.type) {
    case 'register_player':
      await handleRegisterPlayer(clientId, event.payload);
      break;
      
    case 'create_room':
      await handleCreateRoom(clientId);
      break;
      
    case 'join_room':
      await handleJoinRoom(clientId, event.payload);
      break;
      
    case 'leave_room':
      await handleLeaveRoom(clientId);
      break;
      
    case 'toggle_ready':
      await handleToggleReady(clientId);
      break;
      
    case 'start_game':
      await handleStartGame(clientId);
      break;
      
    case 'make_accusation':
      await handleMakeAccusation(clientId, event.payload);
      break;
      
    case 'make_final_accusation':
      await handleMakeFinalAccusation(clientId, event.payload);
      break;
      
    case 'end_turn':
      await handleEndTurn(clientId);
      break;
      
    case 'change_room':
      await handleChangeRoom(clientId, event.payload);
      break;
      
    default:
      sendToClient(clientId, {
        type: 'error',
        payload: { message: `Unknown message type: ${event.type}` }
      });
  }
}

// Handler for player registration
async function handleRegisterPlayer(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client) return;
  
  try {
    // Validate name
    const nameSchema = z.object({
      name: z.string().min(2).max(20)
    });
    
    const { name } = nameSchema.parse(payload);
    
    // Create player in database
    const playerData = {
      name,
      sessionId: clientId,
      roomCode: null,
      isHost: false
    };
    
    const player = await storage.createPlayer(playerData);
    
    // Update client with player info
    client.playerId = player.id;
    client.username = player.name;
    
    // Confirm registration
    sendToClient(clientId, {
      type: 'player_registered',
      payload: player
    });
    
  } catch (error) {
    console.error('Error registering player:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Invalid player data' }
    });
  }
}

// Handler for creating a new room
async function handleCreateRoom(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId) return;
  
  try {
    // Generate unique room code
    let roomCode = storage.generateRoomCode();
    let existingRoom = await storage.getRoomByCode(roomCode);
    
    // Ensure room code is unique
    while (existingRoom) {
      roomCode = storage.generateRoomCode();
      existingRoom = await storage.getRoomByCode(roomCode);
    }
    
    // Create room in database
    const room = await storage.createRoom({
      code: roomCode,
      maxPlayers: 6,
      minPlayers: 2
    });
    
    // Update player as host and add to room
    const player = await storage.getPlayer(client.playerId);
    if (player) {
      await storage.updatePlayer(player.id, {
        roomCode,
        isHost: true,
        ready: false
      });
      
      // Update room player count
      await storage.updateRoom(room.id, { playersCount: 1 });
      
      // Update client info
      client.roomCode = roomCode;
      
      // Subscribe client to room updates
      addToRoom(clientId, roomCode);
      
      // Confirm room creation
      sendToClient(clientId, {
        type: 'room_created',
        payload: { 
          room,
          players: [{ ...player, roomCode, isHost: true }]
        }
      });
    }
  } catch (error) {
    console.error('Error creating room:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not create room' }
    });
  }
}

// Handler for joining a room
async function handleJoinRoom(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId) return;
  
  try {
    // Validate room code
    const roomSchema = z.object({
      roomCode: z.string().length(6)
    });
    
    const { roomCode } = roomSchema.parse(payload);
    
    // Check if room exists
    const room = await storage.getRoomByCode(roomCode);
    if (!room) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Room not found' }
      });
    }
    
    // Check if room is full
    if (room.playersCount >= room.maxPlayers) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Room is full' }
      });
    }
    
    // Check if game already started
    if (room.status === 'playing') {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Game already in progress' }
      });
    }
    
    // Update player to join room
    const player = await storage.getPlayer(client.playerId);
    if (player) {
      await storage.updatePlayer(player.id, {
        roomCode,
        ready: false
      });
      
      // Update room player count
      await storage.updateRoom(room.id, { 
        playersCount: room.playersCount + 1 
      });
      
      // Update client info
      client.roomCode = roomCode;
      
      // Subscribe client to room updates
      addToRoom(clientId, roomCode);
      
      // Get all players in the room
      const players = await storage.getPlayersByRoomCode(roomCode);
      
      // Notify all clients in the room about the new player
      broadcastToRoom(roomCode, {
        type: 'player_joined',
        payload: { player, players }
      });
      
      // Confirm room join to the client
      sendToClient(clientId, {
        type: 'room_joined',
        payload: { room, players }
      });
    }
  } catch (error) {
    console.error('Error joining room:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not join room' }
    });
  }
}

// Handler for leaving a room
async function handleLeaveRoom(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    const roomCode = client.roomCode;
    
    // Get room and player
    const room = await storage.getRoomByCode(roomCode);
    const player = await storage.getPlayer(client.playerId);
    
    if (room && player) {
      // Update player to leave room
      await storage.updatePlayer(player.id, {
        roomCode: null,
        ready: false,
        isHost: false
      });
      
      // Update room player count
      await storage.updateRoom(room.id, { 
        playersCount: Math.max(0, room.playersCount - 1) 
      });
      
      // If player was host, assign new host if other players exist
      if (player.isHost) {
        const remainingPlayers = await storage.getPlayersByRoomCode(roomCode);
        if (remainingPlayers.length > 0) {
          // Assign first remaining player as host
          const newHost = remainingPlayers[0];
          await storage.updatePlayer(newHost.id, { isHost: true });
          
          // Notify room about new host
          broadcastToRoom(roomCode, {
            type: 'host_changed',
            payload: { newHostId: newHost.id }
          });
        }
      }
      
      // Notify room about player leaving
      broadcastToRoom(roomCode, {
        type: 'player_left',
        payload: { playerId: player.id }
      });
      
      // Remove client from room subscriptions
      removeFromRoom(clientId, roomCode);
      
      // Update client info
      client.roomCode = undefined;
      
      // Confirm leave to client
      sendToClient(clientId, {
        type: 'room_left',
        payload: { success: true }
      });
    }
  } catch (error) {
    console.error('Error leaving room:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not leave room' }
    });
  }
}

// Handler for toggling ready status
async function handleToggleReady(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    const player = await storage.getPlayer(client.playerId);
    if (player) {
      // Toggle ready status
      const newReadyStatus = !player.ready;
      await storage.updatePlayer(player.id, { ready: newReadyStatus });
      
      // Notify room about player ready status change
      broadcastToRoom(client.roomCode, {
        type: 'player_ready_changed',
        payload: { playerId: player.id, ready: newReadyStatus }
      });
      
      // Get all players to check if everyone is ready
      const roomPlayers = await storage.getPlayersByRoomCode(client.roomCode);
      const allPlayersReady = roomPlayers.length >= 2 && roomPlayers.every(p => p.ready);
      
      // If all players are ready, notify host
      if (allPlayersReady) {
        const host = roomPlayers.find(p => p.isHost);
        if (host) {
          const hostClient = Array.from(clients.values()).find(c => c.playerId === host.id);
          if (hostClient) {
            sendToClient(hostClient.id, {
              type: 'all_players_ready',
              payload: { canStart: true }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error toggling ready status:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not update ready status' }
    });
  }
}

// Handler for starting the game
async function handleStartGame(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Verify client is host
    const player = await storage.getPlayer(client.playerId);
    if (!player || !player.isHost) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Only the host can start the game' }
      });
    }
    
    // Get room and check min players
    const room = await storage.getRoomByCode(client.roomCode);
    const players = await storage.getPlayersByRoomCode(client.roomCode);
    
    if (!room) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Room not found' }
      });
    }
    
    if (players.length < room.minPlayers) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: `Need at least ${room.minPlayers} players to start` }
      });
    }
    
    // Check if all players are ready
    const allReady = players.every(p => p.ready);
    if (!allReady) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Not all players are ready' }
      });
    }
    
    // Update room status
    await storage.updateRoom(room.id, { status: 'playing' });
    
    // Initialize game state with cards distribution
    const playerIds = players.map(p => p.id);
    const gameState = await storage.initializeGame(client.roomCode, playerIds);
    
    // Notify all players that game has started
    broadcastToRoom(client.roomCode, {
      type: 'game_started',
      payload: { roomCode: client.roomCode }
    });
    
    // Send each player their specific cards (privately)
    players.forEach(player => {
      const playerClient = Array.from(clients.values()).find(c => c.playerId === player.id);
      if (playerClient) {
        const playerCards = gameState.playerCards[player.id.toString()] || [];
        sendToClient(playerClient.id, {
          type: 'player_cards',
          payload: { 
            cards: playerCards.map(card => {
              // Determine card type based on the lists
              let type: 'suspect' | 'weapon' | 'room';
              if (gameState.gameCards.suspects.includes(card as any)) {
                type = 'suspect';
              } else if (gameState.gameCards.weapons.includes(card as any)) {
                type = 'weapon';
              } else {
                type = 'room';
              }
              return { type, value: card };
            })
          }
        });
      }
    });
    
    // Send first turn notification
    const firstPlayer = players[0];
    broadcastToRoom(client.roomCode, {
      type: 'turn_changed',
      payload: { playerId: firstPlayer.id }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not start game' }
    });
  }
}

// Handler for making an accusation
async function handleMakeAccusation(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Validate accusation data
    const accusationSchema = z.object({
      suspect: z.string(),
      weapon: z.string(),
      room: z.string()
    });
    
    const accusationData = accusationSchema.parse(payload);
    
    // Check if it's the player's turn
    const gameState = await storage.getRoomGameState(client.roomCode);
    if (!gameState) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Game not found' }
      });
    }
    
    const players = await storage.getPlayersByRoomCode(client.roomCode);
    const playerIndex = players.findIndex(p => p.id === client.playerId);
    
    if (playerIndex !== gameState.currentTurn) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Not your turn' }
      });
    }
    
    // Create accusation object
    const accusation: Accusation = {
      playerId: client.playerId.toString(),
      suspect: accusationData.suspect as any,
      weapon: accusationData.weapon as any,
      room: accusationData.room as any,
      isFinal: false
    };
    
    // Notify all players about the accusation
    broadcastToRoom(client.roomCode, {
      type: 'accusation_made',
      payload: { 
        playerId: client.playerId,
        accusation: {
          suspect: accusation.suspect,
          weapon: accusation.weapon,
          room: accusation.room
        }
      }
    });
    
    // Check if any player can disprove the accusation
    const result = await storage.checkAccusation(client.roomCode, accusation);
    
    if (typeof result === 'object') {
      // Someone can disprove - send private message to the revealer and accuser
      const revealingPlayer = await storage.getPlayer(result.playerId);
      const revealerClient = Array.from(clients.values()).find(c => c.playerId === result.playerId);
      
      if (revealerClient && revealingPlayer) {
        // Notify the accuser about who is revealing
        sendToClient(clientId, {
          type: 'card_being_revealed',
          payload: { 
            revealer: revealingPlayer.name
          }
        });
        
        // Ask the revealer to choose a card to show
        sendToClient(revealerClient.id, {
          type: 'reveal_card_request',
          payload: { 
            accuserId: client.playerId,
            possibleCards: [
              { type: result.cardType, value: result.cardValue }
            ] 
          }
        });
      }
    } else {
      // Nobody can disprove
      broadcastToRoom(client.roomCode, {
        type: 'accusation_not_disproved',
        payload: { 
          playerId: client.playerId,
          accusation: {
            suspect: accusation.suspect,
            weapon: accusation.weapon,
            room: accusation.room
          }
        }
      });
    }
  } catch (error) {
    console.error('Error making accusation:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Invalid accusation data' }
    });
  }
}

// Handler for making a final accusation
async function handleMakeFinalAccusation(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Validate accusation data
    const accusationSchema = z.object({
      suspect: z.string(),
      weapon: z.string(),
      room: z.string()
    });
    
    const accusationData = accusationSchema.parse(payload);
    
    // Create final accusation object
    const finalAccusation: Accusation = {
      playerId: client.playerId.toString(),
      suspect: accusationData.suspect as any,
      weapon: accusationData.weapon as any,
      room: accusationData.room as any,
      isFinal: true
    };
    
    // Check if accusation is correct
    const result = await storage.checkAccusation(client.roomCode, finalAccusation);
    
    // Notify all players about the final accusation and result
    broadcastToRoom(client.roomCode, {
      type: 'final_accusation_result',
      payload: { 
        playerId: client.playerId,
        accusation: {
          suspect: finalAccusation.suspect,
          weapon: finalAccusation.weapon,
          room: finalAccusation.room
        },
        correct: result === true
      }
    });
    
    // If correct, end the game
    if (result === true) {
      const room = await storage.getRoomByCode(client.roomCode);
      if (room) {
        await storage.updateRoom(room.id, { status: 'ended' });
        
        // Get the solution to send to all clients
        const gameState = await storage.getRoomGameState(client.roomCode);
        
        broadcastToRoom(client.roomCode, {
          type: 'game_ended',
          payload: { 
            winner: client.playerId,
            solution: gameState?.solution
          }
        });
      }
    }
  } catch (error) {
    console.error('Error making final accusation:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Invalid accusation data' }
    });
  }
}

// Handler for ending a turn
async function handleEndTurn(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Check if it's the player's turn
    const gameState = await storage.getRoomGameState(client.roomCode);
    if (!gameState) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Game not found' }
      });
    }
    
    const players = await storage.getPlayersByRoomCode(client.roomCode);
    const playerIndex = players.findIndex(p => p.id === client.playerId);
    
    if (playerIndex !== gameState.currentTurn) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Not your turn' }
      });
    }
    
    // Update turn to next player
    const nextTurn = (gameState.currentTurn + 1) % players.length;
    gameState.currentTurn = nextTurn;
    
    // Update game state
    await storage.updateRoomGameState(client.roomCode, gameState);
    
    // Notify all players about turn change
    broadcastToRoom(client.roomCode, {
      type: 'turn_changed',
      payload: { playerId: players[nextTurn].id }
    });
  } catch (error) {
    console.error('Error ending turn:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not end turn' }
    });
  }
}

// Handler for changing rooms in the mansion
async function handleChangeRoom(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Validate room change
    const roomChangeSchema = z.object({
      room: z.string()
    });
    
    const { room } = roomChangeSchema.parse(payload);
    
    // Notify all players about the room change
    broadcastToRoom(client.roomCode, {
      type: 'player_changed_room',
      payload: { 
        playerId: client.playerId,
        room
      }
    });
  } catch (error) {
    console.error('Error changing room:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Invalid room data' }
    });
  }
}

// Helper to add client to a room subscription
function addToRoom(clientId: string, roomCode: string): void {
  if (!roomSubscriptions.has(roomCode)) {
    roomSubscriptions.set(roomCode, new Set());
  }
  roomSubscriptions.get(roomCode)?.add(clientId);
}

// Helper to remove client from a room subscription
function removeFromRoom(clientId: string, roomCode: string): void {
  const roomClients = roomSubscriptions.get(roomCode);
  if (roomClients) {
    roomClients.delete(clientId);
    if (roomClients.size === 0) {
      roomSubscriptions.delete(roomCode);
    }
  }
}

// Helper to get all clients in a room
function getRoomClients(roomCode: string): Set<string> {
  return roomSubscriptions.get(roomCode) || new Set();
}

// Helper to send a message to a specific client
function sendToClient(clientId: string, data: any): void {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
  }
}

// Helper to broadcast a message to all clients in a room
function broadcastToRoom(roomCode: string, data: any): void {
  const roomClients = roomSubscriptions.get(roomCode);
  if (roomClients) {
    for (const clientId of roomClients) {
      sendToClient(clientId, data);
    }
  }
}
