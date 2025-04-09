import { useEffect } from 'react';
import { useGame } from '@/lib/gameContext';
import Header from '@/components/Header';
import LoginView from '@/components/LoginView';
import WaitingRoomView from '@/components/WaitingRoomView';
import GamePlayView from '@/components/GamePlayView';

const Home = () => {
  const { gameView } = useGame();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-4">
        {gameView === 'login' && <LoginView />}
        {gameView === 'waitingRoom' && <WaitingRoomView />}
        {gameView === 'gameplay' && <GamePlayView />}
      </main>
      
      {/* Footer */}
      <footer className="bg-primary py-2 px-4 text-foreground text-sm text-center">
        <p>Mystery Mansion &copy; {new Date().getFullYear()} - A multiplayer mystery board game</p>
      </footer>
    </div>
  );
};

export default Home;
