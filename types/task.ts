export type Task = {
  id: number;
  name: string;
  labels: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  comment: string;
}