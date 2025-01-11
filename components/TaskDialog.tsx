'use client';

import { useState, useEffect, useCallback } from "react";
import { Task } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskDialogProps {
  task: Task | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (taskId: number, newStatus: Task['status'], comment: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

const statusColorMap = {
  OPEN: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500 border-blue-500",
  CLOSED: "bg-green-500/10 text-green-500 border-green-500",
} as const

const priorityColorMap = {
  LOW: "bg-gray-500/10 text-gray-500 border-gray-500",
  MEDIUM: "bg-orange-500/10 text-orange-500 border-orange-500",
  HIGH: "bg-red-500/10 text-red-500 border-red-500",
} as const

const STATUS_SHORTCUTS = {
  '1': 'OPEN',
  '2': 'IN_PROGRESS',
  '3': 'CLOSED',
} as const;

export function TaskDialog({ task, isOpen, onOpenChange, onStatusChange, onNavigate }: TaskDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState<Task['status'] | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleStatusChange = useCallback(() => {
    if (!task || !newStatus) return;
    
    if (!comment.trim()) {
      setError("Please provide a comment for the status change");
      return;
    }

    onStatusChange?.(task.id, newStatus, comment);
    setIsEditing(false);
    setNewStatus(null);
    setComment("");
    setError("");
    onOpenChange(false);
  }, [task, newStatus, comment, onStatusChange, onOpenChange]);

  const handleCancel = () => {
    setIsEditing(false);
    setNewStatus(null);
    setComment("");
    setError("");
  };

  // handling keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // preventing handling if focus is in textarea
      if (document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate?.('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate?.('next');
          break;
        case '1':
        case '2':
        case '3':
          e.preventDefault();
          const targetStatus = STATUS_SHORTCUTS[e.key as keyof typeof STATUS_SHORTCUTS];
          if (task?.status !== targetStatus) {
            setNewStatus(targetStatus);
            setIsEditing(true);
          }
          break;
        case 'Escape':
          if (isEditing) {
            e.preventDefault();
            handleCancel();
          }
          break;
        case 'Enter':
          if (isEditing && !e.shiftKey) {
            e.preventDefault();
            handleStatusChange();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, task, isEditing, onNavigate, handleStatusChange]);

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-4">
            {task.name}
            <div className="text-sm font-normal text-muted-foreground">
              (Use ←/→ to navigate, 1/2/3 to change status)
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            {isEditing ? (
              <Select
                value={newStatus || task.status}
                onValueChange={(value: Task['status']) => setNewStatus(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open (1)</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress (2)</SelectItem>
                  <SelectItem value="CLOSED">Closed (3)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <>
                <Badge
                  className={cn(
                    "capitalize",
                    statusColorMap[task.status]
                  )}
                >
                  {task.status.toLowerCase().replace("_", " ")}
                </Badge>
                <Badge
                  className={cn(
                    priorityColorMap[task.priority]
                  )}
                >
                  {task.priority}
                </Badge>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Assignee</p>
              <p>{task.assignee}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Due Date</p>
              <p>{format(new Date(task.due_date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Created At</p>
              <p>{format(new Date(task.created_at), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Last Updated</p>
              <p>{format(new Date(task.updated_at), "MMM dd, yyyy")}</p>
            </div>
          </div>

          <div>
            <p className="font-medium text-muted-foreground mb-2">Labels</p>
            <div className="flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <Badge key={label} variant="secondary" className="border-gray-500">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium text-muted-foreground mb-2">
              {isEditing ? "New Comment" : "Comment"}
            </p>
            {isEditing ? (
              <>
                <Textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    setError("");
                  }}
                  placeholder="Add a comment for the status change..."
                  className={cn(
                    "resize-none",
                    error && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {error && (
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
              </>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4">
                {task.comment}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleStatusChange}>
                Update Status
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Change Status
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 