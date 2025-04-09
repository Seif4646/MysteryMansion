import { z } from "zod";
import { type Player } from "@shared/schema";
import { sendToClient, broadcastToRoom, clients } from "./routes";
import { storage } from "./storage";

// Handler for chat messages
export async function handleChatMessage(clientId: string, payload: any): Promise<void> {
  const client = clients.get(clientId);
  if (!client || !client.playerId || !client.roomCode) {
    console.log('Chat error: Client not found or not in a room', { clientId, client });
    return;
  }
  
  try {
    console.log('Processing chat message:', payload);
    
    // Validate message data
    const messageSchema = z.object({
      text: z.string().min(1).max(500),
      playerId: z.number(),
      playerName: z.string(),
      timestamp: z.date().or(z.string())
    });
    
    const messageData = messageSchema.parse(payload);
    console.log('Message validated:', messageData);
    
    // Ensure the message is from the authenticated player
    if (messageData.playerId !== client.playerId) {
      console.log('Message sender mismatch:', { 
        messagePlayerId: messageData.playerId, 
        clientPlayerId: client.playerId 
      });
      
      return sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message sender' }
      });
    }
    
    // Create a new message object to ensure timestamp is properly formatted
    const processedMessage = {
      playerId: messageData.playerId,
      playerName: messageData.playerName,
      text: messageData.text,
      timestamp: new Date(messageData.timestamp)
    };
    
    console.log('Broadcasting message to room:', client.roomCode, processedMessage);
    
    // Broadcast message to all players in the room
    broadcastToRoom(client.roomCode, {
      type: 'chat_message',
      payload: processedMessage
    });
    
    // Also send confirmation back to sender
    sendToClient(clientId, {
      type: 'chat_message_sent',
      payload: { success: true }
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
    
    console.log('Sending solution to player:', player.name, gameState.solution);
    
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