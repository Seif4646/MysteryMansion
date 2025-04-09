import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/lib/gameContext';

export const RevealCardModal = () => {
  const { t } = useTranslation();
  const { revealCardData, closeRevealCard } = useGame();

  // If no reveal data, don't render
  if (!revealCardData) return null;

  const { revealer, cardType, cardValue } = revealCardData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
      <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="font-heading text-2xl text-secondary mb-4 text-center">{t('evidenceRevealed')}</h3>
        
        <div className="bg-primary bg-opacity-40 rounded-lg p-6 border-2 border-secondary mb-6">
          <div className="text-center">
            <p className="text-card-foreground mb-2">{t('playerReveals', { name: revealer })}</p>
            <div className="text-secondary font-accent text-2xl">{t(`${cardType}.${cardValue}`)}</div>
            <p className="text-card-foreground text-sm mt-2">{t(`cardType.${cardType}`)}</p>
          </div>
        </div>
        
        <div className="text-center text-card-foreground mb-4">
          {t('evidenceContradicts')}
        </div>
        
        <div className="flex justify-center">
          <button 
            className="bg-secondary text-secondary-foreground font-bold py-2 px-6 rounded-md transition-colors hover:bg-opacity-90"
            onClick={closeRevealCard}
          >
            {t('noteEvidence')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FinalAccusationModal = ({ 
  isOpen, 
  onClose,
  initialRoom,
  onSubmit
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialRoom?: string;
  onSubmit: (suspect: string, weapon: string, room: string) => void;
}) => {
  const { t } = useTranslation();
  const [suspect, setSuspect] = useState('');
  const [weapon, setWeapon] = useState('');
  const [room, setRoom] = useState(initialRoom || '');

  // Update room if initialRoom changes
  useEffect(() => {
    if (initialRoom) {
      setRoom(initialRoom);
    }
  }, [initialRoom]);

  // If not open, don't render
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (suspect && weapon && room) {
      onSubmit(suspect, weapon, room);
      
      // Reset form
      setSuspect('');
      setWeapon('');
      setRoom('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
      <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className="font-heading text-2xl text-accent mb-4 text-center">{t('finalAccusation')}</h3>
        
        <p className="text-card-foreground mb-6 text-center">{t('finalAccusationWarning')}</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-secondary text-sm block mb-1">{t('murderer')}</label>
            <select 
              className="w-full bg-background p-2 rounded-md text-foreground border border-primary focus:border-secondary"
              value={suspect}
              onChange={(e) => setSuspect(e.target.value)}
              required
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
            <label className="text-secondary text-sm block mb-1">{t('murderLocation')}</label>
            <select 
              className="w-full bg-background p-2 rounded-md text-foreground border border-primary focus:border-secondary"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
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
            <label className="text-secondary text-sm block mb-1">{t('murderWeapon')}</label>
            <select 
              className="w-full bg-background p-2 rounded-md text-foreground border border-primary focus:border-secondary"
              value={weapon}
              onChange={(e) => setWeapon(e.target.value)}
              required
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
          
          <div className="flex gap-4 mt-4">
            <button 
              type="button"
              className="flex-1 bg-background hover:bg-opacity-90 text-foreground font-bold py-2 px-4 rounded-md transition-colors border border-primary"
              onClick={onClose}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-accent hover:bg-opacity-90 text-accent-foreground font-bold py-2 px-4 rounded-md transition-colors"
            >
              {t('solveCase')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GameResultModal = () => {
  const { t } = useTranslation();
  const { gameResult, resetGame } = useGame();

  // If no game result, don't render
  if (!gameResult) return null;

  const { winner, solution, isCorrect } = gameResult;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
      <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full text-center">
        <h3 className={`font-heading text-2xl ${isCorrect ? 'text-success' : 'text-destructive'} mb-4`}>
          {isCorrect ? t('caseSolved') : t('wrongAccusation')}
        </h3>
        
        <div className="bg-primary bg-opacity-30 rounded-lg p-6 mb-6">
          <p className="text-card-foreground mb-4">
            {isCorrect 
              ? t('correctSolutionMessage', { name: winner?.name }) 
              : t('wrongSolutionMessage')}
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-secondary text-sm">{t('murderer')}</p>
              <p className="text-card-foreground font-accent">{t(`suspects.${solution.suspect}`)}</p>
            </div>
            <div>
              <p className="text-secondary text-sm">{t('location')}</p>
              <p className="text-card-foreground font-accent">{t(`rooms.${solution.room}`)}</p>
            </div>
            <div>
              <p className="text-secondary text-sm">{t('weapon')}</p>
              <p className="text-card-foreground font-accent">{t(`weapons.${solution.weapon}`)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <button 
            className="bg-secondary text-secondary-foreground font-bold py-2 px-6 rounded-md transition-colors hover:bg-opacity-90"
            onClick={resetGame}
          >
            {t('returnToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
};
