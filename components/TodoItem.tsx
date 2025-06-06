import React, { useState, useRef, useEffect } from 'react';
import { Todo } from '../types';
import TrashIcon from './icons/TrashIcon';
import StarIcon from './icons/StarIcon';
import PencilIcon from './icons/PencilIcon';
import CheckIcon from './icons/CheckIcon';
import XMarkIcon from './icons/XMarkIcon';
import RepeatIcon from './icons/RepeatIcon';

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: string) => void;
  onDeleteTodo: (id: string) => void; 
  onToggleIsForToday: (id: string) => void;
  onEditTodo: (id: string, newText: string) => void;
  onToggleIsRecurring: (id: string) => void;
  canCompleteTasks: boolean;
  isGroupedCompleted?: boolean;
  groupCount?: number;
  onTagClick?: (tag: string) => void;
  isDraggable?: boolean; // For drag and drop
  onReorderItem?: (draggedId: string, targetItemId: string) => void; // For drag and drop
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggleComplete,
  onDeleteTodo,
  onToggleIsForToday,
  onEditTodo,
  onToggleIsRecurring,
  canCompleteTasks,
  isGroupedCompleted = false,
  groupCount = 1,
  onTagClick,
  isDraggable = false,
  onReorderItem,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [isDragOver, setIsDragOver] = useState(false); // For D&D visual feedback
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLLIElement>(null); // Ref for the li element

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (!isEditing) {
        setEditText(todo.text);
    }
  }, [todo.text, isEditing]);


  const handleEdit = () => {
    if (isGroupedCompleted) return;
    setEditText(todo.text);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== todo.text) {
      onEditTodo(todo.id, trimmedText);
    }
     if (!trimmedText) { 
        setEditText(todo.text);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  const handleCheckboxChange = () => {
    if (isEditing) return; 
    
    if (isGroupedCompleted) {
      onToggleComplete(todo.id); 
      return;
    }

    if (canCompleteTasks) {
      onToggleComplete(todo.id);
    }
  };

  const handleDelete = () => {
    onDeleteTodo(todo.id); 
  };

  const isVisuallyCompleted = isGroupedCompleted || (todo.completed && !todo.isRecurring);
  
  let checkboxTitle = "";
  if (isGroupedCompleted) {
    checkboxTitle = `Mark one '${todo.text}' as pending`;
  } else if (!canCompleteTasks) {
    checkboxTitle = "Move to Today's Focus to complete";
  } else if (todo.isRecurring) {
    checkboxTitle = "Complete and reset for next cycle";
  } else {
    checkboxTitle = "Mark as complete";
  }
  
  const displayItemTextBase = isGroupedCompleted && groupCount > 0 
    ? `${todo.text} (x${groupCount})` 
    : todo.text;

  let deleteButtonTitle = `Delete task: ${todo.text}`;
  if (isGroupedCompleted) {
    if (groupCount > 1) {
      deleteButtonTitle = `Remove one completed '${todo.text}' (count to ${groupCount - 1})`;
    } else {
      deleteButtonTitle = `Remove last completed '${todo.text}'`;
    }
  }

  const renderTextWithTags = (textToRender: string) => {
    if (!onTagClick || !todo.tags || todo.tags.length === 0) {
      return <>{textToRender}</>;
    }
    const tagRegex = /(#([a-zA-Z0-9_]+))/g;
    const parts = textToRender.split(tagRegex);

    return parts.map((part, index) => {
      if (part.match(tagRegex)) { 
        const tagName = part.substring(1); 
        if (todo.tags?.includes(tagName)) { 
          return (
            <span
              key={`${todo.id}-tag-${tagName}-${index}`}
              className="bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded text-sm cursor-pointer hover:bg-indigo-200 transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation(); 
                onTagClick(tagName);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onTagClick(tagName);}}}
              title={`Filter by tag: #${tagName}`}
            >
              {part}
            </span>
          );
        }
      }
      if (index % 3 === 0) { 
         return <span key={`${todo.id}-text-${index}`}>{part}</span>;
      }
      return null; 
    }).filter(Boolean);
  };

  // --- Drag and Drop Handlers ---
  const canBeDragged = isDraggable && !isEditing && !isGroupedCompleted;

  const handleDragStartItem = (e: React.DragEvent<HTMLLIElement>) => {
    if (!canBeDragged) return;
    e.dataTransfer.setData('text/plain', todo.id);
    e.dataTransfer.effectAllowed = 'move';
    if (itemRef.current) {
      itemRef.current.style.opacity = '0.5'; // Visual feedback for dragging item
    }
  };

  const handleDragOverItem = (e: React.DragEvent<HTMLLIElement>) => {
    if (!canBeDragged || !onReorderItem) return;
    // Check if dragging over itself
    const draggedId = e.dataTransfer.types.includes('text/plain') ? e.dataTransfer.getData('text/plain') : null;
    if (draggedId === todo.id) {
        return; // Don't allow dropping on itself / don't show drag over indicator
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeaveItem = (e: React.DragEvent<HTMLLIElement>) => {
    if (!canBeDragged) return;
    // Check if leaving to an internal child element, if so, don't remove dragOver yet
    if (itemRef.current && itemRef.current.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragOver(false);
  };
  
  const handleDropOnItem = (e: React.DragEvent<HTMLLIElement>) => {
    if (!canBeDragged || !onReorderItem) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== todo.id) { // Ensure not dropping on itself
        onReorderItem(draggedId, todo.id);
    }
    setIsDragOver(false);
    if (itemRef.current) { // Reset opacity if it was changed by drag start of another item
      itemRef.current.style.opacity = '1';
    }
  };

  const handleDragEndItem = (e: React.DragEvent<HTMLLIElement>) => {
    if (!canBeDragged) return;
    if (itemRef.current) {
      itemRef.current.style.opacity = '1'; // Reset opacity
    }
    setIsDragOver(false); // Ensure drag over state is cleared
  };


  return (
    <li
      ref={itemRef}
      draggable={canBeDragged}
      onDragStart={handleDragStartItem}
      onDragOver={handleDragOverItem}
      onDragLeave={handleDragLeaveItem}
      onDrop={handleDropOnItem}
      onDragEnd={handleDragEndItem}
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-2 bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 
      ${isVisuallyCompleted && !isEditing ? 'opacity-70' : ''} 
      ${todo.isForToday && !isVisuallyCompleted && !isEditing && !isGroupedCompleted ? 'ring-2 ring-yellow-400' : ''}
      ${canBeDragged ? 'cursor-move' : ''}
      ${isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
      `}
      aria-label={`Task: ${displayItemTextBase}. Status: ${
        isVisuallyCompleted ? 'Completed.' : 'Pending.'
      } ${ (todo.isForToday && !isGroupedCompleted) ? 'Marked for today.' : ''} ${
        (todo.isRecurring && !isGroupedCompleted) ? 'Recurring task.' : ''
      } ${(!canCompleteTasks && !isGroupedCompleted && !todo.completed) ? 'Completion disabled in this list.' : ''}
      ${canBeDragged ? 'Draggable item.' : ''}`}
    >
      {isEditing && !isGroupedCompleted ? (
        <div className="flex flex-col sm:flex-row sm:items-center w-full"> {/* Ensure edit mode also respects flex structure */}
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-grow p-1 border border-indigo-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg w-full mb-2 sm:mb-0 sm:mr-2"
            aria-label={`Edit task text for: ${todo.text}`}
          />
          <div className="flex items-center flex-shrink-0 space-x-1 self-end sm:self-center">
            <button
              onClick={handleSave}
              aria-label="Save task changes"
              className="p-2 text-green-500 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 rounded-full transition-colors duration-150"
              title="Save changes"
            >
              <CheckIcon className="w-6 h-6" />
            </button>
            <button
              onClick={handleCancel}
              aria-label="Cancel editing task"
              className="p-2 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 rounded-full transition-colors duration-150"
              title="Cancel edit"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center flex-grow min-w-0 w-full"> {/* Text and checkbox part */}
            <input
              type="checkbox"
              checked={isVisuallyCompleted}
              onChange={handleCheckboxChange}
              disabled={(!canCompleteTasks && !isGroupedCompleted && !todo.completed) || isEditing}
              aria-labelledby={`todo-text-${todo.id}`}
              className={`form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0 ${
                ((!canCompleteTasks && !isGroupedCompleted && !todo.completed) || isEditing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
              title={checkboxTitle}
            />
            <span
              id={`todo-text-${todo.id}`}
              className={`ml-3 text-lg break-words ${
                isVisuallyCompleted ? 'line-through text-gray-500' : 'text-gray-800'
              }`}
              onDoubleClick={!isEditing && !isGroupedCompleted ? handleEdit : undefined}
            >
              {renderTextWithTags(displayItemTextBase)}
            </span>
          </div>
          
          {/* Buttons part - responsive layout */}
          <div 
             className={`flex items-center flex-shrink-0 space-x-1 
              ${isGroupedCompleted 
                ? 'mt-2 sm:mt-0 sm:ml-auto self-end sm:self-center' // Special layout for grouped completed items
                : 'mt-3 sm:mt-0 sm:ml-2 w-full sm:w-auto justify-end sm:justify-normal self-end sm:self-center' // Default for mobile: full width, buttons right; Desktop: auto width, buttons appear after text
              }`}
          >
            {isGroupedCompleted ? (
                <button
                  onClick={handleDelete} 
                  aria-label={deleteButtonTitle}
                  title={deleteButtonTitle}
                  className="p-2 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 rounded-full transition-colors duration-150"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
            ) : (
              <>
                <button
                  onClick={() => onToggleIsRecurring(todo.id)}
                  aria-label={todo.isRecurring ? `Make task non-recurring: ${todo.text}` : `Make task recurring: ${todo.text}`}
                  title={todo.isRecurring ? "Make non-recurring" : "Make recurring"}
                  className={`p-2 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 rounded-full transition-colors duration-150 ${
                    todo.isRecurring ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  <RepeatIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleEdit}
                  aria-label={`Edit task: ${todo.text}`}
                  title="Edit task"
                  className="p-2 text-gray-400 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50 rounded-full transition-colors duration-150"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onToggleIsForToday(todo.id)}
                  aria-label={todo.isForToday ? `Remove task from today: ${todo.text}` : `Mark task for today: ${todo.text}`}
                  title={todo.isForToday ? "Remove from today's focus" : "Mark for today's focus"}
                  className={`p-2 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 rounded-full transition-colors duration-150 ${
                    todo.isForToday ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                >
                  <StarIcon className="w-6 h-6" filled={!!todo.isForToday} />
                </button>
                <button
                  onClick={handleDelete}
                  aria-label={`Delete task: ${todo.text}`}
                  title="Delete task"
                  className="p-2 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 rounded-full transition-colors duration-150"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
};

export default TodoItem;
