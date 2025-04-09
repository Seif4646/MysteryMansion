// WebSocket connection handling

// Store WebSocket instance globally
export let wsConnection: WebSocket | null = null;

// Types for WebSocket handlers
type WSHandlers = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
};

// Setup WebSocket connection
export function setupWebSocket(handlers: WSHandlers): WebSocket {
  // Determine the correct protocol (ws:// or wss://)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  // Create WebSocket connection
  const ws = new WebSocket(wsUrl);
  
  // Set up event listeners
  ws.addEventListener('open', () => {
    console.log('WebSocket connection established');
    if (handlers.onOpen) handlers.onOpen();
  });
  
  ws.addEventListener('close', () => {
    console.log('WebSocket connection closed');
    if (handlers.onClose) handlers.onClose();
    wsConnection = null; // Clear the reference
  });
  
  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    if (handlers.onError) handlers.onError(error);
  });
  
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      if (handlers.onMessage) handlers.onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Store the connection
  wsConnection = ws;
  
  return ws;
}

// Send a message through the WebSocket connection
export function sendMessage(type: string, payload: any = {}): boolean {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not connected');
    return false;
  }
  
  try {
    wsConnection.send(JSON.stringify({ type, payload }));
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}
