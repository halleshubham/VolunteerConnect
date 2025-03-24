import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, TaskFeedback, Contact } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Filter, Calendar } from "lucide-react";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/dashboard/task-detail-modal";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import Sidebar from "@/components/layout/sidebar";

export default function TasksPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task & { feedbacks: TaskFeedback[] } | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    assignedTo: "",
    dateRange: { from: undefined, to: undefined } as { from?: Date; to?: Date },
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");

  // Fetch tasks with filters
  const { data: tasks = [], isLoading } = useQuery<(Task & { feedbacks: TaskFeedback[] })[]>({
    queryKey: ["/api/tasks", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.assignedTo) params.append("assignedTo", filters.assignedTo);
      if (filters.dateRange.from) params.append("fromDate", filters.dateRange.from.toISOString());
      if (filters.dateRange.to) params.append("toDate", filters.dateRange.to.toISOString());

      const response = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });

  // Filter tasks by search term
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Update task feedback
  const handleUpdateFeedback = async (feedbackId: number, data: Partial<TaskFeedback>) => {
    try {
      await fetch(`/api/task-feedback/${feedbackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      toast({
        title: "Feedback updated",
        description: "The task feedback has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update feedback",
        variant: "destructive",
      });
    }
  };

  // Mutation for creating tasks
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      dueDate: Date;
      tags: string[];
      assignedTo: string;
      contacts: number[];
    }) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
      setIsCreateModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query for fetching contacts by assignee
  const { data: assignedContacts = [], isLoading: isContactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", { assignedTo: selectedUser }],
    queryFn: async () => {
      const params = new URLSearchParams({ assignedTo: selectedUser });
      const response = await fetch(`/api/contacts?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
    enabled: !!selectedUser,
  });

  // Add useEffect to update selectedContacts when assignedContacts changes
  useEffect(() => {
    if (assignedContacts.length > 0) {
      setSelectedContacts(assignedContacts);
    }
  }, [assignedContacts]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filters.status} onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="inProgress">In Progress</SelectItem>
                </SelectContent>
              </Select>
              {/* <DateRangePicker
                from={filters.dateRange.from}
                to={filters.dateRange.to}
                onSelect={(range) => setFilters(f => ({ ...f, dateRange: range }))}
              /> */}
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="ml-4"
            >
              Create Task
            </Button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tasks found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTask(task)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      </div>
                      <Badge variant={task.isCompleted ? "success" : "secondary"}>
                        {task.isCompleted ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Assigned to: {task.assignedTo}</span>
                        <span>Due: {format(new Date(task.dueDate), "PPP")}</span>
                      </div>
                      <span>
                        {task.feedbacks.filter(f => f.isCompleted).length} of {task.feedbacks.length} completed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <TaskAssignmentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedUser("");
            setSelectedContacts([]);
          }}
          selectedContacts={selectedContacts}
          isContactsLoading={isContactsLoading}
          onSubmit={async (data) => {
            await createTaskMutation.mutateAsync({
              ...data,
              contacts: selectedContacts.map(c => c.id),
            });
          }}
          onUserSelect={(username) => {
            setSelectedUser(username);
          }}
        />

        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onUpdateFeedback={handleUpdateFeedback}
        />
      </div>
    </div>
  );
}