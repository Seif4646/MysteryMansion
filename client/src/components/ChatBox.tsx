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
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Set up WebSocket message handler for chat messages
  useEffect(() => {
    // Add listener for the 'chat_message' event on the window object
    const handleChatMessage = (event: CustomEvent) => {
      if (event.detail?.type === 'chat_message') {
        const message = event.detail.payload;
        setMessages(prevMessages => [...prevMessages, {
          ...message,
          timestamp: new Date(message.timestamp)
        }]);
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
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-lg">{t('chat.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-4 overflow-hidden">
        <ScrollArea className="h-[300px] pr-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              {t('chat.no_messages')}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex flex-col ${message.playerId === currentPlayer?.id ? 'items-end' : ''}`}
                >
                  <div 
                    className={`
                      px-3 py-2 rounded-lg max-w-[80%] break-words
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
      <CardFooter className="p-4 pt-2">
        <form className="flex w-full space-x-2" onSubmit={handleSendMessage}>
          <Input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t('chat.type_message')}
            className="flex-grow"
            maxLength={500}
          />
          <Button type="submit" disabled={!messageText.trim()}>
            {t('chat.send')}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatBox;