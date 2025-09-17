/**
 * Accessibility Hooks for LottoDrop
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  FocusManager, 
  ScreenReaderUtils, 
  KeyboardNavigation,
  prefersReducedMotion,
  prefersHighContrast
} from '../utils/accessibility';

// Hook for focus management
export function useFocusManagement() {
  return {
    pushFocus: FocusManager.pushFocus,
    popFocus: FocusManager.popFocus,
    trapFocus: FocusManager.trapFocus,
    getFocusableElements: FocusManager.getFocusableElements
  };
}

// Hook for focus trap
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }

    cleanupRef.current = FocusManager.trapFocus(containerRef.current);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isActive]);

  return containerRef;
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderUtils.announce(message, priority);
  }, []);

  const describeElement = useCallback((element: HTMLElement, description: string) => {
    ScreenReaderUtils.describeElement(element, description);
  }, []);

  const labelElement = useCallback((element: HTMLElement, label: string) => {
    ScreenReaderUtils.labelElement(element, label);
  }, []);

  return {
    announce,
    describeElement,
    labelElement
  };
}

// Hook for keyboard navigation
export function useKeyboardNavigation() {
  const handleMenuNavigation = useCallback(
    (
      event: KeyboardEvent,
      menuItems: HTMLElement[],
      currentIndex: number,
      onSelect: (index: number) => void
    ) => {
      return KeyboardNavigation.handleMenuNavigation(event, menuItems, currentIndex, onSelect);
    },
    []
  );

  const handleGridNavigation = useCallback(
    (
      event: KeyboardEvent,
      gridItems: HTMLElement[][],
      currentRow: number,
      currentCol: number,
      onSelect: (row: number, col: number) => void
    ) => {
      return KeyboardNavigation.handleGridNavigation(
        event,
        gridItems,
        currentRow,
        currentCol,
        onSelect
      );
    },
    []
  );

  return {
    KEYS: KeyboardNavigation.KEYS,
    handleMenuNavigation,
    handleGridNavigation
  };
}

// Hook for accessibility preferences
export function useAccessibilityPreferences() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const updateReducedMotion = () => setReducedMotion(prefersReducedMotion());
    const updateHighContrast = () => setHighContrast(prefersHighContrast());

    // Set initial values
    updateReducedMotion();
    updateHighContrast();

    // Listen for changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    reducedMotionQuery.addListener(updateReducedMotion);
    highContrastQuery.addListener(updateHighContrast);

    return () => {
      reducedMotionQuery.removeListener(updateReducedMotion);
      highContrastQuery.removeListener(updateHighContrast);
    };
  }, []);

  return {
    reducedMotion,
    highContrast
  };
}

// Hook for managing ARIA attributes
export function useAriaAttributes(initialAttributes: Record<string, string | boolean | undefined> = {}) {
  const [attributes, setAttributes] = useState(initialAttributes);

  const updateAttribute = useCallback((name: string, value: string | boolean | undefined) => {
    setAttributes(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const removeAttribute = useCallback((name: string) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[name];
      return newAttributes;
    });
  }, []);

  const toggleAttribute = useCallback((name: string, trueValue: string = 'true', falseValue: string = 'false') => {
    setAttributes(prev => ({
      ...prev,
      [name]: prev[name] === trueValue ? falseValue : trueValue
    }));
  }, []);

  return {
    attributes,
    updateAttribute,
    removeAttribute,
    toggleAttribute
  };
}

// Hook for live regions
export function useLiveRegion(priority: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = useState('');
  const regionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((text: string) => {
    setMessage(text);
    
    // Clear message after announcement to allow repeat announcements
    setTimeout(() => {
      setMessage('');
    }, 100);
  }, []);

  return {
    regionRef,
    announce,
    liveRegionProps: {
      'aria-live': priority,
      'aria-atomic': true,
      className: 'sr-only',
      children: message
    }
  };
}

// Hook for focus visible management
export function useFocusVisible() {
  const [focusVisible, setFocusVisible] = useState(false);
  const [usingKeyboard, setUsingKeyboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        setUsingKeyboard(true);
      }
    };

    const handleMouseDown = () => {
      setUsingKeyboard(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleFocus = useCallback(() => {
    setFocusVisible(usingKeyboard);
  }, [usingKeyboard]);

  const handleBlur = useCallback(() => {
    setFocusVisible(false);
  }, []);

  return {
    focusVisible,
    focusProps: {
      onFocus: handleFocus,
      onBlur: handleBlur,
      className: focusVisible ? 'focus-visible' : undefined
    }
  };
}

// Hook for roving tabindex
export function useRovingTabindex<T extends HTMLElement>(
  items: T[],
  activeIndex: number = 0,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentIndex: number, onIndexChange: (index: number) => void) => {
      const { ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, HOME, END } = KeyboardNavigation.KEYS;
      
      let newIndex = currentIndex;

      switch (event.key) {
        case orientation === 'horizontal' ? ARROW_LEFT : ARROW_UP:
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;

        case orientation === 'horizontal' ? ARROW_RIGHT : ARROW_DOWN:
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;

        case HOME:
          event.preventDefault();
          newIndex = 0;
          break;

        case END:
          event.preventDefault();
          newIndex = items.length - 1;
          break;

        default:
          return;
      }

      onIndexChange(newIndex);
      items[newIndex]?.focus();
    },
    [items, orientation]
  );

  const getTabIndex = useCallback(
    (index: number) => (index === activeIndex ? 0 : -1),
    [activeIndex]
  );

  return {
    handleKeyDown,
    getTabIndex
  };
}

// Hook for skip navigation
export function useSkipNavigation() {
  useEffect(() => {
    const skipLinks = document.querySelectorAll('.skip-link');
    
    skipLinks.forEach(link => {
      const handleClick = (e: Event) => {
        e.preventDefault();
        const href = (link as HTMLAnchorElement).getAttribute('href');
        if (href) {
          const target = document.querySelector(href);
          if (target) {
            (target as HTMLElement).focus();
            target.scrollIntoView();
          }
        }
      };

      link.addEventListener('click', handleClick);
      
      return () => {
        link.removeEventListener('click', handleClick);
      };
    });
  }, []);
}