import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from '@/lib/queryClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PredefinedActivity {
  name: string;
  date?: Date;
}

interface User {
  id: number;
  username: string;
  role: string;
  mobile?: string;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState(['volunteer', 'activist', 'political-party', 'sympethiser']);
  const [priorities, setPriorities] = useState(['high', 'medium', 'low', 'to-be-decided']);
  const [statuses, setStatuses] = useState(['active', 'inactive', 'follow-up']);
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newActivityDate, setNewActivityDate] = useState<Date>();
  const [activitySearch, setActivitySearch] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const {toast} = useToast();

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery<PredefinedActivity[]>({
    queryKey: ['/api/settings/activities'],
    queryFn: async () => {
      const response = await fetch('/api/settings/activities', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    }
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery<User[]>({
    queryKey: ['/api/settings/users'],
    queryFn: async () => {
      const response = await fetch('/api/settings/users', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: { name: string; date?: string }) => {
      const response = await fetch('/api/settings/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          date: data.date ? new Date(data.date).toISOString() : null
        })
      });
      if (!response.ok) throw new Error('Failed to create activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/activities'] });
      setNewActivity('');
      setNewActivityDate(undefined);
      toast({
        title: "Activity created",
        description: "The activity has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string }) => {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/users'] });
      setNewUsername('');
      setNewPassword('');
      setNewRole('');
      setIsAddUserDialogOpen(false);
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/settings/activities/${name}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete activity');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/activities'] });
      toast({
        title: "Activity deleted",
        description: "The activity has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await fetch(`/api/settings/users/${username}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/users'] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAdd = (type: 'category' | 'priority' | 'status', value: string) => {
    if (!value.trim()) return;
    
    switch (type) {
      case 'category':
        setCategories([...categories, value.trim()]);
        setNewCategory('');
        break;
      case 'priority':
        setPriorities([...priorities, value.trim()]);
        setNewPriority('');
        break;
      case 'status':
        setStatuses([...statuses, value.trim()]);
        setNewStatus('');
        break;
    }
  };

  const handleRemove = (type: 'category' | 'priority' | 'status', value: string) => {
    switch (type) {
      case 'category':
        setCategories(categories.filter(c => c !== value));
        break;
      case 'priority':
        setPriorities(priorities.filter(p => p !== value));
        break;
      case 'status':
        setStatuses(statuses.filter(s => s !== value));
        break;
    }
  };

  const handleAddActivity = () => {
    if (!newActivity.trim()) return;
    
    createActivityMutation.mutate({
      name: newActivity.trim(),
      date: newActivityDate?.toISOString()
    });
  };

  const handleRemoveActivity = (activityName: string) => {
    deleteActivityMutation.mutate(activityName);
  };

  const handleCreateUser = () => {
    if (!newUsername || !newPassword || !newRole) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createUserMutation.mutate({
      username: newUsername,
      password: newPassword,
      role: newRole
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Predefined Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input form */}
              <div className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input 
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Activity name"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !newActivityDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newActivityDate ? format(newActivityDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newActivityDate}
                        onSelect={setNewActivityDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleAddActivity}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search activities..."
                  className="pl-10"
                />
              </div>

              {/* Activities table */}
              <div className="border rounded-lg">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Activity Name</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isActivitiesLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : activities
                          .filter(activity => 
                            activity.name.toLowerCase().includes(activitySearch.toLowerCase())
                          )
                          .map(activity => (
                            <TableRow key={activity.name}>
                              <TableCell className="font-medium">{activity.name}</TableCell>
                              <TableCell>
                                {activity.date ? format(new Date(activity.date), "PPP") : "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveActivity(activity.name)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Username"
                    />
                    <Input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password"
                    />
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="viewonly">viewonly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={createUserMutation.isPending}
                      className="w-full"
                    >
                      {createUserMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isUsersLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.mobile || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUserMutation.mutate(user.username)}
                            disabled={deleteUserMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
