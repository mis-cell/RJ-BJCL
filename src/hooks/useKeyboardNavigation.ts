import { useEffect, RefObject } from 'react';

/**
 * Enables intuitive keyboard-driven form navigation.
 * Hitting "Enter" key will focus on the next visible input/select/button.
 * If the user hits "Enter" on the last element or save button, it saves the form.
 */
export function useKeyboardNavigation(
  containerRef: RefObject<HTMLElement | null>,
  onSave?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore when working inside interactive textareas (which require normal Enter for newlines)
      if (target.tagName === 'TEXTAREA') return;

      // Only focus navigate on form inputs, dropdowns, and button controls
      const isFormControl = 
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'BUTTON';

      if (!isFormControl) return;

      // We want to avoid submitting standard forms unexpectedly
      e.preventDefault();

      const isDropdown = 
        target.tagName === 'SELECT' || 
        (target.tagName === 'INPUT' && (target as HTMLInputElement).getAttribute('list') !== null);

      if (isDropdown && target.dataset.pickerOpen !== 'true') {
        target.dataset.pickerOpen = 'true';
        try {
          if (typeof (target as any).showPicker === 'function') {
            (target as any).showPicker();
          }
        } catch (err) {
          console.warn('showPicker failed', err);
        }

        const resetPicker = () => {
          target.dataset.pickerOpen = 'false';
          target.removeEventListener('blur', resetPicker);
        };
        target.addEventListener('blur', resetPicker);
        return;
      }

      if (isDropdown) {
        target.dataset.pickerOpen = 'false';
      }

      const container = containerRef.current || document.body;
      
      // Query all focusable entries that are currently visible and enabled
      const focusableSelector = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled])';
      const allElements = Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];
      
      // Filter elements that are visible (width & height > 0) to avoid focusing invisible mock things
      const elements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0;
      });

      if (elements.length === 0) return;

      const currentIndex = elements.indexOf(target);
      if (currentIndex === -1) return;

      // Determine next focus target
      const nextIndex = currentIndex + 1;

      if (nextIndex >= elements.length) {
        // Hitting Enter on the final field triggers the save callback if provided
        if (onSave) {
          onSave();
        }
        return;
      }

      const nextElement = elements[nextIndex];
      nextElement.focus();

      // Automatically highlight existing text inside text fields to allow immediate over-typing
      if (nextElement instanceof HTMLInputElement && (nextElement.type === 'text' || nextElement.type === 'number')) {
        nextElement.select?.();
      }

      // If next element is a standard select or input with datalist, auto-open its picker
      if (nextElement instanceof HTMLElement) {
        const isNextDropdown = 
          nextElement.tagName === 'SELECT' || 
          (nextElement.tagName === 'INPUT' && (nextElement as HTMLInputElement).getAttribute('list') !== null);

        if (isNextDropdown) {
          nextElement.dataset.pickerOpen = 'true';
          try {
            if (typeof (nextElement as any).showPicker === 'function') {
              (nextElement as any).showPicker();
            }
          } catch (err) {
            console.warn('showPicker failed on nextElement', err);
          }

          const resetNextPicker = () => {
            nextElement.dataset.pickerOpen = 'false';
            nextElement.removeEventListener('blur', resetNextPicker);
          };
          nextElement.addEventListener('blur', resetNextPicker);
        }
      }
    };

    const element = containerRef.current || document.body;
    element.addEventListener('keydown', handleKeyDown as EventListener);
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [containerRef, onSave]);
}
