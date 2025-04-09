import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useEffect } from "react";
import { GameProvider } from "@/lib/gameContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { ThemeProvider } from "@/components/ui/theme-provider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Load theme styles defined in theme.json
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Set base theme variables
    document.documentElement.style.setProperty('--background', '18 18 18');
    document.documentElement.style.setProperty('--foreground', '245 245 245');
    document.documentElement.style.setProperty('--card', '30 30 30');
    document.documentElement.style.setProperty('--card-foreground', '245 245 245');
    document.documentElement.style.setProperty('--popover', '30 30 30');
    document.documentElement.style.setProperty('--popover-foreground', '245 245 245');
    document.documentElement.style.setProperty('--primary', '74 20 140'); // Deep purple
    document.documentElement.style.setProperty('--primary-foreground', '255 255 255');
    document.documentElement.style.setProperty('--secondary', '255 193 7'); // Amber
    document.documentElement.style.setProperty('--secondary-foreground', '18 18 18');
    document.documentElement.style.setProperty('--muted', '38 38 38');
    document.documentElement.style.setProperty('--muted-foreground', '163 163 163');
    document.documentElement.style.setProperty('--accent', '183 28 28'); // Deep red
    document.documentElement.style.setProperty('--accent-foreground', '255 255 255');
    document.documentElement.style.setProperty('--destructive', '244 67 54'); // Red
    document.documentElement.style.setProperty('--destructive-foreground', '255 255 255');
    document.documentElement.style.setProperty('--border', '30 30 30');
    document.documentElement.style.setProperty('--input', '30 30 30');
    document.documentElement.style.setProperty('--ring', '74 20 140');
    document.documentElement.style.setProperty('--radius', '0.5rem');
    
    // Load fonts
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);
    
    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = '';
    document.head.appendChild(link2);
    
    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Playfair+Display:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(link3);
    
    const link4 = document.createElement('link');
    link4.rel = 'stylesheet';
    link4.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link4);
    
    // Set title
    document.title = 'Mystery Mansion';
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: 'Roboto', sans-serif;
      }
      
      h1, h2, h3 {
        font-family: 'Playfair Display', serif;
      }
      
      .font-accent {
        font-family: 'Cinzel', serif;
      }
      
      .game-card {
        transition: transform 0.3s ease;
      }
      
      .game-card:hover {
        transform: translateY(-5px);
      }
      
      .room-tile {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .room-tile:hover {
        filter: brightness(1.2);
        transform: scale(1.05);
      }
      
      .mansion-map {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 8px;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .pulse-animation {
        animation: pulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
      if (link1.parentNode) document.head.removeChild(link1);
      if (link2.parentNode) document.head.removeChild(link2);
      if (link3.parentNode) document.head.removeChild(link3);
      if (link4.parentNode) document.head.removeChild(link4);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="mystery-mansion-theme">
          <GameProvider>
            <div className="flex flex-col min-h-screen bg-background text-foreground">
              <Router />
              <Toaster />
            </div>
          </GameProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

export default App;
