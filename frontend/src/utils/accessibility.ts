/**
 * Accessibility Utilities for LottoDrop
 * WCAG 2.1 AA compliant accessibility helpers
 */

// ARIA roles and properties
export const ARIA_ROLES = {
  // Landmark roles
  banner: 'banner',
  navigation: 'navigation',
  main: 'main',
  complementary: 'complementary',
  contentinfo: 'contentinfo',
  form: 'form',
  search: 'search',
  region: 'region',
  
  // Widget roles
  button: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  textbox: 'textbox',
  combobox: 'combobox',
  listbox: 'listbox',
  option: 'option',
  tab: 'tab',
  tabpanel: 'tabpanel',
  tablist: 'tablist',
  dialog: 'dialog',
  alertdialog: 'alertdialog',
  tooltip: 'tooltip',
  menu: 'menu',
  menuitem: 'menuitem',
  menubar: 'menubar',
  
  // Live region roles
  alert: 'alert',
  status: 'status',
  log: 'log',
  marquee: 'marquee',
  timer: 'timer',
  
  // Gaming-specific roles
  application: 'application',
  img: 'img',
  progressbar: 'progressbar'
} as const;

export type AriaRole = typeof ARIA_ROLES[keyof typeof ARIA_ROLES];

// ARIA states and properties
export const ARIA_STATES = {
  expanded: 'aria-expanded',
  selected: 'aria-selected',
  checked: 'aria-checked',
  disabled: 'aria-disabled',
  hidden: 'aria-hidden',
  pressed: 'aria-pressed',
  current: 'aria-current',
  invalid: 'aria-invalid',
  required: 'aria-required',
  readonly: 'aria-readonly'
} as const;

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  static pushFocus(element: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  static popFocus(): void {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  static getNextFocusableElement(current: HTMLElement, container: HTMLElement): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(current);
    return focusableElements[currentIndex + 1] || null;
  }

  static getPreviousFocusableElement(current: HTMLElement, container: HTMLElement): HTMLElement | null {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(current);
    return focusableElements[currentIndex - 1] || null;
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Alias for compatibility with WinnerReveal component
  static announceToScreenReader = ScreenReaderUtils.announce;

  static describeElement(element: HTMLElement, description: string): void {
    const id = element.id || `described-${Date.now()}`;
    element.id = id;

    const descriptionElement = document.createElement('div');
    descriptionElement.id = `${id}-description`;
    descriptionElement.className = 'sr-only';
    descriptionElement.textContent = description;

    element.setAttribute('aria-describedby', descriptionElement.id);
    document.body.appendChild(descriptionElement);
  }

  static labelElement(element: HTMLElement, label: string): void {
    const id = element.id || `labeled-${Date.now()}`;
    element.id = id;

    const labelElement = document.createElement('div');
    labelElement.id = `${id}-label`;
    labelElement.className = 'sr-only';
    labelElement.textContent = label;

    element.setAttribute('aria-labelledby', labelElement.id);
    document.body.appendChild(labelElement);
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  static readonly KEYS = {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
  } as const;

  static handleMenuNavigation(
    event: KeyboardEvent,
    menuItems: HTMLElement[],
    currentIndex: number,
    onSelect: (index: number) => void
  ): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case this.KEYS.ARROW_DOWN:
        event.preventDefault();
        newIndex = (currentIndex + 1) % menuItems.length;
        break;

      case this.KEYS.ARROW_UP:
        event.preventDefault();
        newIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
        break;

      case this.KEYS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;

      case this.KEYS.END:
        event.preventDefault();
        newIndex = menuItems.length - 1;
        break;

      case this.KEYS.ENTER:
      case this.KEYS.SPACE:
        event.preventDefault();
        onSelect(currentIndex);
        return currentIndex;

      case this.KEYS.ESCAPE:
        event.preventDefault();
        // Handle escape logic in parent component
        return -1;
    }

    if (newIndex !== currentIndex) {
      menuItems[newIndex]?.focus();
    }

    return newIndex;
  }

  static handleGridNavigation(
    event: KeyboardEvent,
    gridItems: HTMLElement[][],
    currentRow: number,
    currentCol: number,
    onSelect: (row: number, col: number) => void
  ): { row: number; col: number } {
    let newRow = currentRow;
    let newCol = currentCol;

    switch (event.key) {
      case this.KEYS.ARROW_DOWN:
        event.preventDefault();
        newRow = Math.min(currentRow + 1, gridItems.length - 1);
        break;

      case this.KEYS.ARROW_UP:
        event.preventDefault();
        newRow = Math.max(currentRow - 1, 0);
        break;

      case this.KEYS.ARROW_RIGHT:
        event.preventDefault();
        if (currentCol < gridItems[currentRow].length - 1) {
          newCol = currentCol + 1;
        } else if (currentRow < gridItems.length - 1) {
          newRow = currentRow + 1;
          newCol = 0;
        }
        break;

      case this.KEYS.ARROW_LEFT:
        event.preventDefault();
        if (currentCol > 0) {
          newCol = currentCol - 1;
        } else if (currentRow > 0) {
          newRow = currentRow - 1;
          newCol = gridItems[newRow].length - 1;
        }
        break;

      case this.KEYS.HOME:
        event.preventDefault();
        newRow = 0;
        newCol = 0;
        break;

      case this.KEYS.END:
        event.preventDefault();
        newRow = gridItems.length - 1;
        newCol = gridItems[newRow].length - 1;
        break;

      case this.KEYS.ENTER:
      case this.KEYS.SPACE:
        event.preventDefault();
        onSelect(currentRow, currentCol);
        return { row: currentRow, col: currentCol };
    }

    if (newRow !== currentRow || newCol !== currentCol) {
      gridItems[newRow]?.[newCol]?.focus();
    }

    return { row: newRow, col: newCol };
  }
}

// Color contrast utilities
export class ColorContrastUtils {
  static calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  static isWCAGCompliant(
    color1: string, 
    color2: string, 
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean {
    const ratio = this.calculateContrastRatio(color1, color2);
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    }
    
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private static getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const sRGB = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }
}

// Gaming accessibility utilities
export class GamingAccessibilityUtils {
  // Announce game events for screen readers
  static announceGameEvent(
    event: 'game_start' | 'game_end' | 'player_win' | 'player_lose' | 'bet_placed' | 'jackpot',
    details?: string
  ): void {
    const messages = {
      game_start: 'Game started',
      game_end: 'Game ended',
      player_win: 'Congratulations! You won',
      player_lose: 'Better luck next time',
      bet_placed: 'Bet placed successfully',
      jackpot: 'Jackpot! Congratulations on the big win!'
    };

    const message = details ? `${messages[event]}. ${details}` : messages[event];
    ScreenReaderUtils.announce(message, event === 'jackpot' ? 'assertive' : 'polite');
  }

  // Provide game state descriptions
  static describeGameState(
    balance: number,
    betAmount: number,
    gameStatus: 'waiting' | 'playing' | 'ended'
  ): string {
    const balanceText = `Current balance: $${balance.toFixed(2)}`;
    const betText = `Current bet: $${betAmount.toFixed(2)}`;
    const statusText = `Game status: ${gameStatus}`;
    
    return `${balanceText}. ${betText}. ${statusText}`;
  }

  // Provide timer announcements
  static announceTimer(secondsRemaining: number): void {
    if (secondsRemaining === 60 || secondsRemaining === 30 || secondsRemaining <= 10) {
      const message = secondsRemaining === 1 
        ? '1 second remaining'
        : `${secondsRemaining} seconds remaining`;
      
      ScreenReaderUtils.announce(message, 'assertive');
    }
  }
}

// Skip navigation utilities
export function createSkipLinks(): HTMLElement {
  const skipNav = document.createElement('div');
  skipNav.className = 'skip-navigation';
  skipNav.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#navigation" class="skip-link">Skip to navigation</a>
    <a href="#footer" class="skip-link">Skip to footer</a>
  `;

  return skipNav;
}

// Reduced motion detection
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// High contrast detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Standalone function export for convenience (WinnerReveal compatibility)
export const announceToScreenReader = ScreenReaderUtils.announce;

// Format currency for screen readers
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
}