import { EventEmitter } from 'events';

interface QueueItem {
  roomId: string;
  timestamp: number;
  retryCount: number;
}

class WinnerProcessingQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processingRooms: Set<string> = new Set(); // Track multiple rooms being processed
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private maxConcurrentProcessing: number = 10; // Allow up to 10 rooms to process simultaneously

  async add(roomId: string): Promise<void> {
    console.log(`[Queue] Adding room ${roomId} to winner processing queue`);
    
    // Check if room is already in queue or being processed
    if (this.processingRooms.has(roomId)) {
      console.log(`[Queue] Room ${roomId} is already being processed, skipping`);
      return;
    }
    
    const existingItem = this.queue.find(item => item.roomId === roomId);
    if (existingItem) {
      console.log(`[Queue] Room ${roomId} is already in queue, skipping`);
      return;
    }
    
    this.queue.push({
      roomId,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    console.log(`[Queue] Queue now has ${this.queue.length} items, processing ${this.processingRooms.size} rooms`);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    // Check if we can process more rooms concurrently
    if (this.processingRooms.size >= this.maxConcurrentProcessing || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    
    if (!item) {
      return;
    }

    // Check again if this room is already being processed (race condition prevention)
    if (this.processingRooms.has(item.roomId)) {
      console.log(`[Queue] Room ${item.roomId} is already being processed, skipping duplicate`);
      this.processNext(); // Try next item
      return;
    }

    // Mark this room as being processed
    this.processingRooms.add(item.roomId);
    console.log(`[Queue] Processing winner for room ${item.roomId} (attempt ${item.retryCount + 1}/${this.maxRetries + 1})`);
    console.log(`[Queue] Currently processing ${this.processingRooms.size} rooms concurrently`);
    
    // Process this room asynchronously (don't await)
    this.processRoom(item);
    
    // Immediately check if we can process more rooms
    if (this.queue.length > 0) {
      this.processNext();
    }
  }

  private async processRoom(item: QueueItem): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { processRoundWinner } = await import('../controllers/roomController');
      
      const result = await processRoundWinner(item.roomId);
      
      if (result) {
        console.log(`[Queue] Successfully processed winner for room ${item.roomId}`);
        this.emit('winner-processed', { roomId: item.roomId, result });
      } else {
        console.log(`[Queue] No winner to process for room ${item.roomId} (round may already be completed)`);
      }
    } catch (error) {
      console.error(`[Queue] Error processing winner for room ${item.roomId}:`, error);
      
      // Retry if not exceeded max retries
      if (item.retryCount < this.maxRetries) {
        item.retryCount++;
        console.log(`[Queue] Retrying room ${item.roomId} in ${this.retryDelay}ms (attempt ${item.retryCount}/${this.maxRetries})`);
        
        // Remove from processing set temporarily for retry
        this.processingRooms.delete(item.roomId);
        
        // Add back to queue for retry after delay
        setTimeout(() => {
          this.queue.push(item);
          this.processNext();
        }, this.retryDelay);
        return; // Exit early, don't remove from processingRooms again
      } else {
        console.error(`[Queue] Max retries exceeded for room ${item.roomId}`);
        this.emit('processing-failed', { roomId: item.roomId, error });
      }
    } finally {
      // Remove from processing set
      this.processingRooms.delete(item.roomId);
      console.log(`[Queue] Finished processing room ${item.roomId}, ${this.processingRooms.size} rooms still processing`);
      
      // Check if there are more items to process
      if (this.queue.length > 0) {
        setTimeout(() => {
          this.processNext();
        }, 100);
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processingRooms.size > 0;
  }

  getCurrentProcessingRooms(): string[] {
    return Array.from(this.processingRooms);
  }

  isRoomProcessing(roomId: string): boolean {
    return this.processingRooms.has(roomId);
  }

  clearQueue(): void {
    this.queue = [];
    console.log('[Queue] Queue cleared');
  }
}

// Export singleton instance
export const winnerProcessingQueue = new WinnerProcessingQueue();