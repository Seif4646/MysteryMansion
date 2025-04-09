import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGame } from '@/lib/gameContext';
import { sendMessage } from '@/lib/websocket';
import { useTranslation } from 'react-i18next';

type CheatSolution = {
  suspect: string;
  weapon: string;
  room: string;
};

const CheatMenu: React.FC = () => {
  const { t } = useTranslation();
  const { currentPlayer } = useGame();
  const [solution, setSolution] = useState<CheatSolution | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Check if user is allowed to see cheat menu (name must be "seif")
  useEffect(() => {
    if (currentPlayer && currentPlayer.name.toLowerCase() === 'seif') {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setSolution(null);
    }
  }, [currentPlayer]);

  // Listen for solution reveal events
  useEffect(() => {
    const handleSolutionRevealed = (event: CustomEvent) => {
      if (event.detail?.type === 'solution_revealed') {
        setSolution(event.detail.payload.solution);
      }
    };

    window.addEventListener('websocket-message' as any, handleSolutionRevealed);

    return () => {
      window.removeEventListener('websocket-message' as any, handleSolutionRevealed);
    };
  }, []);

  const handleGetSolution = () => {
    sendMessage('get_solution');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950 my-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-yellow-800 dark:text-yellow-300 flex items-center">
          <span className="mr-2">🔍</span> {t('cheat.title')}
          <Badge variant="outline" className="ml-auto bg-yellow-200 dark:bg-yellow-800">
            {t('cheat.secret')}
          </Badge>
        </CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-400">
          {t('cheat.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {solution ? (
          <Alert className="bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700">
            <AlertTitle className="text-yellow-800 dark:text-yellow-300">{t('cheat.solution_title')}</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-400 mt-2 space-y-2">
              <div className="flex items-center">
                <span className="font-bold mr-2">{t('game.suspect')}:</span> 
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200">
                  {t(`suspects.${solution.suspect}`)}
                </Badge>
              </div>
              <div className="flex items-center">
                <span className="font-bold mr-2">{t('game.weapon')}:</span> 
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200">
                  {t(`weapons.${solution.weapon}`)}
                </Badge>
              </div>
              <div className="flex items-center">
                <span className="font-bold mr-2">{t('game.room')}:</span> 
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200">
                  {t(`rooms.${solution.room}`)}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Button 
            onClick={handleGetSolution}
            className="w-full bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
          >
            {t('cheat.reveal_solution')}
          </Button>
        )}
        <p className="mt-4 text-xs text-yellow-600 dark:text-yellow-500 italic">
          {t('cheat.disclaimer')}
        </p>
      </CardContent>
    </Card>
  );
};

export default CheatMenu;