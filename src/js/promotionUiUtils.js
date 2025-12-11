// Shared utilities for promotion-related UI (reordering, drag-and-drop, clear buttons).

/**
 * Set up clear buttons for input fields within a container.
 * Each clear button should have a data-clear attribute pointing to the input field's ID.
 * @param {HTMLElement} container - The container element to search for clear buttons
 */
export function setupClearButtons(container) {
  container.querySelectorAll('.clear-input').forEach((clearBtn) => {
    const fieldId = clearBtn.dataset.clear;
    const input = document.getElementById(fieldId);
    if (!input) return;

    const updateVisibility = () => {
      clearBtn.classList.toggle('visible', input.value.trim().length > 0);
    };

    // Initialize visibility
    updateVisibility();

    // Update on input
    input.addEventListener('input', updateVisibility);

    // Clear button click handler
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.remove('visible');
      input.focus();
      // Trigger input event to update data and preview
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

// Generic helper for moving items in an array by id
export function moveItemInArray(array, itemId, direction, idKey = 'id') {
  const index = array.findIndex((item) => item[idKey] === itemId);
  if (direction === 'up' && index > 0) {
    [array[index - 1], array[index]] = [array[index], array[index - 1]];
    return true;
  }
  if (direction === 'down' && index < array.length - 1) {
    [array[index], array[index + 1]] = [array[index + 1], array[index]];
    return true;
  }
  return false;
}

// Drag-and-drop setup for reordering items in a container
export function setupDragAndDrop(
  container,
  itemsArray,
  renderFunction,
  selector = '.editable-item-row'
) {
  let draggedElement = null;
  let draggedItemId = null;
  let isDragHandleMouseDown = false;

  // Track mousedown on drag handles to know if drag should be allowed
  container.addEventListener('mousedown', (e) => {
    const dragHandle = e.target.closest('.drag-handle');
    isDragHandleMouseDown = !!dragHandle;
  });

  // Reset on mouseup
  container.addEventListener('mouseup', () => {
    isDragHandleMouseDown = false;
  });

  // Use event delegation on the container for drag events
  container.addEventListener('dragstart', (e) => {
    // Find the closest draggable element
    const row = e.target.closest(selector);
    if (!row) return;

    // Only allow dragging if mousedown started on the drag handle
    if (!isDragHandleMouseDown) {
      e.preventDefault();
      return;
    }

    draggedElement = row;
    draggedItemId = parseInt(row.dataset.itemId || row.dataset.entryId, 10);
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', (e) => {
    const row = e.target.closest(selector);
    if (row) {
      row.classList.remove('dragging');
      container
        .querySelectorAll(selector)
        .forEach((r) => r.classList.remove('drag-over'));
    }
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const row = e.target.closest(selector);
    if (row && draggedElement !== row) {
      row.classList.add('drag-over');
    }
  });

  container.addEventListener('dragleave', (e) => {
    const row = e.target.closest(selector);
    if (row) {
      row.classList.remove('drag-over');
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();

    const row = e.target.closest(selector);
    if (!row) return;

    row.classList.remove('drag-over');

    if (draggedElement !== row) {
      const targetItemId = parseInt(
        row.dataset.itemId || row.dataset.entryId,
        10
      );

      const draggedIndex = itemsArray.findIndex(
        (item) => item.id === draggedItemId
      );
      const targetIndex = itemsArray.findIndex(
        (item) => item.id === targetItemId
      );

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = itemsArray.splice(draggedIndex, 1);
        itemsArray.splice(targetIndex, 0, removed);

        renderFunction();
      }
    }
  });
}
