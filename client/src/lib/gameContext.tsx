import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setupWebSocket, wsConnection } from './websocket';
import { useToast } from "@/hooks/use-toast";
import { type Player, type Room, type Card, type Suspect, type Weapon, type GameRoom } from './gameTypes';

// Define game state types
type GameViewType = 'login' | 'waitingRoom' | 'gameplay';

// Define context type
type GameContextType = {
  currentPlayer: Player | null;
  players: Player[];
  room: Room | null;
  gameView: GameViewType;
  playerCards: Card[];
  currentTurn: number;
  isHost: boolean;
  revealCardData: {
    revealer: string;
    cardType: string;
    cardValue: string;
  } | null;
  gameResult: {
    winner: Player | null;
    solution: {
      suspect: string;
      weapon: string;
      room: string;
    };
    isCorrect: boolean;
  } | null;
  
  // Actions
  registerPlayer: (name: string) => Promise<void>;
  createRoom: () => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  makeAccusation: (accusation: { suspect: Suspect; weapon: Weapon; room: GameRoom }) => Promise<void>;
  makeFinalAccusation: (accusation: { suspect: Suspect; weapon: Weapon; room: GameRoom }) => Promise<void>;
  endTurn: () => Promise<void>;
  changeRoom: (room: string) => Promise<void>;
  closeRevealCard: () => void;
  resetGame: () => void;
  isPlayerReady: () => boolean;
  addBot: () => Promise<void>;
};

// Create context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider component
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  
  // State
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameView, setGameView] = useState<GameViewType>('login');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [revealCardData, setRevealCardData] = useState<{
    revealer: string;
    cardType: string;
    cardValue: string;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    winner: Player | null;
    solution: {
      suspect: string;
      weapon: string;
      room: string;
    };
    isCorrect: boolean;
  } | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    setupWebSocket({
      onOpen: () => {
        console.log('WebSocket connection established');
      },
      onClose: () => {
        console.log('WebSocket connection closed');
        toast({
          title: 'Connection Lost',
          description: 'You have been disconnected. Please refresh the page.',
          variant: "destructive"
        });
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'There was an error with the connection.',
          variant: "destructive"
        });
      },
      onMessage: handleWebSocketMessage
    });
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);
  
  // Handle messages from the server
  function handleWebSocketMessage(data: any) {
    const { type, payload } = data;
    
    switch (type) {
      case 'connected':
        console.log('Connected with client ID:', payload.clientId);
        break;
        
      case 'player_registered':
        setCurrentPlayer(payload);
        setGameView('waitingRoom');
        break;
        
      case 'room_created':
        setRoom(payload.room);
        setPlayers(payload.players);
        setIsHost(true);
        break;
        
      case 'room_joined':
        setRoom(payload.room);
        setPlayers(payload.players);
        setIsHost(currentPlayer?.isHost || false);
        break;
        
      case 'player_joined':
        setPlayers(payload.players);
        break;
        
      case 'player_left':
        setPlayers(prev => prev.filter(p => p.id !== payload.playerId));
        break;
        
      case 'host_changed':
        setIsHost(currentPlayer?.id === payload.newHostId);
        setPlayers(prev => 
          prev.map(p => p.id === payload.newHostId 
            ? { ...p, isHost: true } 
            : { ...p, isHost: false }
          )
        );
        break;
        
      case 'player_ready_changed':
        setPlayers(prev => 
          prev.map(p => p.id === payload.playerId 
            ? { ...p, ready: payload.ready } 
            : p
          )
        );
        break;
        
      case 'game_started':
        setGameView('gameplay');
        break;
        
      case 'player_cards':
        setPlayerCards(payload.cards);
        break;
        
      case 'turn_changed':
        const turnPlayerIndex = players.findIndex(p => p.id === payload.playerId);
        setCurrentTurn(turnPlayerIndex !== -1 ? turnPlayerIndex : 0);
        break;
        
      case 'accusation_made':
        // Handle accusation notification
        toast({
          title: 'Accusation Made',
          description: `${players.find(p => p.id === payload.playerId)?.name} accuses ${payload.accusation.suspect} with ${payload.accusation.weapon} in the ${payload.accusation.room}`,
        });
        break;
        
      case 'card_being_revealed':
        toast({
          title: 'Card Reveal',
          description: `${payload.revealer} is revealing a card to you.`,
        });
        break;
        
      case 'reveal_card':
        setRevealCardData({
          revealer: payload.revealer,
          cardType: payload.cardType,
          cardValue: payload.cardValue
        });
        break;
        
      case 'final_accusation_result':
        const accuser = players.find(p => p.id === payload.playerId);
        if (payload.correct) {
          toast({
            title: 'Case Solved!',
            description: `${accuser?.name} solved the case!`,
            variant: "default"
          });
        } else {
          toast({
            title: 'Wrong Accusation',
            description: `${accuser?.name} made a wrong accusation and is out of the game.`,
            variant: "destructive"
          });
        }
        break;
        
      case 'game_ended':
        const winner = players.find(p => p.id === payload.winner) || null;
        setGameResult({
          winner,
          solution: payload.solution,
          isCorrect: true
        });
        break;
        
      case 'error':
        toast({
          title: 'Error',
          description: payload.message,
          variant: "destructive"
        });
        break;
    }
  }
  
  // Register a new player
  const registerPlayer = useCallback(async (name: string) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'register_player',
      payload: { name }
    }));
  }, []);
  
  // Create a new room
  const createRoom = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'create_room',
      payload: {}
    }));
  }, []);
  
  // Join an existing room
  const joinRoom = useCallback(async (roomCode: string) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'join_room',
      payload: { roomCode }
    }));
  }, []);
  
  // Leave the current room
  const leaveRoom = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'leave_room',
      payload: {}
    }));
  }, []);
  
  // Toggle player ready status
  const toggleReady = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'toggle_ready',
      payload: {}
    }));
  }, []);
  
  // Start the game
  const startGame = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'start_game',
      payload: {}
    }));
  }, []);
  
  // Make an accusation
  const makeAccusation = useCallback(async (accusation: { suspect: Suspect; weapon: Weapon; room: GameRoom }) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'make_accusation',
      payload: accusation
    }));
  }, []);
  
  // Make a final accusation
  const makeFinalAccusation = useCallback(async (accusation: { suspect: Suspect; weapon: Weapon; room: GameRoom }) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'make_final_accusation',
      payload: accusation
    }));
  }, []);
  
  // End the current turn
  const endTurn = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'end_turn',
      payload: {}
    }));
  }, []);
  
  // Change player's current room in the mansion
  const changeRoom = useCallback(async (room: string) => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'change_room',
      payload: { room }
    }));
  }, []);
  
  // Close the reveal card modal
  const closeRevealCard = useCallback(() => {
    setRevealCardData(null);
  }, []);
  
  // Reset the game state
  const resetGame = useCallback(() => {
    setGameResult(null);
    setGameView('waitingRoom');
    setPlayerCards([]);
    setCurrentTurn(0);
  }, []);
  
  // Check if current player is ready
  const isPlayerReady = useCallback(() => {
    if (!currentPlayer) return false;
    const player = players.find(p => p.id === currentPlayer.id);
    return player?.ready || false;
  }, [currentPlayer, players]);
  
  // Add a bot to the game
  const addBot = useCallback(async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    wsConnection.send(JSON.stringify({
      type: 'add_bot',
      payload: {}
    }));
  }, []);
  
  // Context value
  const contextValue: GameContextType = {
    currentPlayer,
    players,
    room,
    gameView,
    playerCards,
    currentTurn,
    isHost,
    revealCardData,
    gameResult,
    registerPlayer,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    makeAccusation,
    makeFinalAccusation,
    endTurn,
    changeRoom,
    closeRevealCard,
    resetGame,
    isPlayerReady,
    addBot
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
