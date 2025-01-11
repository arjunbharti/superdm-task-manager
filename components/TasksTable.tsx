"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Task } from "@/types/task"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { TaskDialog } from "./TaskDialog"

import tasksData from "@/utils/dummy-data.json"

const initialTasks = tasksData as Task[]

const ITEMS_PER_PAGE = 5

const statusColorMap = {
  OPEN: "bg-yellow-500/10 text-yellow-500 border-yellow-500 hover:bg-yellow-500/20 cursor-pointer",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500 hover:bg-blue-500/20 cursor-pointer",
  CLOSED: "bg-green-500/10 text-green-500 border-green-500 hover:bg-green-500/20 cursor-pointer",
} as const

const priorityColorMap = {
  LOW: "bg-gray-500/10 text-gray-500 border-gray-500 hover:bg-gray-500/20 cursor-pointer",
  MEDIUM: "bg-orange-500/10 text-orange-500 border-orange-500 hover:bg-orange-500/20 cursor-pointer",
  HIGH: "bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500/20 cursor-pointer",
} as const

type SortableFields = "name" | "status" | "priority" | "assignee" | "due_date" | "created_at"

interface TasksTableProps {
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  searchQuery: string;
  onTaskUpdate: (updatedTask: Task) => void;
}

interface SortConfig {
  key: SortableFields | null;
  direction: "asc" | "desc";
}

const getSavedSortConfig = (): SortConfig => {
  if (typeof window === 'undefined') return { key: "created_at", direction: "desc" }
  
  const saved = localStorage.getItem('taskSortConfig')
  return saved ? JSON.parse(saved) : { key: "created_at", direction: "desc" }
}

const nextStatusMap = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'CLOSED',
  CLOSED: 'OPEN',
} as const

export function TasksTable({ status, searchQuery, onTaskUpdate }: TasksTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(getSavedSortConfig)
  const [page, setPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState<Task[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [localTasks, setLocalTasks] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem('tasks')
      return savedTasks ? JSON.parse(savedTasks) : initialTasks
    }
    return initialTasks
  })
  const tableRef = useRef<HTMLDivElement>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number>(-1);
  const taskRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // saving sort config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('taskSortConfig', JSON.stringify(sortConfig))
  }, [sortConfig])

  // saving tasks to localStorage when they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(localTasks))
  }, [localTasks])

  const lastTaskRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (!hasMore) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1)
        }
      })

      if (node) observer.current.observe(node)
    },
    [hasMore]
  )

  const handleStatusChange = useCallback((taskId: number, newStatus: Task['status'], comment: string) => {
    // updating the task in localStorage
    const updatedTask = {
      ...localTasks.find((task: Task) => task.id === taskId)!,
      status: newStatus,
      comment: comment,
      updated_at: new Date().toISOString()
    };

    setLocalTasks((prevTasks: Task[]) => 
      prevTasks.map((task: Task) => 
        task.id === taskId ? updatedTask : task
      )
    );

    onTaskUpdate(updatedTask);

    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }

    if (newStatus !== status) {
      setDisplayedTasks(prev => prev.filter(task => task.id !== taskId));
    }
  }, [selectedTask, status, localTasks, onTaskUpdate]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setIsDialogOpen(true)
  }, [])

  // filtering tasks based on status and search query
  const filteredTasks = useMemo(() => 
    localTasks.filter((task: Task) => 
      task.status === status && 
      (searchQuery === '' || 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.labels.some((label: string) => label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        task.assignee.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ), [localTasks, status, searchQuery]
  )

  // sorting tasks
  const sortedTasks = useMemo(() => 
    [...filteredTasks].sort((a, b) => {
      if (!sortConfig.key) return 0

      let aValue: string | number = a[sortConfig.key]
      let bValue: string | number = b[sortConfig.key]

      // converting dates to timestamps for comparison
      if (sortConfig.key === 'created_at' || sortConfig.key === 'due_date') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      // custom sort order for status
      if (sortConfig.key === 'status') {
        const statusOrder = { 'OPEN': 1, 'IN_PROGRESS': 2, 'CLOSED': 3 }
        aValue = statusOrder[aValue as keyof typeof statusOrder]
        bValue = statusOrder[bValue as keyof typeof statusOrder]
      }

      // custom sort order for priority
      if (sortConfig.key === 'priority') {
        const priorityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 }
        aValue = priorityOrder[aValue as keyof typeof priorityOrder]
        bValue = priorityOrder[bValue as keyof typeof priorityOrder]
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    }), [filteredTasks, sortConfig]
  )

  // updating displayed tasks when page changes or when tasks are filtered/sorted
  useEffect(() => {
    const start = 0
    const end = page * ITEMS_PER_PAGE
    const newTasks = sortedTasks.slice(start, end)
    setDisplayedTasks(newTasks)
    setHasMore(end < sortedTasks.length)
  }, [page, sortedTasks])

  // resetting pagination and update displayed tasks when status, sort, or search changes
  useEffect(() => {
    setPage(1)
    setDisplayedTasks(sortedTasks.slice(0, ITEMS_PER_PAGE))
    setHasMore(ITEMS_PER_PAGE < sortedTasks.length)
  }, [status, sortConfig, searchQuery, sortedTasks])

  const handleDialogClose = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      // when dialog closes, update the selected task to match its current state in localTasks
      if (selectedTask) {
        const updatedTask = localTasks.find((task: Task) => task.id === selectedTask.id)
        setSelectedTask(updatedTask || null)
      }
    }
  }, [localTasks, selectedTask])

  const requestSort = useCallback((key: SortableFields) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  const clearSort = useCallback(() => {
    setSortConfig({ key: null, direction: "desc" })
  }, [])

  const handleNavigateTask = useCallback((direction: 'prev' | 'next') => {
    if (!selectedTask) return;

    const currentIndex = sortedTasks.findIndex(task => task.id === selectedTask.id);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex === 0 ? sortedTasks.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === sortedTasks.length - 1 ? 0 : currentIndex + 1;
    }

    const newTask = sortedTasks[newIndex];
    setSelectedTask(newTask);

    // ensuring the new task is loaded in displayed tasks if needed
    const pageIndex = Math.floor(newIndex / ITEMS_PER_PAGE);
    if (pageIndex + 1 > page) {
      setPage(pageIndex + 1);
    }
  }, [selectedTask, sortedTasks, page]);

  // handling keyboard navigation in table
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!displayedTasks.length) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setFocusedTaskIndex(prev => {
          const newIndex = prev <= 0 ? displayedTasks.length - 1 : prev - 1;
          taskRowRefs.current[newIndex]?.focus();
          return newIndex;
        });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedTaskIndex(prev => {
          const newIndex = prev === displayedTasks.length - 1 ? 0 : prev + 1;
          taskRowRefs.current[newIndex]?.focus();
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedTaskIndex >= 0) {
          handleTaskClick(displayedTasks[focusedTaskIndex]);
        }
        break;
      case 'Tab':
        setFocusedTaskIndex(-1);
        break;
    }
  }, [displayedTasks, focusedTaskIndex, handleTaskClick]);

  // removing the window event listener since we're using React's onKeyDown
  useEffect(() => {
    taskRowRefs.current = taskRowRefs.current.slice(0, displayedTasks.length);
  }, [displayedTasks]);

  if (sortedTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchQuery 
          ? `No tasks found matching "${searchQuery}" with status: ${status.toLowerCase().replace("_", " ")}`
          : `No tasks found with status: ${status.toLowerCase().replace("_", " ")}`
        }
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground" id="sort-options-label">Sort by:</div>
          <div 
            className="flex gap-2" 
            role="toolbar" 
            aria-label="Sort options"
            aria-labelledby="sort-options-label"
          >
            {[
              { key: 'priority', label: 'Priority' },
              { key: 'created_at', label: 'Created At' },
              { key: 'due_date', label: 'Due Date' }
            ].map(({ key, label }, index) => (
              <button
                key={key}
                onClick={() => requestSort(key as SortableFields)}
                onKeyDown={(e) => {
                  // Handle left/right arrow keys for navigation
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevButton = document.querySelector(`[data-sort-index="${index - 1}"]`) as HTMLButtonElement;
                    prevButton?.focus();
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextButton = document.querySelector(`[data-sort-index="${index + 1}"]`) as HTMLButtonElement;
                    nextButton?.focus();
                  }
                }}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  sortConfig.key === key 
                    ? "bg-accent text-accent-foreground border-accent hover:bg-accent/90"
                    : "hover:bg-muted border-input"
                )}
                data-sort-index={index}
                aria-pressed={sortConfig.key === key}
                aria-label={`Sort by ${label} ${
                  sortConfig.key === key 
                    ? `(currently ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'})`
                    : ''
                }`}
              >
                {label}
                {sortConfig.key === key && (
                  <span className="ml-2 text-xs" aria-hidden="true">
                    ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {sortConfig.key && (
          <button
            onClick={clearSort}
            className="p-2 ml-4 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Reset sorting"
            aria-label="Reset sorting"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const lastSortButton = document.querySelector('[data-sort-index="2"]') as HTMLButtonElement;
                lastSortButton?.focus();
              }
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div 
        className="rounded-md border" 
        ref={tableRef}
        onKeyDown={handleTableKeyDown}
        tabIndex={-1}
        role="grid"
        aria-label="Tasks table"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => requestSort("created_at")}
              >
                Created At
                {sortConfig.key === "created_at" && (
                  <span className="ml-2 text-xs">
                    ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => requestSort("priority")}
              >
                Priority
                {sortConfig.key === "priority" && (
                  <span className="ml-2 text-xs">
                    ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => requestSort("due_date")}
              >
                Due Date
                {sortConfig.key === "due_date" && (
                  <span className="ml-2 text-xs">
                    ({sortConfig.direction === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTasks.map((task, index) => (
              <TableRow
                key={task.id}
                ref={(el) => {
                  if (index === displayedTasks.length - 1) {
                    lastTaskRef(el);
                  }
                  taskRowRefs.current[index] = el;
                }}
                className={cn(
                  "transition-colors hover:bg-muted/50 cursor-pointer",
                  focusedTaskIndex === index && "bg-muted/50"
                )}
                onClick={() => handleTaskClick(task)}
                onFocus={() => setFocusedTaskIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTaskClick(task);
                  }
                }}
                tabIndex={0}
                role="row"
                aria-selected={focusedTaskIndex === index}
              >
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell>
                  {format(new Date(task.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {task.labels.map((label) => (
                      <Badge key={label} variant="secondary" className='border-gray-500'>
                        {label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "capitalize",
                      statusColorMap[task.status]
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange(task.id, nextStatusMap[task.status], '')
                    }}
                    title={`Click to move to ${nextStatusMap[task.status].toLowerCase().replace("_", " ")}`}
                  >
                    {task.status.toLowerCase().replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      priorityColorMap[task.priority]
                    )}
                  >
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>{task.assignee}</TableCell>
                <TableCell>
                  {format(new Date(task.due_date), "MMM dd, yyyy")}
                </TableCell>
              </TableRow>
            ))}
            {hasMore && (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-4">
                  <div className="animate-pulse text-muted-foreground">
                    Loading more tasks...
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TaskDialog
        task={selectedTask}
        isOpen={isDialogOpen}
        onOpenChange={handleDialogClose}
        onStatusChange={handleStatusChange}
        onNavigate={handleNavigateTask}
      />
    </div>
  )
}
