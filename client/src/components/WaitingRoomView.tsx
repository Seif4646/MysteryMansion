import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { useGame } from '@/lib/gameContext';
import PlayerCard from './PlayerCard';

const WaitingRoomView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [addingBot, setAddingBot] = useState(false);
  const { 
    room, 
    players, 
    currentPlayer, 
    isHost, 
    isPlayerReady,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    addBot
  } = useGame();

  const roomCode = room?.code || '';
  const playerCount = players.length;
  const maxPlayers = room?.maxPlayers || 6;
  const minPlayers = room?.minPlayers || 2;
  const allPlayersReady = playerCount >= minPlayers && players.every(p => p.ready);
  const isReady = isPlayerReady();
  
  useEffect(() => {
    // If no room exists yet, create one
    if (!room && currentPlayer) {
      createRoom();
    }
  }, [room, currentPlayer, createRoom]);

  const handleJoinRoom = () => {
    // This would open a dialog to enter room code in a real implementation
    const code = prompt(t('enterRoomCode'));
    if (code) {
      joinRoom(code);
    }
  };
  
  const handleToggleReady = () => {
    toggleReady();
  };
  
  const handleStartGame = () => {
    if (playerCount < minPlayers) {
      toast({
        title: t('error'),
        description: t('notEnoughPlayers', { count: minPlayers }),
        variant: "destructive"
      });
      return;
    }
    
    if (!allPlayersReady) {
      toast({
        title: t('error'),
        description: t('notAllPlayersReady'),
        variant: "destructive"
      });
      return;
    }
    
    startGame();
  };
  
  const handleAddBot = async () => {
    if (playerCount >= maxPlayers) {
      toast({
        title: t('error'),
        description: t('maxPlayersReached'),
        variant: "destructive"
      });
      return;
    }
    
    setAddingBot(true);
    try {
      await addBot();
      toast({
        title: t('success'),
        description: t('botAdded'),
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error?.message || t('failedToAddBot'),
        variant: "destructive"
      });
    } finally {
      setAddingBot(false);
    }
  };

  const progressPercentage = Math.min(100, (playerCount / maxPlayers) * 100);

  return (
    <div className="max-w-3xl mx-auto bg-card p-6 rounded-lg shadow-lg my-4">
      <h2 className="font-heading text-2xl md:text-3xl text-secondary mb-6 text-center">{t('waitingRoom')}</h2>
      
      {roomCode && (
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">{t('roomCode')}</p>
          <p className="text-xl font-accent text-secondary">{roomCode}</p>
        </div>
      )}
      
      <div className="mb-6">
        <p className="mb-2 text-card-foreground text-center">
          {t('waitingForPlayers', { min: minPlayers, max: maxPlayers })}
        </p>
        <div className="w-full bg-background rounded-full h-2.5">
          <div 
            className="bg-secondary h-2.5 rounded-full" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="mt-2 text-card-foreground text-center">
          {t('playerCount', { current: playerCount, max: maxPlayers })}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {players.map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            isCurrentPlayer={player.id === currentPlayer?.id}
          />
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
        {!isHost && (
          <button 
            className={`${isReady ? 'bg-destructive' : 'bg-success'} text-white font-bold py-3 px-6 rounded-md transition-colors hover:bg-opacity-90`}
            onClick={handleToggleReady}
          >
            {isReady ? t('notReady') : t('ready')}
          </button>
        )}
        
        {isHost && (
          <>
            <button 
              className={`${isReady ? 'bg-destructive' : 'bg-success'} text-white font-bold py-3 px-6 rounded-md transition-colors hover:bg-opacity-90`}
              onClick={handleToggleReady}
            >
              {isReady ? t('notReady') : t('ready')}
            </button>
            
            <button 
              className={`bg-secondary text-background font-bold py-3 px-6 rounded-md transition-colors hover:bg-opacity-90 ${allPlayersReady ? 'pulse-animation' : ''}`}
              onClick={handleStartGame}
              disabled={!allPlayersReady || playerCount < minPlayers}
            >
              {t('startGame')}
            </button>
          </>
        )}
      </div>
      
      {/* Add bot button */}
      {playerCount < maxPlayers && (
        <div className="flex justify-center">
          <button 
            className="bg-primary text-white font-medium py-2 px-4 rounded-md text-sm transition-colors hover:bg-opacity-90 flex items-center gap-2"
            onClick={handleAddBot}
            disabled={addingBot}
          >
            {addingBot ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            {t('addBot')}
          </button>
        </div>
      )}
    </div>
  );
};

export default WaitingRoomView;
