import { Task, TaskFeedback } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistance } from "date-fns";
import { CircleIcon, CheckCircle2Icon } from "lucide-react";

interface TaskCardProps {
  task: Task & { feedbacks: TaskFeedback[] };
  onClick: (task: Task & { feedbacks: TaskFeedback[] }) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const completedCount = task.feedbacks.filter(f => f.isCompleted).length;
  const totalCount = task.feedbacks.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div 
      className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(task)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900">{task.title}</h3>
        <Badge variant={task.isCompleted ? "secondary" : "default"}>
          {task.isCompleted ? "Completed" : "In Progress"}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>
      
      <div className="space-y-3">
        <div className="flex items-center text-sm">
          <CircleIcon className="mr-2 h-4 w-4 text-blue-500" />
          <span>Due {formatDistance(new Date(task.dueDate), new Date(), { addSuffix: true })}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <CheckCircle2Icon className="mr-2 h-4 w-4 text-green-500" />
            <span>{completedCount} of {totalCount} completed</span>
          </div>
          <span className="text-gray-500">{Math.round(progress)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}