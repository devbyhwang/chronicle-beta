export interface MessageItemProps {
  author: string;
  text: string;
  ts?: string | number;
  isMe?: boolean;
}

export default function MessageItem({ author, text, ts, isMe = false }: MessageItemProps) {
  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Generate consistent avatar color based on author name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 
      'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`flex items-end gap-2 mb-4 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Profile Avatar */}
      <div className={`w-8 h-8 rounded-full ${getAvatarColor(author)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
        {getInitials(author)}
      </div>
      
      {/* Message Container */}
      <div className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} max-w-[75%]`}>
        {/* Author Name */}
        <div className={`text-xs text-gray-500 mb-1 px-1 ${isMe ? 'text-left' : 'text-right'}`}>
          {author}
        </div>
        
        {/* Speech Bubble */}
        <div className={`relative group`}>
          <div className={`px-4 py-2 rounded-2xl shadow-sm ${
            isMe 
              ? 'bg-blue-500 text-white rounded-bl-sm' 
              : 'bg-white text-gray-800 rounded-br-sm border border-gray-200'
          }`}>
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {text}
            </div>
          </div>
          
          {/* Tail */}
          <div className={`absolute bottom-0 w-0 h-0 ${
            isMe 
              ? 'left-0 -translate-x-full border-r-[8px] border-r-blue-500 border-t-[8px] border-t-transparent' 
              : 'right-0 translate-x-full border-l-[8px] border-l-white border-t-[8px] border-t-transparent'
          }`} />
          
          {/* Tail border for other messages */}
          {!isMe && (
            <div className={`absolute bottom-0 w-0 h-0 right-0 translate-x-full border-l-[9px] border-l-gray-200 border-t-[9px] border-t-transparent`} />
          )}
        </div>
        
        {/* Timestamp */}
        {ts && (
          <div className={`text-xs text-gray-400 mt-1 px-1 ${isMe ? 'text-left' : 'text-right'}`}>
            {formatTime(ts)}
          </div>
        )}
      </div>
    </div>
  );
}

