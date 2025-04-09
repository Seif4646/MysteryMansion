import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { useGame } from '@/lib/gameContext';

const LoginView = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { registerPlayer } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      toast({
        title: t('error'),
        description: t('enterValidName'),
        variant: "destructive"
      });
      return;
    }
    
    if (playerName.length < 2 || playerName.length > 20) {
      toast({
        title: t('error'),
        description: t('nameLengthError'),
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await registerPlayer(playerName);
    } catch (error) {
      console.error("Failed to register:", error);
      toast({
        title: t('error'),
        description: t('connectionError'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-4">
      <div className="w-full bg-card p-8 rounded-lg shadow-lg text-center">
        <h2 className="font-heading text-3xl text-secondary mb-6">{t('welcomeMessage')}</h2>
        <p className="mb-6 text-card-foreground">{t('enterNamePrompt')}</p>
        
        <form onSubmit={handleLogin} className="flex flex-col">
          <input 
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder={t('detectiveNamePlaceholder')}
            className="bg-background p-3 rounded-md border border-primary focus:border-secondary text-foreground mb-4"
            required
            disabled={isSubmitting}
          />
          <button 
            type="submit"
            className="bg-primary hover:bg-opacity-90 text-primary-foreground font-bold py-3 px-6 rounded-md transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="material-icons animate-spin mr-2">refresh</span>
                {t('connecting')}
              </span>
            ) : (
              t('enterMansion')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
