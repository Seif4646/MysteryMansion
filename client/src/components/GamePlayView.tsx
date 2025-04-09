import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/lib/gameContext';
import MansionMap from './MansionMap';
import { RevealCardModal, FinalAccusationModal, GameResultModal } from './GameModals';
import { useToast } from '@/hooks/use-toast';
import { type Suspect, type Weapon, type GameRoom } from '@/lib/gameTypes';
import ChatBox from './ChatBox';
import CheatMenu from './CheatMenu';

const GamePlayView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { 
    currentPlayer, 
    players, 
    playerCards, 
    currentTurn,
    makeAccusation,
    makeFinalAccusation,
    endTurn,
    changeRoom
  } = useGame();
  
  const [currentRoom, setCurrentRoom] = useState<string>('hall');
  const [notes, setNotes] = useState('');
  
  // Form state
  const [suspectValue, setSuspectValue] = useState('');
  const [weaponValue, setWeaponValue] = useState('');
  const [roomValue, setRoomValue] = useState('');
  
  // Modal states
  const [showFinalAccusationModal, setShowFinalAccusationModal] = useState(false);
  
  const isMyTurn = currentPlayer && players[currentTurn]?.id === currentPlayer.id;
  const otherPlayers = players.filter(p => p.id !== currentPlayer?.id);
  
  const handleRoomClick = (room: string) => {
    setCurrentRoom(room);
    changeRoom(room);
    
    // Show final accusation modal when entering a room (not center)
    if (room !== 'center' && isMyTurn) {
      setRoomValue(room);
      setShowFinalAccusationModal(true);
    }
  };
  
  const handleMakeAccusation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!suspectValue || !weaponValue || !roomValue) {
      toast({
        title: t('error'),
        description: t('fillAllFields'),
        variant: "destructive"
      });
      return;
    }
    
    if (!isMyTurn) {
      toast({
        title: t('error'),
        description: t('notYourTurn'),
        variant: "destructive"
      });
      return;
    }
    
    makeAccusation({
      suspect: suspectValue as Suspect,
      weapon: weaponValue as Weapon,
      room: roomValue as GameRoom
    });
    
    // Reset form
    setSuspectValue('');
    setWeaponValue('');
    setRoomValue('');
  };
  
  const handleEndTurn = () => {
    if (!isMyTurn) {
      toast({
        title: t('error'),
        description: t('notYourTurn'),
        variant: "destructive"
      });
      return;
    }
    
    endTurn();
  };
  
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      {/* Left Panel - Player Info & Cards */}
      <div className="bg-card rounded-lg shadow-lg p-4 flex flex-col h-full">
        <h3 className="font-heading text-xl text-secondary mb-4">{t('yourDetectiveNotes')}</h3>
        
        {/* Player Card */}
        <div className="bg-background rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mr-3">
              <span className="material-icons text-primary-foreground text-2xl">person</span>
            </div>
            <div>
              <p className="text-foreground font-medium">{currentPlayer?.name}</p>
              {isMyTurn && (
                <p className="text-secondary text-sm">
                  <span className="material-icons text-xs align-middle">radio_button_checked</span> {t('yourTurn')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Your Cards */}
        <h4 className="font-accent text-foreground mb-2">{t('yourCards')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 mb-4">
          {playerCards.map((card, index) => (
            <div key={index} className="game-card bg-primary bg-opacity-40 rounded-md p-3 border border-primary">
              <div className="text-secondary font-bold mb-1">{t(`cardType.${card.type}`)}</div>
              <div className="text-foreground">{t(`${card.type}.${card.value}`)}</div>
            </div>
          ))}
        </div>
        
        {/* Notes Section */}
        <h4 className="font-accent text-foreground mb-2">{t('detectiveNotes')}</h4>
        <div className="bg-background rounded-md p-3 flex-grow">
          <textarea 
            className="w-full h-full bg-transparent text-foreground resize-none focus:outline-none" 
            placeholder={t('notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>
      </div>
      
      {/* Center Panel - Game Board / Mansion Map */}
      <div className="bg-card rounded-lg shadow-lg p-4 flex flex-col h-full">
        <h3 className="font-heading text-xl text-secondary mb-4">{t('mansionMap')}</h3>
        
        {/* Mansion Layout */}
        <div className="flex-grow">
          <MansionMap currentRoom={currentRoom} onRoomClick={handleRoomClick} />
        </div>
        
        {/* Current Location */}
        <div className="mt-4 bg-background rounded-md p-3 text-center">
          <p className="text-secondary text-sm">{t('currentLocation')}</p>
          <p className="text-foreground font-accent">{t(`rooms.${currentRoom}`)}</p>
        </div>
      </div>
      
      {/* Right Panel - Game Actions & Players */}
      <div className="bg-card rounded-lg shadow-lg p-4 flex flex-col h-full">
        <h3 className="font-heading text-xl text-secondary mb-4">{t('gameActions')}</h3>
        
        {/* Cheat Menu - Only visible for players named "seif" */}
        <CheatMenu />
        
        {/* Make Accusation Form */}
        <div className="bg-background rounded-md p-4 mb-4">
          <h4 className="font-accent text-foreground mb-3">{t('makeAccusation')}</h4>
          
          <form onSubmit={handleMakeAccusation} className="flex flex-col gap-3">
            <div>
              <label className="text-secondary text-sm block mb-1">{t('suspect')}</label>
              <select 
                className="w-full bg-card p-2 rounded-md text-foreground border border-primary focus:border-secondary"
                value={suspectValue}
                onChange={(e) => setSuspectValue(e.target.value)}
              >
                <option value="">{t('selectSuspect')}</option>
                <option value="colonel_mustard">{t('suspects.colonel_mustard')}</option>
                <option value="professor_plum">{t('suspects.professor_plum')}</option>
                <option value="reverend_green">{t('suspects.reverend_green')}</option>
                <option value="mrs_peacock">{t('suspects.mrs_peacock')}</option>
                <option value="miss_scarlet">{t('suspects.miss_scarlet')}</option>
                <option value="mrs_white">{t('suspects.mrs_white')}</option>
              </select>
            </div>
            
            <div>
              <label className="text-secondary text-sm block mb-1">{t('room')}</label>
              <select 
                className="w-full bg-card p-2 rounded-md text-foreground border border-primary focus:border-secondary"
                value={roomValue}
                onChange={(e) => setRoomValue(e.target.value)}
              >
                <option value="">{t('selectRoom')}</option>
                <option value="study">{t('rooms.study')}</option>
                <option value="hall">{t('rooms.hall')}</option>
                <option value="lounge">{t('rooms.lounge')}</option>
                <option value="library">{t('rooms.library')}</option>
                <option value="billiard_room">{t('rooms.billiard_room')}</option>
                <option value="dining_room">{t('rooms.dining_room')}</option>
                <option value="conservatory">{t('rooms.conservatory')}</option>
                <option value="kitchen">{t('rooms.kitchen')}</option>
              </select>
            </div>
            
            <div>
              <label className="text-secondary text-sm block mb-1">{t('weapon')}</label>
              <select 
                className="w-full bg-card p-2 rounded-md text-foreground border border-primary focus:border-secondary"
                value={weaponValue}
                onChange={(e) => setWeaponValue(e.target.value)}
              >
                <option value="">{t('selectWeapon')}</option>
                <option value="knife">{t('weapons.knife')}</option>
                <option value="candlestick">{t('weapons.candlestick')}</option>
                <option value="revolver">{t('weapons.revolver')}</option>
                <option value="rope">{t('weapons.rope')}</option>
                <option value="wrench">{t('weapons.wrench')}</option>
                <option value="lead_pipe">{t('weapons.lead_pipe')}</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              className="bg-accent hover:bg-opacity-90 text-accent-foreground font-bold py-2 px-4 rounded-md transition-colors mt-2"
              disabled={!isMyTurn}
            >
              {t('makeAccusation')}
            </button>
          </form>
        </div>
        
        {/* Other Players */}
        <h4 className="font-accent text-foreground mb-2">{t('otherDetectives')}</h4>
        <div className="flex flex-col gap-2 overflow-y-auto flex-grow">
          {otherPlayers.map(player => (
            <div key={player.id} className="bg-background p-3 rounded-md flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2">
                <span className="material-icons text-primary-foreground text-sm">person</span>
              </div>
              <div className="flex-grow">
                <p className="text-foreground text-sm">{player.name}</p>
              </div>
              <div className={player.id === players[currentTurn]?.id ? "text-info" : "text-muted"}>
                <span className="material-icons text-sm">
                  {player.id === players[currentTurn]?.id ? "hourglass_top" : "pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* End Turn Button */}
        <button 
          className="bg-secondary text-secondary-foreground font-bold py-2 px-4 rounded-md transition-colors hover:bg-opacity-90 mt-4"
          onClick={handleEndTurn}
          disabled={!isMyTurn}
        >
          {t('endTurn')}
        </button>
      </div>
      
      {/* Modals */}
      <RevealCardModal />
      <FinalAccusationModal 
        isOpen={showFinalAccusationModal} 
        onClose={() => setShowFinalAccusationModal(false)}
        initialRoom={roomValue}
        onSubmit={(suspect, weapon, room) => {
          makeFinalAccusation({
            suspect: suspect as Suspect,
            weapon: weapon as Weapon,
            room: room as GameRoom
          });
          setShowFinalAccusationModal(false);
        }}
      />
      <GameResultModal />
      
      {/* Chat Section - Added as overlay at the bottom right */}
      <div className="fixed bottom-4 right-4 w-80 h-96 z-10">
        <ChatBox />
      </div>
    </div>
  );
};

export default GamePlayView;
