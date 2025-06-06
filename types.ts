export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  isForToday?: boolean;
  isRecurring?: boolean; 
  tags?: string[]; // Added: Store extracted tags from the description
}