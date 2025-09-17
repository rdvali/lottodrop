import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// @ts-ignore - react-window export issue
const { FixedSizeList: List } = require('react-window');
import { Card, Badge, Spinner } from '@components/atoms';
import { dateFormatters } from '../../utils/dateUtils';
import type { GameHistory } from '../../types';

interface VirtualizedGameHistoryProps {
  games: GameHistory[];
  loading: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onGameSelect?: (game: GameHistory) => void;
}

interface GameItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    games: GameHistory[];
    onGameSelect?: (game: GameHistory) => void;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    hasNextPage: boolean;
  };
}

const GameItem: React.FC<GameItemProps> = ({ index, style, data }) => {
  const { games, onGameSelect, isLoadingMore, onLoadMore, hasNextPage } = data;
  
  // Get the game data before any conditional returns
  const game = games[index];
  
  // All hooks must be called unconditionally at the top
  useEffect(() => {
    if (index >= games.length - 5 && hasNextPage && !isLoadingMore) {
      onLoadMore();
    }
  }, [index, games.length, hasNextPage, isLoadingMore, onLoadMore]);

  const handleClick = useCallback(() => {
    if (onGameSelect && game) {
      onGameSelect(game);
    }
  }, [game, onGameSelect]);

  // Show loading indicator for items beyond current data
  if (index >= games.length) {
    return (
      <div style={style} className="px-4 py-2">
        <Card className="flex items-center justify-center p-4">
          <Spinner size="sm" />
          <span className="ml-2 text-sm text-gray-400">Loading more games...</span>
        </Card>
      </div>
    );
  }

  if (!game) {
    return null;
  }
  
  const getResultBadge = (result: string) => {
    switch (result) {
      case 'win':
        return <Badge variant="success">Won</Badge>;
      case 'loss':
        return <Badge variant="danger">Lost</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <div style={style} className="px-4 py-2">
      <Card 
        className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">
            {game.roomName}
          </h3>
          <p className="text-sm text-gray-400">
            {dateFormatters.historyTimestamp(game.playedAt)}
          </p>
          {game.position && (
            <p className="text-sm text-primary mt-1">
              Position: #{game.position}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right min-w-0">
            <p className="text-xs text-gray-400">Bet</p>
            <p className="font-semibold">${(game.betAmount || game.entryFee || 0).toFixed(2)}</p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-xs text-gray-400">Pool</p>
            <p className="font-semibold text-info">${(game.prizePool || 0).toFixed(2)}</p>
          </div>
          {(game.wonAmount > 0 || game.prize) && (
            <div className="text-right min-w-0">
              <p className="text-xs text-gray-400">Won</p>
              <p className="font-semibold text-success">
                ${(game.wonAmount || game.prize || 0).toFixed(2)}
              </p>
            </div>
          )}
          {getResultBadge(game.result)}
        </div>
      </Card>
    </div>
  );
};

export const VirtualizedGameHistory: React.FC<VirtualizedGameHistoryProps> = ({
  games,
  loading,
  hasNextPage,
  onLoadMore,
  onGameSelect,
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<any>(null);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNextPage, onLoadMore]);

  // Calculate total items including loading placeholders
  const totalItems = useMemo(() => {
    return hasNextPage ? games.length + 3 : games.length;
  }, [games.length, hasNextPage]);

  const itemData = useMemo(() => ({
    games,
    onGameSelect,
    isLoadingMore,
    onLoadMore: handleLoadMore,
    hasNextPage,
  }), [games, onGameSelect, isLoadingMore, handleLoadMore, hasNextPage]);

  // Handle initial loading
  if (loading && games.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="xl" />
      </div>
    );
  }

  // Handle empty state
  if (!loading && games.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-400">No games found with current filters</p>
      </Card>
    );
  }

  return (
    <div className="w-full h-96 border border-gray-200 dark:border-gray-700 rounded-lg">
      <List
        ref={listRef}
        height={384} // 96 * 4 = 384px
        itemCount={totalItems}
        itemSize={120} // Height of each game item
        itemData={itemData}
        overscanCount={5} // Render 5 extra items outside viewport
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
      >
        {GameItem}
      </List>
    </div>
  );
};

export default VirtualizedGameHistory;