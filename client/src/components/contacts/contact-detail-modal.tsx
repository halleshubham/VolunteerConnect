import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact, FollowUp } from "@shared/schema";
import { User, Phone, Mail, MapPin, Briefcase, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

type ContactDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  contact: Contact | null;
};

export default function ContactDetailModal({
  isOpen,
  onClose,
  onEdit,
  contact,
}: ContactDetailModalProps) {
  const [activeTab, setActiveTab] = useState("events");

  // Reset tab when contact changes
  useEffect(() => {
    if (contact) {
      setActiveTab("events");
    }
  }, [contact]);

  // Fetch contact's event attendance
  const { data: attendanceData = [] } = useQuery<{
    id: number;
    eventId: number;
    contactId: number;
    createdAt: string;
    event: {
      id: number;
      name: string;
      date: string;
      location: string;
      description: string;
    };
  }[]>({
    queryKey: ["/api/contacts", contact?.id, "events"],
    enabled: isOpen && !!contact,
  });

  // Fetch contact's follow-ups
  const { data: followUps = [] } = useQuery<FollowUp[]>({
    queryKey: ["/api/contacts", contact?.id, "followups"],
    enabled: isOpen && !!contact,
  });

  if (!contact) return null;

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogDescription>Detailed information about this contact</DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 pr-0 md:pr-4 mb-6 md:mb-0">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-center flex-col text-center mb-4">
                <div className={`h-24 w-24 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center text-3xl font-medium mb-3`}>
                  {getInitials(contact.name)}
                </div>
                <h2 className="text-xl font-semibold">{contact.name}</h2>
                <p className="text-gray-600 mt-1">{contact.category}</p>
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-gray-900 font-medium">{contact.mobile}</p>
                    <p className="text-xs text-gray-500">Primary</p>
                  </div>
                </div>
                
                {contact.email && (
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{contact.email}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{contact.area}, {contact.city}</p>
                    <p className="text-gray-500">{contact.state}, {contact.nation}</p>
                    {contact.pincode && <p className="text-gray-500">{contact.pincode}</p>}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Additional Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {contact.occupation && (
                    <div>
                      <p className="text-gray-500">Occupation</p>
                      <p className="font-medium">{contact.occupation}</p>
                    </div>
                  )}
                  
                  {contact.sex && (
                    <div>
                      <p className="text-gray-500">Sex</p>
                      <p className="font-medium">{contact.sex}</p>
                    </div>
                  )}
                  
                  {contact.maritalStatus && (
                    <div>
                      <p className="text-gray-500">Marital Status</p>
                      <p className="font-medium">{contact.maritalStatus}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-gray-500">Priority</p>
                    <p className={`font-medium ${
                      contact.priority === 'high' ? 'text-red-600' : 
                      contact.priority === 'medium' ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>
                      {contact.priority}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className={`font-medium ${
                      contact.status === 'active' ? 'text-blue-600' : 
                      contact.status === 'inactive' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {contact.status || 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-2/3">
            <div className="bg-white">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full border-b border-gray-200">
                  <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
                  <TabsTrigger value="followups" className="flex-1">Follow-ups</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="events" className="mt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Event Attendance</h3>
                    <Badge variant="secondary">
                      {attendanceData.length} Events
                    </Badge>
                  </div>
                  {attendanceData.length > 0 ? (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {attendanceData.map((attendance) => (
                          attendance.event && <li key={attendance.id}>
                            <div className="px-4 py-4 flex items-center sm:px-6 border rounded-lg p-4 bg-card">
                              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                  <div className="flex text-sm">
                                    <p className="font-medium text-primary truncate">{attendance.event.name}</p>
                                    <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                                      on <span className="font-medium">{new Date(attendance.event.date).toLocaleDateString()}</span> at {attendance.event.location}
                                    </p>
                                  </div>
                                  
                                </div>
                                <div className="mt-4 flex-shrink-0 sm:mt-0">
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                    Attended
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center text-gray-500">
                        No event attendance records found
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="followups" className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Follow-up Records</h3>
                  {followUps.length > 0 ? (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        {followUps.map((followUp) => (
                          <li key={followUp.id}>
                            <div className="px-4 py-4 flex items-center sm:px-6">
                              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                  <div className="flex text-sm">
                                    <p className="font-medium text-gray-900">{followUp.notes}</p>
                                  </div>
                                  <div className="mt-2 flex">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                      <p>
                                        Due: {followUp.dueDate ? new Date(followUp.dueDate).toLocaleDateString() : 'Not set'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 flex-shrink-0 sm:mt-0">
                                  <Badge 
                                    className={
                                      followUp.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                      followUp.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                    }
                                  >
                                    {followUp.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center text-gray-500">
                        No follow-up records found
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="notes" className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                  <Card>
                    <CardContent className="pt-6">
                      {contact.notes ? (
                        <p className="text-gray-700 whitespace-pre-line">{contact.notes}</p>
                      ) : (
                        <p className="text-center text-gray-500">No notes added for this contact</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit(contact)}>
            Edit Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
