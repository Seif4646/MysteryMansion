import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/lib/gameContext';
import { sendMessage } from '@/lib/websocket';

type Message = {
  playerId: number;
  playerName: string;
  text: string;
  timestamp: Date;
};

const ChatBox: React.FC = () => {
  const { t } = useTranslation();
  const { currentPlayer } = useGame();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [minimized, setMinimized] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Set up WebSocket message handler for chat messages
  useEffect(() => {
    // Add listener for the 'chat_message' event on the window object
    const handleChatMessage = (event: CustomEvent) => {
      console.log('Chat event received:', event.detail);
      
      if (event.detail?.type === 'chat_message') {
        const message = event.detail.payload;
        console.log('Adding new chat message to UI:', message);
        
        // Ensure we have all required fields
        if (message && message.playerId && message.text) {
          setMessages(prevMessages => [...prevMessages, {
            playerId: message.playerId,
            playerName: message.playerName || 'Unknown',
            text: message.text,
            timestamp: new Date(message.timestamp || Date.now())
          }]);
        }
      }
    };

    // Add event listener
    window.addEventListener('websocket-message' as any, handleChatMessage);

    // Clean up
    return () => {
      window.removeEventListener('websocket-message' as any, handleChatMessage);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !currentPlayer) return;
    
    const newMessage: Message = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      text: messageText.trim(),
      timestamp: new Date()
    };
    
    // Send message to server
    sendMessage('chat_message', newMessage);
    
    // Clear input field
    setMessageText('');
  };

  // Format timestamp to display just the time (HH:MM)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="flex flex-col h-full shadow-lg border border-primary/30">
      <CardHeader className="p-2 pb-0 cursor-pointer" onClick={() => setMinimized(!minimized)}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <span className="mr-2">💬</span> {t('chat.title')}
          </CardTitle>
          <button 
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(!minimized);
            }}
          >
            <span className="text-xs">{minimized ? '▲' : '▼'}</span>
          </button>
        </div>
      </CardHeader>
      
      {!minimized && (
        <>
          <CardContent className="flex-grow p-3 overflow-hidden">
            <ScrollArea className="h-[250px] pr-2">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  {t('chat.no_messages')}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex flex-col ${message.playerId === currentPlayer?.id ? 'items-end' : ''}`}
                    >
                      <div 
                        className={`
                          px-3 py-2 rounded-lg max-w-[80%] break-words text-sm
                          ${message.playerId === currentPlayer?.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'}
                        `}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-xs">
                            {message.playerId === currentPlayer?.id ? t('chat.you') : message.playerName}
                          </span>
                          <span className="text-xs opacity-70 ml-2">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div>{message.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-2">
            <form className="flex w-full space-x-2" onSubmit={handleSendMessage}>
              <Input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('chat.type_message')}
                className="flex-grow text-sm h-8"
                maxLength={500}
              />
              <Button type="submit" size="sm" disabled={!messageText.trim()}>
                {t('chat.send')}
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default ChatBox;