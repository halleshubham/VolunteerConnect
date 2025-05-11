import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PieChart, BarChart4, Users, MapPin, X, Phone, Mail, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Add chart components
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Add Dialog components for modals
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// Add Table components for contact lists
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define types for the dashboard data
type TaskStats = {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
};

type ResponseStats = {
  yes: number;
  no: number;
  tentative: number;
};

type UserTaskStats = {
  username: string;
  assigned: number;
  completed: number;
  completionRate: number;
};

type CityStats = {
  city: string;
  count: number;
  yesResponses: number;
  noResponses: number;
  tentativeResponses: number;
};

type CampaignStats = {
  name: string;
  total: number;
  completed: number;
  completionRate: number;
  responseStats: ResponseStats;
};

type ContactWithResponse = {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  response: string;
  feedback?: string;
  taskTitle: string;
  assignedTo: string;
};

// Define Response Type for the modal
type ResponseType = "Yes" | "No" | "Tentative" | null;

// Add a utility function to export contacts to Excel
const exportToExcel = (contacts: ContactWithResponse[], responseType: ResponseType, campaignName: string) => {
  // Import Excel library dynamically to reduce bundle size
  import('xlsx').then(XLSX => {
    // Format data for Excel
    const worksheet = XLSX.utils.json_to_sheet(
      contacts.map(contact => ({
        'Name': contact.name,
        'Mobile': contact.mobile,
        'Email': contact.email || '',
        'City': contact.city || '',
        'Response': contact.response,
        'Feedback': contact.feedback || '',
        'Task': contact.taskTitle,
        'Assigned To': contact.assignedTo
      }))
    );

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${responseType} Responses`);

    // Generate filename with date
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${responseType}_Responses_${campaignName !== 'all' ? campaignName + '_' : ''}${date}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
  });
};

export default function TaskFeedbackPage() {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [selectedResponseType, setSelectedResponseType] = useState<ResponseType>(null);

  // Main stats query for the overall metrics
  const { data: taskStats, isLoading: isTaskStatsLoading } = useQuery<TaskStats>({
    queryKey: ["/api/task-feedback/stats", timeRange, selectedCampaign],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCampaign !== "all") params.append("campaignName", selectedCampaign);
      params.append("timeRange", timeRange);
      
      const response = await fetch(`/api/task-feedback/stats?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch task statistics");
      }
      
      return response.json();
    },
  });

  // Response stats query
  const { data: responseStats, isLoading: isResponseStatsLoading } = useQuery<ResponseStats>({
    queryKey: ["/api/task-feedback/response-stats", timeRange, selectedCampaign],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCampaign !== "all") params.append("campaignName", selectedCampaign);
      params.append("timeRange", timeRange);
      
      const response = await fetch(`/api/task-feedback/response-stats?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch response statistics");
      }
      
      return response.json();
    },
  });

  // User task stats query
  const { data: userTaskStats, isLoading: isUserTaskStatsLoading } = useQuery<UserTaskStats[]>({
    queryKey: ["/api/task-feedback/user-stats", timeRange, selectedCampaign],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCampaign !== "all") params.append("campaignName", selectedCampaign);
      params.append("timeRange", timeRange);
      
      const response = await fetch(`/api/task-feedback/user-stats?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user task statistics");
      }
      
      return response.json();
    },
  });

  // City stats query
  const { data: cityStats, isLoading: isCityStatsLoading } = useQuery<CityStats[]>({
    queryKey: ["/api/task-feedback/city-stats", timeRange, selectedCampaign],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCampaign !== "all") params.append("campaignName", selectedCampaign);
      params.append("timeRange", timeRange);
      
      const response = await fetch(`/api/task-feedback/city-stats?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch city statistics");
      }
      
      return response.json();
    },
  });

  // Campaign list query
  const { data: campaigns = [], isLoading: isCampaignsLoading } = useQuery<{name: string}[]>({
    queryKey: ["/api/tasks/campaigns/list"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/campaigns/list", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch campaign list");
      }
      
      return response.json();
    },
  });

  // Campaign stats query
  const { data: campaignStats = [], isLoading: isCampaignStatsLoading } = useQuery<CampaignStats[]>({
    queryKey: ["/api/task-feedback/campaign-stats", timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("timeRange", timeRange);
      
      const response = await fetch(`/api/task-feedback/campaign-stats?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch campaign statistics");
      }
      
      return response.json();
    },
    enabled: selectedCampaign === "all", // Only fetch when viewing all campaigns
  });

  // Add new query for contacts by response type
  const { data: contactsByResponse = [], isLoading: isContactsLoading } = useQuery<ContactWithResponse[]>({
    queryKey: ["/api/task-feedback/contacts-by-response", timeRange, selectedCampaign, selectedResponseType],
    queryFn: async () => {
      if (!selectedResponseType) return [];
      
      const params = new URLSearchParams();
      if (selectedCampaign !== "all") params.append("campaignName", selectedCampaign);
      params.append("timeRange", timeRange);
      params.append("responseType", selectedResponseType);
      
      const response = await fetch(`/api/task-feedback/contacts-by-response?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      return response.json();
    },
    enabled: !!selectedResponseType,
  });

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const RESPONSE_COLORS = { yes: '#4ade80', no: '#f87171', tentative: '#facc15' };

  // Format data for the pie chart
  const responseData = responseStats ? [
    { name: 'Yes', value: responseStats.yes },
    { name: 'No', value: responseStats.no },
    { name: 'Tentative', value: responseStats.tentative },
  ] : [];

  // Format data for user completion bar chart
  const userCompletionData = userTaskStats?.sort((a, b) => b.completionRate - a.completionRate) || [];

  // Format data for city distribution
  const cityData = cityStats?.sort((a, b) => b.count - a.count).slice(0, 10) || [];

  // Format modal title based on selected response type
  const getModalTitle = () => {
    switch (selectedResponseType) {
      case "Yes": return "Positive Responses";
      case "No": return "Negative Responses";
      case "Tentative": return "Tentative Responses";
      default: return "Responses";
    }
  };

  // Helper function to get response color
  const getResponseColor = (response: string) => {
    switch (response) {
      case "Yes": return "bg-green-100 text-green-800";
      case "No": return "bg-red-100 text-red-800";
      case "Tentative": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <h1 className="text-2xl font-bold">Task Feedback Dashboard</h1>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.name} value={campaign.name}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="responses">Responses</TabsTrigger>
              <TabsTrigger value="users">Users Performance</TabsTrigger>
              <TabsTrigger value="geography">Geographical Data</TabsTrigger>
              {selectedCampaign === "all" && (
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              )}
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {isTaskStatsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : taskStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Total Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{taskStats.total}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Completed Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{taskStats.completed}</div>
                      <Badge className="mt-2" variant="outline">
                        {taskStats.completionRate}% completed
                      </Badge>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Pending Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">{taskStats.pending}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
                        Completion Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress 
                        value={taskStats.completionRate} 
                        className="h-3" 
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        {taskStats.completed} of {taskStats.total} tasks completed
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No task data available
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Response Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isResponseStatsLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : responseStats ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={responseData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {responseData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    entry.name === 'Yes' 
                                      ? RESPONSE_COLORS.yes 
                                      : entry.name === 'No' 
                                        ? RESPONSE_COLORS.no 
                                        : RESPONSE_COLORS.tentative
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No response data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Top Performing Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isUserTaskStatsLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : userCompletionData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={userCompletionData.slice(0, 5)}
                            margin={{
                              top: 5, right: 30, left: 20, bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="username" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completionRate" name="Completion Rate (%)" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No user performance data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Responses Tab */}
            <TabsContent value="responses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Response Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {isResponseStatsLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : responseStats ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Positive Responses Card - now clickable */}
                      <Card 
                        className="bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => setSelectedResponseType("Yes")}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-green-700">
                            Positive Responses (Yes)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-green-700">{responseStats.yes}</div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-green-600 mt-2">
                              {responseStats.yes > 0 && responseStats ? 
                                `${Math.round((responseStats.yes / (responseStats.yes + responseStats.no + responseStats.tentative)) * 100)}%` : '0%'} of total responses
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResponseType("Yes");
                              }}
                            >
                              View Contacts
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Negative Responses Card - now clickable */}
                      <Card 
                        className="bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setSelectedResponseType("No")}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-red-700">
                            Negative Responses (No)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-red-700">{responseStats.no}</div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-red-600 mt-2">
                              {responseStats.no > 0 && responseStats ? 
                                `${Math.round((responseStats.no / (responseStats.yes + responseStats.no + responseStats.tentative)) * 100)}%` : '0%'} of total responses
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResponseType("No");
                              }}
                            >
                              View Contacts
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Tentative Responses Card - now clickable */}
                      <Card 
                        className="bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
                        onClick={() => setSelectedResponseType("Tentative")}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-yellow-700">
                            Tentative Responses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-yellow-700">{responseStats.tentative}</div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-yellow-600 mt-2">
                              {responseStats.tentative > 0 && responseStats ? 
                                `${Math.round((responseStats.tentative / (responseStats.yes + responseStats.no + responseStats.tentative)) * 100)}%` : '0%'} of total responses
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-yellow-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedResponseType("Tentative");
                              }}
                            >
                              View Contacts
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No response data available
                    </div>
                  )}
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Response Distribution</h3>
                    {isResponseStatsLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : responseStats && (responseStats.yes > 0 || responseStats.no > 0 || responseStats.tentative > 0) ? (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={responseData}
                              cx="50%"
                              cy="50%"
                              labelLine
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              onClick={(data) => {
                                setSelectedResponseType(data.name as ResponseType);
                              }}
                            >
                              {responseData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    entry.name === 'Yes' 
                                      ? RESPONSE_COLORS.yes 
                                      : entry.name === 'No' 
                                        ? RESPONSE_COLORS.no 
                                        : RESPONSE_COLORS.tentative
                                  }
                                  style={{ cursor: 'pointer' }}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend onClick={(entry) => setSelectedResponseType(entry.value as ResponseType)} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No response data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Users Performance Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {isUserTaskStatsLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : userTaskStats && userTaskStats.length > 0 ? (
                    <div className="space-y-8">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={userTaskStats}
                            margin={{
                              top: 5, right: 30, left: 20, bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="username" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="assigned" name="Assigned Tasks" fill="#93c5fd" />
                            <Bar dataKey="completed" name="Completed Tasks" fill="#4ade80" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium mb-4">Task Completion by User</h3>
                        {userTaskStats.map((user) => (
                          <div key={user.username} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span>{user.username}</span>
                              <span className="text-sm font-medium">
                                {user.completionRate}% ({user.completed}/{user.assigned})
                              </span>
                            </div>
                            <Progress value={user.completionRate} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No user performance data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Geography Tab */}
            <TabsContent value="geography" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Geographical Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCityStatsLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : cityStats && cityStats.length > 0 ? (
                    <div className="space-y-8">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            width={500}
                            height={300}
                            data={cityData}
                            margin={{
                              top: 5, right: 30, left: 20, bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="city" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Total Contacts" fill="#93c5fd" />
                            <Bar dataKey="yesResponses" name="Yes Responses" fill={RESPONSE_COLORS.yes} />
                            <Bar dataKey="noResponses" name="No Responses" fill={RESPONSE_COLORS.no} />
                            <Bar dataKey="tentativeResponses" name="Tentative" fill={RESPONSE_COLORS.tentative} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4">Top Cities by Contact Count</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cityData.map((city) => (
                            <Card key={city.city} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{city.city}</h4>
                                  <p className="text-sm text-gray-500">{city.count} contacts</p>
                                </div>
                                <div className="flex gap-2">
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                    Yes: {city.yesResponses}
                                  </Badge>
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                                    No: {city.noResponses}
                                  </Badge>
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                    Tentative: {city.tentativeResponses}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No geographical data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Campaigns Tab */}
            {selectedCampaign === "all" && (
              <TabsContent value="campaigns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isCampaignStatsLoading ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : campaignStats && campaignStats.length > 0 ? (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-4">
                          {campaignStats.map((campaign) => (
                            <Card key={campaign.name} className="p-4">
                              <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium text-lg">{campaign.name}</h3>
                                    <p className="text-sm text-gray-500">
                                      {campaign.completed} of {campaign.total} tasks completed ({campaign.completionRate}%)
                                    </p>
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedCampaign(campaign.name)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                                
                                <Progress value={campaign.completionRate} className="h-2" />
                                
                                <div className="flex gap-2 flex-wrap">
                                  <Badge className="bg-green-100 text-green-800">
                                    Yes Responses: {campaign.responseStats.yes}
                                  </Badge>
                                  <Badge className="bg-red-100 text-red-800">
                                    No Responses: {campaign.responseStats.no}
                                  </Badge>
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    Tentative: {campaign.responseStats.tentative}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                      No campaign data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>

      {/* Contact List Modal */}
      <Dialog open={!!selectedResponseType} onOpenChange={(open) => !open && setSelectedResponseType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={
                selectedResponseType === "Yes" ? "bg-green-100 text-green-800" : 
                selectedResponseType === "No" ? "bg-red-100 text-red-800" : 
                "bg-yellow-100 text-yellow-800"
              }>
                {selectedResponseType}
              </Badge>
              {getModalTitle()}
            </DialogTitle>
            <DialogDescription>
              Contacts who have responded '{selectedResponseType}' to tasks
              {selectedCampaign !== "all" && (
                <span> in the campaign <strong>{selectedCampaign}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          
          {isContactsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contactsByResponse.length > 0 ? (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm text-gray-500">
                  {contactsByResponse.length} contact{contactsByResponse.length !== 1 ? 's' : ''} found
                </h3>
                {/* Add Export Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToExcel(contactsByResponse, selectedResponseType, selectedCampaign)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsByResponse.map((contact) => (
                      <TableRow key={`${contact.id}-${contact.taskTitle}`}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{contact.mobile}</span>
                            </div>
                            {contact.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span className="text-xs">{contact.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contact.city || "Unknown"}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={contact.taskTitle}>
                          {contact.taskTitle}
                        </TableCell>
                        <TableCell>{contact.assignedTo}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="text-sm">
                            <Badge className={getResponseColor(contact.response)}>
                              {contact.response}
                            </Badge>
                            {contact.feedback && (
                              <p className="text-xs mt-1 text-gray-500 line-clamp-2" title={contact.feedback}>
                                {contact.feedback}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No contacts found with '{selectedResponseType}' response
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
