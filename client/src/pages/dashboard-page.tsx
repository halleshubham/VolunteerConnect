import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Contact, Event, Task, TaskFeedback } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound, CalendarDays, Award, Activity, Users, Phone, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { navigate } from "wouter/use-browser-location";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskCard } from "@/components/dashboard/task-card";
import { TaskDetailModal } from "@/components/dashboard/task-detail-modal";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<(Task & { feedbacks: TaskFeedback[] }) | null>(null);

  const {user} = useAuth();

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: user?.role == 'admin' ? ["/api/contacts"] : ["/api/contacts?assignedTo="+user?.username],
  });

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<(Task & { feedbacks: TaskFeedback[] })[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  // Filter tasks before rendering them
  const pendingTasks = tasks.filter(task => !task.isCompleted);

  // Update task feedback mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ 
      feedbackId, 
      data 
    }: { 
      feedbackId: number; 
      data: Partial<TaskFeedback> 
    }) => {
      await apiRequest("PUT", `/api/task-feedback/${feedbackId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Feedback updated",
        description: "The task feedback has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update feedback: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Contact metrics
  const contactsByCategory = contacts.reduce((acc, contact) => {
    acc[contact.category] = (acc[contact.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contactsByPriority = contacts.reduce((acc, contact) => {
    acc[contact.priority] = (acc[contact.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Chart data
  const categoryChartData = Object.entries(contactsByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const recentContacts = contacts.slice(0, 5);
  const recentEvents = events.slice(0, 3);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" onOpenSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Stats Section */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100">
                    <UsersRound className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                    <p className="text-2xl font-semibold text-gray-900">{contacts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-purple-100">
                    <CalendarDays className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Events</p>
                    <p className="text-2xl font-semibold text-gray-900">{events.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-green-100">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Volunteers</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {contacts.filter(c => c.category === 'volunteer' && c.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-yellow-100">
                    <Activity className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Follow-up Required</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {contacts.filter(c => c.status === 'follow-up').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-indigo-100">
                    <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {tasks.filter(t => !t.isCompleted).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tasks Section */}
          <div className="mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>Tasks requiring your attention</CardDescription>
                </div>
                {/* <Link href="/tasks">
                  <Button variant="outline">View All</Button>
                </Link> */}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No pending tasks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={setSelectedTask}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Contacts by Category</CardTitle>
                <CardDescription>Distribution of contacts across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--chart-1)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contact Priority Distribution</CardTitle>
                <CardDescription>Breakdown of contacts by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'High', value: contactsByPriority.high || 0 },
                        { name: 'Medium', value: contactsByPriority.medium || 0 },
                        { name: 'Low', value: contactsByPriority.low || 0 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Contacts</CardTitle>
                  <CardDescription>Newly added contacts</CardDescription>
                </div>
                <Link href="/contacts">
                  <Button variant="outline">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentContacts.length > 0 ? (
                    recentContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {contact.name.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {contact.mobile}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            contact.category === 'volunteer' ? 'bg-green-100 text-green-800' :
                            contact.category === 'donor' ? 'bg-purple-100 text-purple-800' :
                            contact.category === 'partner' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {contact.category}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">No contacts added yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Your organization's scheduled events</CardDescription>
                </div>
                <Link href="/events">
                  <Button variant="outline">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event) => (
                      <div key={event.id} className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-medium">
                            <CalendarDays className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{event.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.date).toLocaleDateString()} at {event.location}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <Users className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">No events scheduled</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <TaskDetailModal
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            task={selectedTask}
            onUpdateFeedback={async (feedbackId, data) => {
              await updateFeedbackMutation.mutateAsync({ feedbackId, data });
            }}
            onCloseComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
            }}
          />
        </main>
      </div>
    </div>
  );
}
