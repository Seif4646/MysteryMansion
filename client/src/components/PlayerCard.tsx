import { useTranslation } from 'react-i18next';
import { type Player } from '@/lib/gameTypes';

type PlayerCardProps = {
  player: Player;
  isCurrentPlayer: boolean;
};

const PlayerCard = ({ player, isCurrentPlayer }: PlayerCardProps) => {
  const { t } = useTranslation();
  const isReady = player.ready;
  
  return (
    <div className="bg-background p-4 rounded-md flex items-center">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3">
        <span className="material-icons text-primary-foreground">person</span>
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <p className="text-foreground font-medium">
            {player.name}
            {player.isHost && (
              <span className="ml-2 text-secondary text-xs">{t('host')}</span>
            )}
            {isCurrentPlayer && (
              <span className="ml-2 text-info text-xs">{t('you')}</span>
            )}
          </p>
          
          {/* Points badge */}
          <div className="flex items-center bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
            <span className="material-icons text-xs mr-1">stars</span>
            <span>{player.points || 0} {t('points')}</span>
          </div>
        </div>
        <p className="text-secondary text-sm">{isReady ? t('ready') : t('waiting')}</p>
      </div>
      <div className={isReady ? "text-success" : "text-muted"}>
        <span className="material-icons">{isReady ? "check_circle" : "hourglass_empty"}</span>
      </div>
    </div>
  );
};

export default PlayerCard;
