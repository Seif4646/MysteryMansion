import { useTranslation } from 'react-i18next';

type MansionMapProps = {
  currentRoom: string;
  onRoomClick: (room: string) => void;
};

const MansionMap = ({ currentRoom, onRoomClick }: MansionMapProps) => {
  const { t } = useTranslation();
  
  const rooms = [
    { id: 'study', position: 0 },
    { id: 'hall', position: 1 },
    { id: 'lounge', position: 2 },
    { id: 'library', position: 3 },
    { id: 'center', position: 4 },
    { id: 'dining_room', position: 5 },
    { id: 'billiard_room', position: 6 },
    { id: 'kitchen', position: 7 },
    { id: 'conservatory', position: 8 },
  ];
  
  return (
    <div className="mansion-map h-full">
      {rooms.map(room => (
        <div 
          key={room.id}
          className={`room-tile ${room.id === 'center' ? 'bg-accent' : 'bg-primary bg-opacity-30'} 
                    ${currentRoom === room.id ? 'ring-2 ring-secondary' : ''}
                    rounded-md flex items-center justify-center p-4 text-foreground font-accent`}
          onClick={() => onRoomClick(room.id)}
        >
          {room.id === 'center' && <span className="material-icons mr-1">priority_high</span>}
          {t(`rooms.${room.id}`)}
        </div>
      ))}
    </div>
  );
};

export default MansionMap;
