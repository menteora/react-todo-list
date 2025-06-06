import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Todo } from './types';
import AddTodoForm from './components/AddTodoForm';
import TodoList from './components/TodoList';
import DownloadIcon from './components/icons/DownloadIcon';
import UploadIcon from './components/icons/UploadIcon';
import TagIcon from './components/icons/TagIcon';
import ChevronDownIcon from './components/icons/ChevronDownIcon';

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      try {
        const parsedTodos: Todo[] = JSON.parse(savedTodos);
        if (Array.isArray(parsedTodos) && parsedTodos.every(todo => 
            typeof todo === 'object' && todo !== null &&
            'id' in todo && 'text' in todo && 
            'completed' in todo && 'createdAt' in todo)) {
          return parsedTodos.map(todo => ({
            ...todo,
            isForToday: todo.isForToday || false,
            isRecurring: todo.isRecurring || false,
            tags: Array.isArray(todo.tags) ? todo.tags : extractTags(todo.text),
          }));
        }
      } catch (error)
      {
        console.error("Failed to parse todos from localStorage or invalid structure", error);
      }
    }
    return [];
  });

  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [isTagFilterAccordionOpen, setIsTagFilterAccordionOpen] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recurringFileInputRef = useRef<HTMLInputElement>(null); // New ref for recurring import

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const extractTags = useCallback((text: string): string[] => {
    const tagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.matchAll(tagRegex);
    const tags = new Set<string>();
    for (const match of matches) {
      tags.add(match[1]);
    }
    return Array.from(tags);
  }, []);

  const addTodo = useCallback((text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
      isForToday: false, 
      isRecurring: false,
      tags: extractTags(text),
    };
    setTodos((prevTodos) => [newTodo, ...prevTodos]);
  }, [extractTags]);

  const toggleComplete = useCallback((id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => {
        if (todo.id === id) {
          // For recurring tasks that are *not* today's instance, "completing" them resets them.
          // This behavior is mostly handled by how isForToday works for recurring tasks.
          // The key is that a recurring task template in backlog (isRecurring=true, isForToday=false) 
          // doesn't really get "completed". An instance is made for today.
          // If it's an instance (isRecurring=false, or isRecurring=true AND isForToday=true) then it can be toggled.
           if (todo.isRecurring && !todo.isForToday) { 
             // This case should ideally not happen if UI prevents completing backlog recurring templates.
             // If it does, we interpret it as reset.
            return { ...todo, completed: false, isForToday: false };
          }
          return { ...todo, completed: !todo.completed };
        }
        return todo;
      })
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  }, []);

  const toggleIsForToday = useCallback((id: string) => {
    setTodos((prevTodos) => {
      const taskToToggle = prevTodos.find(todo => todo.id === id);
      if (!taskToToggle) return prevTodos;

      // If it's a recurring template in the backlog being marked for today
      if (taskToToggle.isRecurring && !taskToToggle.isForToday) {
        const newInstanceForToday: Todo = {
          id: crypto.randomUUID(),
          text: taskToToggle.text, 
          completed: false,
          createdAt: Date.now(),   
          isForToday: true,        
          isRecurring: false, // The instance itself is not the template
          tags: taskToToggle.tags ? [...taskToToggle.tags] : [],
        };
        return [...prevTodos, newInstanceForToday]; 
      } else {
        // Regular toggle or moving an instance back to backlog
        return prevTodos.map((todo) =>
          todo.id === id ? { ...todo, isForToday: !todo.isForToday } : todo
        );
      }
    });
  }, []);

  const editTodo = useCallback((id: string, newText: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, text: newText, tags: extractTags(newText) } : todo
      )
    );
  }, [extractTags]);

  const toggleIsRecurring = useCallback((id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => {
        if (todo.id === id) {
          const newIsRecurring = !todo.isRecurring;
          return {
            ...todo,
            isRecurring: newIsRecurring,
            // If it becomes a recurring template, move it to backlog
            isForToday: newIsRecurring ? false : todo.isForToday, 
          };
        }
        return todo;
      })
    );
  }, []);
  
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a,b) => {
        // Non-completed items first
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then by creation date (newest first)
        return b.createdAt - a.createdAt; 
    });
  }, [todos]);

  const filteredByTagTodos = useMemo(() => {
    if (!activeTagFilter) {
      return sortedTodos;
    }
    return sortedTodos.filter(todo => todo.tags?.includes(activeTagFilter));
  }, [sortedTodos, activeTagFilter]);

  const todayTodos = useMemo(() => {
    return filteredByTagTodos.filter(todo => todo.isForToday);
  }, [filteredByTagTodos]);

  const otherTodos = useMemo(() => {
    // Exclude instances of recurring tasks that are for today but completed (they show up in today's completed section)
    // Show original recurring templates (isRecurring=true, isForToday=false)
    // Show non-recurring, non-today tasks
    return filteredByTagTodos.filter(todo => !todo.isForToday);
  }, [filteredByTagTodos]);

  const completedTodayCount = useMemo(() => {
    return todayTodos.filter(todo => todo.completed).length;
  }, [todayTodos]);
  
  const totalTodayCount = useMemo(() => {
    return todayTodos.length;
  }, [todayTodos]);

  const uniqueTags = useMemo(() => {
    const allTags = new Set<string>();
    todos.forEach(todo => {
      todo.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }, [todos]);

  const escapeCSVField = (field: any): string => {
    if (field === null || typeof field === 'undefined') return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const commonCSVExport = (tasksToExport: Todo[], fileName: string) => {
    const headers = ['id', 'text', 'completed', 'createdAt', 'isForToday', 'isRecurring', 'tags'];
    const csvRows = [
      headers.join(','),
      ...tasksToExport.map(todo => {
        const rowData = {
          ...todo,
          tags: todo.tags?.join(';') || '', // Semicolon-separated for tags
        };
        return headers.map(header => escapeCSVField(rowData[header as keyof typeof rowData])).join(',');
      })
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleExportCSV = () => {
    commonCSVExport(todos, 'todos.csv');
  };

  const handleExportRecurringCSV = () => {
    const recurringTemplates = todos.filter(todo => todo.isRecurring && !todo.isForToday);
    commonCSVExport(recurringTemplates, 'recurring_templates.csv');
  };

  const parseCSVTextToTodos = (text: string, forceRecurringTemplate: boolean): Todo[] | { error: string } => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 1) {
      return { error: "CSV file is empty or has no header." };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase()); // Use lowercase for robust matching
    
    const requiredHeadersBase = ['text']; // createdAt and completed can be defaulted
    const missingHeaders = requiredHeadersBase.filter(rh => !headers.includes(rh));
    if (missingHeaders.length > 0) {
        return { error: `CSV file is missing required headers: ${missingHeaders.join(', ')}. Expected at least: ${requiredHeadersBase.join(', ')}.` };
    }

    const importedTasks: Todo[] = [];
    // Regex to split CSV rows, handling quoted fields
    // Matches a comma that is not inside quotes.
    // Explanation:
    // ,             // Match a comma
    // (?=           // Followed by (positive lookahead):
    //   (?:         //   Non-capturing group
    //     [^"]*     //     Zero or more non-quote characters
    //     "         //     A quote
    //     [^"]*     //     Zero or more non-quote characters
    //     "         //     A quote
    //   )*          //   Repeat the non-capturing group zero or more times (i.e., an even number of quotes)
    //   [^"]*       //   Zero or more non-quote characters
    //   $           // End of the string
    // )             // End of positive lookahead
    // This ensures that commas inside properly quoted fields are not treated as delimiters.
    const csvRowRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;


    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(csvRowRegex).map(value => {
        let cleanValue = value.trim();
        // Remove surrounding quotes if they exist and unescape double quotes
        if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
          cleanValue = cleanValue.substring(1, cleanValue.length - 1).replace(/""/g, '"');
        }
        return cleanValue;
      });
      
      const rowData = headers.reduce((obj, header, index) => {
        // Only map if index is within values range, handles trailing commas better
        if (index < values.length) { 
            obj[header] = values[index];
        } else {
            obj[header] = ''; // Default to empty string if value is missing (e.g. trailing commas in header but not data)
        }
        return obj;
      }, {} as any);


      if (!rowData.text) {
        console.warn(`Skipping row ${i+1} due to missing text field.`);
        continue;
      }

      const taskText = rowData.text;
      // Tags: use 'tags' column if present and non-empty, otherwise extract from text
      const taskTagsString = rowData.tags || '';
      const taskTags = taskTagsString ? taskTagsString.split(';').map(t => t.trim()).filter(Boolean) : extractTags(taskText);

      if (forceRecurringTemplate) {
        importedTasks.push({
          id: crypto.randomUUID(),
          text: taskText,
          completed: false, // Force
          createdAt: parseInt(rowData.createdat, 10) || Date.now(),
          isForToday: false, // Force
          isRecurring: true, // Force
          tags: taskTags,
        });
      } else {
        importedTasks.push({
          id: crypto.randomUUID(), // Always generate new ID
          text: taskText,
          completed: String(rowData.completed).toLowerCase() === 'true',
          createdAt: parseInt(rowData.createdat, 10) || Date.now(),
          isForToday: String(rowData.isfortoday).toLowerCase() === 'true',
          isRecurring: String(rowData.isrecurring).toLowerCase() === 'true',
          tags: taskTags,
        });
      }
    }
    return importedTasks;
  };
  

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        alert("Failed to read file or file is empty.");
        return;
      }
      try {
        const result = parseCSVTextToTodos(text, false);
        if ('error' in result) {
            alert(result.error);
            return;
        }
        setTodos(result);
        alert(`Successfully imported ${result.length} tasks. All previous tasks have been replaced.`);
      } catch (error) {
        console.error("Error importing CSV:", error);
        alert("An error occurred while importing the CSV file. Please check the console for details.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    };
    reader.onerror = () => {
        alert("Failed to read the file.");
         if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };

  const handleImportRecurringCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        alert("Failed to read file or file is empty for recurring templates.");
        return;
      }
      try {
        const result = parseCSVTextToTodos(text, true); // forceRecurringTemplate = true
         if ('error' in result) {
            alert(result.error);
            return;
        }
        setTodos(prevTodos => [...prevTodos, ...result]);
        alert(`Successfully imported ${result.length} recurring templates. They have been added to your backlog.`);
      } catch (error) {
        console.error("Error importing recurring CSV:", error);
        alert("An error occurred while importing recurring templates. Please check the console.");
      } finally {
        if (recurringFileInputRef.current) {
          recurringFileInputRef.current.value = ""; // Reset file input
        }
      }
    };
    reader.onerror = () => {
        alert("Failed to read the recurring templates file.");
        if (recurringFileInputRef.current) {
          recurringFileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerRecurringFileInput = () => {
    recurringFileInputRef.current?.click();
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center py-8 px-4 selection:bg-indigo-200">
      <main className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-500 ease-in-out">
        <header className="mb-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            My Task Manager
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Organize your day, edit tasks, manage recurring duties, and plan ahead with #tags.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-150"
              title="Export ALL tasks to a CSV file"
            >
              <DownloadIcon className="w-5 h-5" />
              Export All CSV
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCSV}
              accept=".csv"
              className="hidden"
              aria-hidden="true"
            />
            <button
              onClick={triggerFileInput}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-colors duration-150"
              title="Import tasks from CSV (REPLACES ALL current tasks)"
            >
              <UploadIcon className="w-5 h-5" />
              Import All CSV
            </button>
            
            <button
              onClick={handleExportRecurringCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 transition-colors duration-150"
              title="Export RECURRING TEMPLATES to a CSV file"
            >
              <DownloadIcon className="w-5 h-5" />
              Export Recurring CSV
            </button>
            <input
              type="file"
              ref={recurringFileInputRef}
              onChange={handleImportRecurringCSV}
              accept=".csv"
              className="hidden"
              aria-hidden="true"
            />
            <button
              onClick={triggerRecurringFileInput}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 transition-colors duration-150"
              title="Import RECURRING TEMPLATES from CSV (ADDS to existing tasks)"
            >
              <UploadIcon className="w-5 h-5" />
              Import Recurring CSV
            </button>
          </div>
        </header>

        <AddTodoForm onAddTodo={addTodo} />

        {uniqueTags.length > 0 && (
          <div className="mb-6 bg-gray-50/70 backdrop-blur-sm rounded-lg shadow">
            <button
              onClick={() => setIsTagFilterAccordionOpen(!isTagFilterAccordionOpen)}
              className="w-full flex items-center justify-between p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 rounded-t-lg hover:bg-gray-100/70 transition-colors"
              aria-expanded={isTagFilterAccordionOpen}
              aria-controls="tag-filter-panel"
            >
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <TagIcon className="w-4 h-4 mr-1.5 text-indigo-600" />
                Filter by Tag
              </h3>
              <div className="flex items-center">
                {activeTagFilter && (
                  <span
                    onClick={(e) => {
                        e.stopPropagation(); 
                        setActiveTagFilter(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setActiveTagFilter(null);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    className="mr-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    title="Clear tag filter"
                  >
                    Show All Tasks
                  </span>
                )}
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                    isTagFilterAccordionOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
            {isTagFilterAccordionOpen && (
              <div id="tag-filter-panel" className="p-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTagFilter(tag)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ease-in-out transform hover:scale-105
                        ${activeTagFilter === tag
                          ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm hover:shadow-md'
                        }`}
                      title={`Filter by tag: #${tag}`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {uniqueTags.length === 0 && !activeTagFilter && (
                     <p className="text-xs text-gray-500">No tags found. Add tasks with #tags to filter.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {totalTodayCount > 0 && (
          <div className="mb-6 text-right text-gray-600">
            <span className="font-semibold">{completedTodayCount}</span> / {totalTodayCount} tasks in Today's Focus completed
            {activeTagFilter && <span className="text-xs italic"> (filtered by #{activeTagFilter})</span>}
          </div>
        )}

        <TodoList
          listTitle="Today's Focus ✨"
          todos={todayTodos}
          onToggleComplete={toggleComplete}
          onDeleteTodo={deleteTodo} 
          onToggleIsForToday={toggleIsForToday}
          onEditTodo={editTodo}
          onToggleIsRecurring={toggleIsRecurring}
          canCompleteTasks={true} 
          emptyListMessage={activeTagFilter ? `No tasks for today with tag #${activeTagFilter}.` : "No tasks for today. Add some or focus on recurring ones!"}
          emptyListImageSeed="todayFocus"
          isTodayFocusList={true}
          onTagClick={setActiveTagFilter}
        />

        <TodoList
          listTitle="Upcoming & Backlog 📝"
          todos={otherTodos}
          onToggleComplete={toggleComplete}
          onDeleteTodo={deleteTodo} 
          onToggleIsForToday={toggleIsForToday} 
          onEditTodo={editTodo}
          onToggleIsRecurring={toggleIsRecurring} 
          canCompleteTasks={false} 
          emptyListMessage={activeTagFilter ? `No tasks in backlog with tag #${activeTagFilter}.` : "Your backlog is clear! Add new tasks to plan ahead."}
          emptyListImageSeed="backlogItems"
          onTagClick={setActiveTagFilter}
        />
        
        {todos.length > 0 && (
          <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Tip: ✏️ Edit | ⭐ Focus/Add Instance | 🔄 Recurring Template | #tag for organization.</p>
            <p className="mt-1">Double-click task text to quickly edit. Tags (#yourtag) are auto-detected.</p>
            <p className="mt-1">Click 🔄 on a backlog task to make it a recurring template.</p>
            <p className="mt-1">Click ⭐ on a recurring template in backlog to add an instance to Today's Focus.</p>
            <p className="mt-1">Completed tasks in "Today's Focus" with the same name will group and show a count.</p>
            <p className="mt-1">Deleting a grouped completed task (count &gt; 1) removes one instance and decrements count.</p>
            <p className="mt-1">Tasks in Backlog must be moved to Today's Focus (or an instance created) to be completed.</p>
            <p className="mt-1">Click on a #tag in a task or in the filter bar to filter your lists.</p>
            <p className="mt-1">Tasks are saved in your browser's local storage.</p>
            <p className="mt-1">Use "Export All CSV" / "Import All CSV" to backup/transfer ALL tasks (Import replaces current).</p>
            <p className="mt-1">Use "Export Recurring CSV" / "Import Recurring CSV" for recurring templates (Import adds to current).</p>
          </footer>
        )}
      </main>
      <footer className="mt-8 text-center text-gray-600 text-sm">
        <p>Powered by React & Tailwind CSS</p>
      </footer>
    </div>
  );
};

export default App;
