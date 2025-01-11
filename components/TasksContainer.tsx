'use client';

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TasksTable } from "./TasksTable";
import { Task } from "@/types/task";
import tasksData from "@/utils/dummy-data.json";
import { Search, X } from "lucide-react";
import { Input } from "./ui/input";

const initialTasks = tasksData as Task[];

interface FilteredTaskCounts {
  OPEN: number;
  IN_PROGRESS: number;
  CLOSED: number;
}

const getTaskCountByStatus = (tasks: Task[], status: Task['status'], searchQuery: string): number => {
  return tasks.filter(task => 
    task.status === status && 
    (searchQuery === '' || 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.labels.some(label => label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      task.assignee.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ).length;
}

const TasksContainer = () => {
  const [selectedTab, setSelectedTab] = useState<string>('OPEN');
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskSearchQuery') || '';
    }
    return '';
  });
  const [tasks, setTasks] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem('tasks');
      return savedTasks ? JSON.parse(savedTasks) : initialTasks;
    }
    return initialTasks;
  });
  const [taskCounts, setTaskCounts] = useState<FilteredTaskCounts>({
    OPEN: getTaskCountByStatus(tasks, 'OPEN', searchQuery),
    IN_PROGRESS: getTaskCountByStatus(tasks, 'IN_PROGRESS', searchQuery),
    CLOSED: getTaskCountByStatus(tasks, 'CLOSED', searchQuery),
  });

  useEffect(() => {
    const storedTab = localStorage.getItem('selectedTab');
    if (storedTab) {
      setSelectedTab(storedTab);
    }
    setIsMounted(true);
  }, []);

  // updating task counts when tasks or search query changes
  useEffect(() => {
    setTaskCounts({
      OPEN: getTaskCountByStatus(tasks, 'OPEN', searchQuery),
      IN_PROGRESS: getTaskCountByStatus(tasks, 'IN_PROGRESS', searchQuery),
      CLOSED: getTaskCountByStatus(tasks, 'CLOSED', searchQuery),
    });
  }, [tasks, searchQuery]);

  // saving search query to localStorage
  useEffect(() => {
    localStorage.setItem('taskSearchQuery', searchQuery);
  }, [searchQuery]);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    localStorage.setItem('selectedTab', tab);
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  }

  const clearSearch = () => {
    setSearchQuery('');
    localStorage.removeItem('taskSearchQuery');
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prevTasks: Task[]) => 
      prevTasks.map((task: Task) => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  }

  // preventing hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-4 my-8">
      <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-3 w-[400px]" role="tablist" aria-label="Task status tabs">
            <TabsTrigger 
              value="OPEN"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open ({taskCounts.OPEN})
            </TabsTrigger>
            <TabsTrigger 
              value="IN_PROGRESS"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              In-progress ({taskCounts.IN_PROGRESS})
            </TabsTrigger>
            <TabsTrigger 
              value="CLOSED"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Closed ({taskCounts.CLOSED})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search tasks"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <TabsContent 
          value="OPEN"
          role="tabpanel"
          tabIndex={0}
        >
          <TasksTable 
            status="OPEN" 
            searchQuery={searchQuery} 
            onTaskUpdate={handleTaskUpdate}
          />
        </TabsContent>
        <TabsContent 
          value="IN_PROGRESS"
          role="tabpanel"
          tabIndex={0}
        >
          <TasksTable 
            status="IN_PROGRESS" 
            searchQuery={searchQuery} 
            onTaskUpdate={handleTaskUpdate}
          />
        </TabsContent>
        <TabsContent 
          value="CLOSED"
          role="tabpanel"
          tabIndex={0}
        >
          <TasksTable 
            status="CLOSED" 
            searchQuery={searchQuery} 
            onTaskUpdate={handleTaskUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TasksContainer;