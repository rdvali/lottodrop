// import { useLiveRegion } from '../hooks/useLiveRegion';

// Hook for using live region announcements
export function useGameAnnouncements() {
  // const { announce } = useLiveRegion('assertive');
  const announce = (message: string) => {
    // Placeholder until useLiveRegion hook is implemented
    console.log('Live region announcement:', message);
  };

  const announceGameStart = (gameType: string) => {
    announce(`${gameType} game started. Good luck!`);
  };

  const announceGameEnd = (gameType: string, won: boolean) => {
    const outcome = won ? 'won' : 'lost';
    announce(`${gameType} game ended. You ${outcome}!`);
  };

  const announceNewGame = (gameType: string) => {
    announce(`New ${gameType} game is starting. Place your bets!`);
  };

  const announceWinnerSelection = (gameType: string) => {
    announce(`${gameType} winner selection in progress. Please wait.`);
  };

  const announceError = (message: string) => {
    announce(`Error: ${message}`);
  };

  return {
    announceGameStart,
    announceGameEnd,
    announceNewGame,
    announceWinnerSelection,
    announceError
  };
}