import React from 'react';
import { Todo } from '../types';
import TodoItem from './TodoItem';

interface GroupedCompletedTodo {
  representativeTodo: Todo;
  instanceIds: string[];
  completionCount: number;
  firstCompletedAt: number; 
}

interface TodoListProps {
  todos: Todo[];
  onToggleComplete: (id: string) => void;
  onDeleteTodo: (id: string) => void; 
  onToggleIsForToday: (id: string) => void;
  onEditTodo: (id: string, newText: string) => void;
  onToggleIsRecurring: (id: string) => void;
  canCompleteTasks: boolean;
  listTitle?: string;
  emptyListMessage: string;
  emptyListImageSeed?: string;
  isTodayFocusList?: boolean;
  onTagClick?: (tag: string) => void;
  onReorderList?: (draggedId: string, targetId: string | null) => void; // For drag and drop
  isDraggableContext?: boolean; // To enable drag and drop for items in this list
}

const TodoList: React.FC<TodoListProps> = ({
  todos,
  onToggleComplete,
  onDeleteTodo, 
  onToggleIsForToday,
  onEditTodo,
  onToggleIsRecurring,
  canCompleteTasks,
  listTitle,
  emptyListMessage,
  emptyListImageSeed = "empty",
  isTodayFocusList = false,
  onTagClick,
  onReorderList,
  isDraggableContext = false,
}) => {

  const handleDragOverList = (e: React.DragEvent<HTMLUListElement>) => {
    if (isDraggableContext && onReorderList) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Optionally, add a class to `e.currentTarget` for visual feedback
    }
  };

  const handleDropOnList = (e: React.DragEvent<HTMLUListElement>) => {
    if (isDraggableContext && onReorderList) {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      // Ensure the drop is not on a child TodoItem, which handles its own drop
      if (draggedId && (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'UL')) {
         onReorderList(draggedId, null); // null targetId means append to this list section
      }
      // Optionally, remove visual feedback class from `e.currentTarget`
    }
  };


  if (todos.length === 0 && !isTodayFocusList) { 
    return (
      <div className="mb-8"> {/* Wrap in mb-8 for consistency like populated list */}
        {listTitle && (
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{listTitle}</h2>
        )}
        <ul 
          onDragOver={handleDragOverList}
          onDrop={handleDropOnList}
          className="min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center" // Style for empty draggable list
          aria-label={listTitle || "Task list"}
        >
            <div className="text-center py-6 sm:py-10">
              <img 
                src={`https://picsum.photos/seed/${emptyListImageSeed}/150/150`} 
                alt="Decorative illustration" 
                className="mx-auto mb-4 rounded-lg shadow-md w-28 h-28 sm:w-32 sm:h-32 object-cover opacity-70" 
              />
              <p className="text-lg text-gray-500">{emptyListMessage}</p>
            </div>
        </ul>
      </div>
    );
  }

  if (isTodayFocusList) {
    const activeTasks = todos.filter(todo => !todo.completed);
    const completedTasks = todos.filter(todo => todo.completed);

    const groupedCompletedMap = new Map<string, GroupedCompletedTodo>();
    completedTasks.forEach(task => {
      const group = groupedCompletedMap.get(task.text);
      if (group) {
        group.instanceIds.push(task.id);
        group.completionCount = group.instanceIds.length;
      } else {
        groupedCompletedMap.set(task.text, {
          representativeTodo: task,
          instanceIds: [task.id],
          completionCount: 1,
          firstCompletedAt: task.createdAt, 
        });
      }
    });

    const sortedGroupedCompletedTasks = Array.from(groupedCompletedMap.values())
      .sort((a, b) => b.firstCompletedAt - a.firstCompletedAt); 

    if (activeTasks.length === 0 && sortedGroupedCompletedTasks.length === 0) {
         return (
          <div className="text-center py-6 sm:py-10">
            <img 
              src={`https://picsum.photos/seed/${emptyListImageSeed}/150/150`} 
              alt="Decorative illustration" 
              className="mx-auto mb-4 rounded-lg shadow-md w-28 h-28 sm:w-32 sm:h-32 object-cover opacity-70" 
            />
            <p className="text-lg text-gray-500">{emptyListMessage}</p>
          </div>
        );
    }

    return (
      <div className="mb-8">
        {listTitle && (
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{listTitle}</h2>
        )}
        {activeTasks.length > 0 && (
          <ul className="space-y-3">
            {activeTasks.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggleComplete={onToggleComplete}
                onDeleteTodo={onDeleteTodo} 
                onToggleIsForToday={onToggleIsForToday}
                onEditTodo={onEditTodo}
                onToggleIsRecurring={onToggleIsRecurring}
                canCompleteTasks={canCompleteTasks}
                onTagClick={onTagClick}
                isDraggable={false} // Not draggable in Today's Focus
              />
            ))}
          </ul>
        )}

        {activeTasks.length > 0 && sortedGroupedCompletedTasks.length > 0 && (
          <div className="my-6">
            <hr className="border-t border-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 my-3 text-center">Completed Today</h3>
          </div>
        )}
        
        {sortedGroupedCompletedTasks.length > 0 && (
           <ul className="space-y-3">
            {sortedGroupedCompletedTasks.map((group) => (
              <TodoItem
                key={group.representativeTodo.id} 
                todo={group.representativeTodo}
                onToggleComplete={onToggleComplete} 
                onDeleteTodo={() => { 
                  if (group.instanceIds.length > 0) {
                    onDeleteTodo(group.instanceIds[0]); 
                  }
                }}
                onToggleIsForToday={onToggleIsForToday} 
                onEditTodo={onEditTodo}                 
                onToggleIsRecurring={onToggleIsRecurring} 
                canCompleteTasks={canCompleteTasks}     
                isGroupedCompleted={true}
                groupCount={group.completionCount}
                onTagClick={onTagClick}
                isDraggable={false} // Not draggable
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  // For other lists (e.g., Backlog)
  return (
    <div className="mb-8">
      {listTitle && (
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">{listTitle}</h2>
      )}
      <ul 
        className="space-y-3"
        onDragOver={handleDragOverList}
        onDrop={handleDropOnList}
        aria-label={listTitle || "Task list"}
      >
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleComplete={onToggleComplete}
            onDeleteTodo={onDeleteTodo}
            onToggleIsForToday={onToggleIsForToday}
            onEditTodo={onEditTodo}
            onToggleIsRecurring={onToggleIsRecurring}
            canCompleteTasks={canCompleteTasks}
            onTagClick={onTagClick}
            isDraggable={isDraggableContext} // Enable/disable based on context
            onReorderItem={onReorderList}    // Pass the main reorder function
          />
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
