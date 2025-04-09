import { z } from "zod";
import { type Player } from "@shared/schema";
import { sendToClient, broadcastToRoom, clients } from "./routes";
import { storage } from "./storage";

// Handler for chat messages
export async function handleChatMessage(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Validate message data
    const messageSchema = z.object({
      text: z.string().min(1).max(500),
      playerId: z.number(),
      playerName: z.string(),
      timestamp: z.date().or(z.string())
    });
    
    const messageData = messageSchema.parse(payload);
    
    // Ensure the message is from the authenticated player
    if (messageData.playerId !== client.playerId) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message sender' }
      });
    }
    
    // Broadcast message to all players in the room
    broadcastToRoom(client.roomCode, {
      type: 'chat_message',
      payload: {
        ...messageData,
        timestamp: new Date(messageData.timestamp)
      }
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not send message' }
    });
  }
}

// Handler for getting the solution (cheat mode) - only for player named "seif"
export async function handleGetSolution(clientId: string): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) return;
  
  try {
    // Check if the player name is "seif" (case insensitive)
    const player = await storage.getPlayer(client.playerId);
    if (!player || player.name.toLowerCase() !== 'seif') {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Access denied' }
      });
    }
    
    // Get the game state and solution
    const gameState = await storage.getRoomGameState(client.roomCode);
    if (!gameState) {
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Game not found' }
      });
    }
    
    // Send solution to the player
    sendToClient(clientId, {
      type: 'solution_revealed',
      payload: {
        solution: gameState.solution
      }
    });
  } catch (error) {
    console.error('Error getting solution:', error);
    sendToClient(clientId, {
      type: 'error',
      payload: { message: 'Could not retrieve solution' }
    });
  }
}