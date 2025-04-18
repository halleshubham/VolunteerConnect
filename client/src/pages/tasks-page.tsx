import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, TaskFeedback, Contact } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Filter, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/dashboard/task-detail-modal";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { CampaignModal } from "@/components/tasks/campaign-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tasks' | 'campaigns'>('tasks');

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

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: campaigns = {}, isLoading: isCampaignsLoading } = useQuery<Record<string, (Task & { feedbacks: TaskFeedback[] })[]>>({
    queryKey: ["/api/tasks/campaigns", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.assignedTo) params.append("assignedTo", filters.assignedTo);
      if (filters.dateRange.from) params.append("fromDate", filters.dateRange.from.toISOString());
      if (filters.dateRange.to) params.append("toDate", filters.dateRange.to.toISOString());

      const response = await fetch(`/api/tasks/campaigns?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const tasks = await response.json();
      
      // Group tasks by campaign name
      return tasks.reduce((acc: Record<string, any[]>, task: Task & { feedbacks: TaskFeedback[] }) => {
        if (task.campaignName) {
          if (!acc[task.campaignName]) {
            acc[task.campaignName] = [];
          }
          acc[task.campaignName].push(task);
        }
        return acc;
      }, {});
    },
    enabled: viewMode === 'campaigns'
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

  // Mutation for creating campaigns
  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      dueDate: Date;
      selectedUsers: string[];
      contactDistribution: Record<string, Contact[]>;
      fileData?: any[];
    }) => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create campaign");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: "The campaign has been created successfully.",
      });
      setIsCampaignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
              <Select 
                value={viewMode} 
                onValueChange={(value: 'tasks' | 'campaigns') => setViewMode(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tasks View</SelectItem>
                  <SelectItem value="campaigns">Campaigns View</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.assignedTo} 
                onValueChange={(value) => setFilters(f => ({ ...f, assignedTo: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.username} value={user.username}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    Actions <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsCreateModalOpen(true)}>
                    Create Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsCampaignModalOpen(true)}>
                    Create Campaign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {isLoading || isCampaignsLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : viewMode === 'tasks' ? (
            filteredTasks.length === 0 ? (
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
            )
          ) : (
            <div className="space-y-8">
              {Object.entries(campaigns).map(([campaignName, tasks]) => (
                <Card key={campaignName} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{campaignName}</h3>
                        <p className="text-sm text-gray-500">
                          {tasks.length} tasks • Created {format(new Date(tasks[0].createdAt), "PPP")}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {tasks.filter(t => t.isCompleted).length} of {tasks.length} completed
                      </Badge>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${(tasks.filter(t => t.isCompleted).length / tasks.length) * 100}%` 
                        }}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500">
                                Assigned to: {task.assignedTo} • 
                                {task.feedbacks.filter(f => f.isCompleted).length} of {task.feedbacks.length} contacts completed
                              </p>
                            </div>
                            <Badge variant={task.isCompleted ? "success" : "secondary"}>
                              {task.isCompleted ? "Completed" : "In Progress"}
                            </Badge>
                          </div>
                        </div>
                      ))}
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
          onClose={() => {
            setSelectedTask(null);
            // Refresh both tasks and campaigns data
            queryClient.invalidateQueries({ queryKey: ["/api/tasks", filters] });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/campaigns", filters] });
          }}
          task={selectedTask}
          onUpdateFeedback={handleUpdateFeedback}
          onCloseComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/tasks", filters] });
            queryClient.invalidateQueries({ queryKey: ["/api/tasks/campaigns", filters] });
          }}
        />

        <CampaignModal 
          isOpen={isCampaignModalOpen}
          onClose={() => setIsCampaignModalOpen(false)}
          users={users}
          onSubmit={async (data) => {
            await createCampaignMutation.mutateAsync(data);
          }}
        />
      </div>
    </div>
  );
}