import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, Contact, FollowUp, insertActivitySchema, insertFollowUpSchema, Task, TaskFeedback } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ContactForm from "@/components/contacts/contact-form";
import FollowUpForm from "@/components/contacts/follow-up-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Plus, 
  Clock, 
  Loader2,
  CheckCircle2,
  Building,
  Briefcase,
  Users,
  Flag,
  Heart,
  Hash,
  UserCircle2,
  Globe
} from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import ActivityForm from "@/components/contacts/activity-form";

export default function ContactDetailPage() {
  const [, params] = useRoute<{ id: string }>("/contacts/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isFollowUpFormOpen, setIsFollowUpFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");

  const {user} = useAuth();

  const contactId = params?.id ? parseInt(params.id) : null;

  // Fetch contact's feedbacks
  const { 
    data: taskFeedbacks = [], 
    isLoading: isTaskFeedbacksLoading 
  } = useQuery<(TaskFeedback & { task: Task })[]>({
    queryKey: [`/api/contacts/${contactId}/tasks`],
    enabled: !!contactId,
  });

  // Fetch contact details
  const { 
    data: contact, 
    isLoading: isContactLoading, 
    error: contactError 
  } = useQuery<Contact>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId,
  });

  // Fetch contact's event attendance
  const { 
    data: attendance = [], 
    isLoading: isAttendanceLoading 
  } = useQuery<any[]>({
    queryKey: [`/api/contacts/${contactId}/events`],
    enabled: !!contactId,
  });

  // Fetch contact's follow-ups
  const { 
    data: followUps = [], 
    isLoading: isFollowUpsLoading 
  } = useQuery<FollowUp[]>({
    queryKey: [`/api/contacts/${contactId}/followups`],
    enabled: !!contactId,
  });

  // Add follow-up mutation
  const addFollowUpMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertFollowUpSchema>) => {
      const res = await apiRequest("POST", `/api/contacts/${contactId}/followups`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/followups`] });
      toast({
        title: "Follow-up added",
        description: "The follow-up has been added successfully.",
      });
      setIsFollowUpFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add follow-up: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fetch contact's activities
const { 
  data: activities = [], 
  isLoading: isActivitiesLoading 
} = useQuery<Activity[]>({
  queryKey: [`/api/contacts/${contactId}/activities`],
  enabled: !!contactId,
});

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertActivitySchema>) => {
      const res = await apiRequest("POST", `/api/contacts/${contactId}/activities`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/activities`] });
      toast({
        title: "Activity added",
        description: "The activity has been added successfully.",
      });
      setIsActivityFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });


  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await apiRequest("PUT", `/api/contacts/${contactId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}`] });
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
      });
      setIsContactFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle contact update
  const handleContactUpdate = (data: Partial<Contact>) => {
    if (contactId) {
      updateContactMutation.mutate(data);
    }
  };

  // Handle follow-up submit
  const handleFollowUpSubmit = (data: z.infer<typeof insertFollowUpSchema>) => {
    if (contactId) {
      addFollowUpMutation.mutate({
        ...data,
        contactId,
      });
    }
  };

    // Handle activity submit
    const handleActivitySubmit = (data: z.infer<typeof insertActivitySchema>) => {
      if (contactId) {
        addActivityMutation.mutate({
          ...data,
          contactId,
        });
      }
    };

  // Handle back button
  const handleBack = () => {
    navigate("/contacts");
  };

  // Redirect if error or invalid ID
  useEffect(() => {
    if (contactError || (!isContactLoading && !contact)) {
      toast({
        title: "Error",
        description: "Contact not found. Redirecting to contacts page.",
        variant: "destructive",
      });
      navigate("/contacts");
    }
  }, [contactError, isContactLoading, contact, navigate, toast]);

  // Loading state
  if (isContactLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Not found state
  if (!contact) {
    return null; // Will redirect from useEffect
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar background color
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-primary/10 text-primary",
      "bg-secondary/10 text-secondary",
      "bg-accent/10 text-accent",
      "bg-green-100 text-green-700",
    ];
    const hash = name.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Contact Details" onOpenSidebar={() => {}} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Back button */}
          <Button 
            variant="outline" 
            onClick={handleBack} 
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Contact Information Card */}
            <div className="w-full lg:w-1/3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold">Contact Information</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsContactFormOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Profile avatar and name section */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className={`h-24 w-24 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center text-3xl font-medium mb-3`}>
                      {getInitials(contact.name)}
                    </div>
                    <h2 className="text-2xl font-semibold">{contact.name}</h2>
                    <div className="flex items-center mt-1">
                      <Badge 
                        className={`
                          ${contact.category === 'volunteer' 
                            ? 'bg-green-100 text-green-800' 
                            : contact.category === 'donor' 
                            ? 'bg-purple-100 text-purple-800'
                            : contact.category === 'partner'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                          } 
                          capitalize
                        `}
                      >
                        {contact.category}
                      </Badge>
                      <Badge 
                        className={`
                          ml-2
                          ${contact.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : contact.priority === 'medium' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                          } 
                          capitalize
                        `}
                      >
                        {contact.priority} priority
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Contact information */}
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Contact Details</h3>
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="flex items-start">
                        <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <a href={`tel:${contact.mobile}`}>
                          <div>
                            <p className="text-sm text-gray-500">Mobile</p>
                            <p className="font-medium">{contact.countryCode || '+91'} {contact.mobile}</p>
                          </div>
                        </a>
                      </div>
                      
                      {/* Email */}
                      {contact.email && (
                        <div className="flex items-start">
                          <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{contact.email}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Address */}
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{contact.area}</p>
                          <p>{contact.city}, {contact.state}</p>
                          <p>{contact.nation} {contact.pincode}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Personal information */}
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Personal Information</h3>
                    <div className="space-y-4">
                      {/* Sex */}
                      {contact.sex && (
                        <div className="flex items-start">
                          <UserCircle2 className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Gender</p>
                            <p className="font-medium capitalize">{contact.sex}</p>
                          </div>
                        </div>
                      )}

                      {/* Marital Status */}
                      {contact.maritalStatus && (
                        <div className="flex items-start">
                          <div className="h-5 w-5 text-gray-500 mr-3 mt-0.5"> </div>
                          <div>
                            <p className="text-sm text-gray-500">Marital Status</p>
                            <p className="font-medium capitalize">{contact.maritalStatus}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Professional information */}
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Professional Information</h3>
                    <div className="space-y-4">
                      {/* Occupation */}
                      {contact.occupation && (
                        <div className="flex items-start">
                          <Briefcase className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Occupation</p>
                            <p className="font-medium">{contact.occupation}</p>
                          </div>
                        </div>
                      )}

                      {/* Organization */}
                      {contact.organisation && (
                        <div className="flex items-start">
                          <Building className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Organisation</p>
                            <p className="font-medium">{contact.organisation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Volunteer/Assignment information */}
                  {(contact.team || (contact.assignedTo && contact.assignedTo.length > 0)) && (
                    <div className="border-t border-gray-200 mt-4 pt-4">
                      <h3 className="font-medium text-gray-800 mb-3">Assignment Information</h3>
                      <div className="space-y-4">
                        {/* Team */}
                        {contact.team && (
                          <div className="flex items-start">
                            <Users className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Team</p>
                              <p className="font-medium">{contact.team}</p>
                            </div>
                          </div>
                        )}

                        {/* Assigned To */}
                        {contact.assignedTo && contact.assignedTo.length > 0 && (
                          <div className="flex items-start">
                            <User className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500">Assigned To</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {contact.assignedTo.map((person, index) => (
                                  <Badge key={index} variant="outline" className="bg-gray-100">
                                    {person}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status information */}
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Status</h3>
                    <div className="space-y-4">
                      {/* Status */}
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Current Status</p>
                          <Badge 
                            className={`
                              ${contact.status === 'active' 
                                ? 'bg-blue-100 text-blue-800' 
                                : contact.status === 'inactive' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                              } 
                              capitalize
                            `}
                          >
                            {contact.status || 'Active'}
                          </Badge>
                        </div>
                      </div>

                      {/* Created At */}
                      {contact.createdAt && (
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Added On</p>
                            <p className="font-medium">{new Date(contact.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {contact.notes && (
                    <div className="border-t border-gray-200 mt-4 pt-4">
                      <div className="flex items-start">
                        <Hash className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Notes</p>
                          <p className="text-gray-700 whitespace-pre-line">{contact.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Tabs Section */}
            <div className="w-full lg:w-2/3">
              <Card>
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="overflow-x-auto">
                      <TabsList className="w-full min-w-[600px] rounded-none border-b border-gray-200">
                        <TabsTrigger value="tasks" className="flex-1">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Call Feedbacks
                        </TabsTrigger>
                        <TabsTrigger value="activities" className="flex-1">
                          <Clock className="h-4 w-4 mr-2" />
                          Activities
                        </TabsTrigger>
                        <TabsTrigger value="followups" className="flex-1">
                          <Clock className="h-4 w-4 mr-2" />
                          Follow-ups
                        </TabsTrigger>
                        <TabsTrigger value="events" className="flex-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          Events
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="events" className="p-4 pt-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Event Attendance</h3>
                        {isAttendanceLoading ? (
                          <div className="text-center py-4">Loading...</div>
                        ) : attendance?.length > 0 ? (
                          <div className="space-y-4">
                            {attendance.map((record) => (
                              <Card key={record.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium">{record.event.name}</h4>
                                      <p className="text-sm text-gray-500">
                                        {new Date(record.event.date).toLocaleDateString()}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {record.event.location}
                                      </p>
                                    </div>
                                    <Badge>Attended</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No events attended
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="activities" className="p-4 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Activity Records</h3>
                        <Button onClick={() => setIsActivityFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Activity
                        </Button>
                      </div>

                      {isActivitiesLoading ? (
                        <div className="text-center py-4">Loading...</div>
                      ) : activities?.length > 0 ? (
                        <div className="space-y-4">
                          {activities.map((activity) => (
                            <Card key={activity.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Badge>{activity.title}</Badge>
                                      <span className="text-sm text-gray-500">
                                        {new Date(activity.createdAt).toLocaleDateString()} by {user?.role === 'admin' ? activity?.createdBy : "You"}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-line">{activity.notes}</p>
                                    {activity.activityDate && (
                                      <p className="text-sm text-gray-500">
                                        Activity Date: {new Date(activity.activityDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No activity records
                        </div>
                      )}
                    </TabsContent>


                    <TabsContent value="followups" className="p-4 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Follow-up Records</h3>
                        <Button onClick={() => setIsFollowUpFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Follow-up
                        </Button>
                      </div>
                      
                                            
                      {isFollowUpsLoading ? (
                        <div className="text-center py-4">Loading...</div>
                      ) : followUps?.length > 0 ? (
                        <div className="space-y-4">
                          {followUps.map((followUp) => (
                            <Card key={followUp.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Badge>{followUp.status}</Badge>
                                      <span className="text-sm text-gray-500">
                                        {new Date(followUp.createdAt).toLocaleDateString()} by {user?.role=='admin' ? followUp?.createdBy : "You"}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-line">{followUp.notes}</p>
                                    {followUp.dueDate && (
                                      <p className="text-sm text-gray-500">
                                        Due: {new Date(followUp.dueDate).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No follow-up records
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="tasks" className="p-4 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Call Update</h3>
                      </div>
                      
                      {isTaskFeedbacksLoading ? (
                        <div className="text-center py-4">Loading...</div>
                      ) : taskFeedbacks?.length > 0 ? (
                        <div className="space-y-4">
                          {taskFeedbacks.map((feedback) => (
                            <Card key={feedback.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium">{feedback.task.title}</h4>
                                      <Badge variant={feedback.isCompleted ? "success" : "secondary"}>
                                        {feedback.isCompleted ? "Completed" : "Pending"}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                      Assigned to: {feedback.assignedTo}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Due: {new Date(feedback.task.dueDate).toLocaleDateString()}
                                    </p>
                                    {feedback.feedback && (
                                      <div className="mt-2">
                                        <p className="text-sm text-gray-500">Feedback:</p>
                                        <p className="text-gray-700 whitespace-pre-line mt-1">
                                          {feedback.feedback}
                                        </p>
                                      </div>
                                    )}
                                    {feedback.completedAt && (
                                      <p className="text-sm text-gray-500">
                                        Completed on: {new Date(feedback.completedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No tasks assigned
                        </div>
                      )}
                    </TabsContent>

                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      
      {/* Contact Edit Form */}
      {contact && (
        <ContactForm 
          isOpen={isContactFormOpen}
          onClose={() => setIsContactFormOpen(false)}
          onSubmit={handleContactUpdate}
          contact={contact}
        />
      )}
      
      {/* Follow-up Form */}
      <FollowUpForm 
        isOpen={isFollowUpFormOpen}
        onClose={() => setIsFollowUpFormOpen(false)}
        onSubmit={handleFollowUpSubmit}
      />

      {/* Follow-up Form */}
      <ActivityForm 
        isOpen={isActivityFormOpen}
        onClose={() => setIsActivityFormOpen(false)}
        onSubmit={handleActivitySubmit}
      />
    </div>
  );
}
