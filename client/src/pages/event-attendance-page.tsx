import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus } from 'lucide-react';
import Sidebar from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRoute, useLocation } from 'wouter';
import { Contact } from '@shared/schema';
import ContactForm from '@/components/contacts/contact-form';
import AttendanceSearch from '@/components/events/attendance-search';
import { useToast } from '@/hooks/use-toast';

export default function EventAttendancePage() {
  const [, params] = useRoute<{ id: string }>("/events/:id/attendance");
  const queryClient = useQueryClient();
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [newContactMobile, setNewContactMobile] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Ensure id is a valid number
  const id = params?.id && !isNaN(parseInt(params.id)) ? parseInt(params.id) : null;
  
  const { data: event, isLoading: isEventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!id) throw new Error('Invalid event ID');
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: attendees, isLoading: isAttendeesLoading } = useQuery({
    queryKey: ['event-attendees', id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!id,
  });

  // Handler for when a contact is found during search
  const handleContactFound = (contact: Contact) => {
    // Contact is found and displayed in the AttendanceSearch component
    // The component will handle adding attendance
  };

  // Handler for when a contact is not found during search
  const handleContactNotFound = (mobile: string) => {
    setNewContactMobile(mobile);
    setIsContactFormOpen(true);
  };

  // Handler for when a contact form is submitted (for new contacts)
  const handleContactSubmit = async (data: any) => {
    // First create the contact
    try {
      const contactResponse = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!contactResponse.ok) {
        throw new Error('Failed to create contact');
      }

      const newContact = await contactResponse.json();

      // Then add attendance for this contact
      if (id) {
        const attendanceResponse = await fetch(`/api/events/${id}/attendees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: newContact.id,
          }),
        });

        if (!attendanceResponse.ok) {
          throw new Error('Failed to add attendance');
        }
      }

      // Refetch attendees to update the list
      queryClient.invalidateQueries(['event-attendees', id]);
      setIsContactFormOpen(false);
      
    } catch (error) {
      console.error('Error submitting contact form:', error);
    }
  };

  // Handler for when attendance is successfully added
  const handleAttendanceAdded = () => {
    queryClient.invalidateQueries(['event-attendees', id]);
  };

  // Handle error cases and redirect if necessary
  useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "Invalid event ID. Redirecting to events page.",
        variant: "destructive",
      });
      navigate("/events");
      return;
    }

    if (eventError) {
      toast({
        title: "Error",
        description: "Could not load event. Redirecting to events page.",
        variant: "destructive",
      });
      navigate("/events");
    }
  }, [id, eventError, navigate, toast]);

  if (isEventLoading || isAttendeesLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
            <p className="text-gray-500 mt-2">
              {new Date(event.date).toLocaleDateString()} at {event.location}
            </p>
          </div>
          
          {/* Attendance Search */}
          <div className="mb-6">
            <AttendanceSearch 
              eventId={id || 0}
              onContactFound={handleContactFound}
              onContactNotFound={handleContactNotFound}
              onAttendanceAdded={handleAttendanceAdded}
            />
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Attendees ({attendees?.length || 0})</h2>
              </div>

              <div className="space-y-4">
                {attendees?.length > 0 ? (
                  attendees.map((attendance: any) => (
                    <div key={attendance.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <h3 className="font-medium">{attendance.contact.name}</h3>
                        <p className="text-sm text-gray-500">{attendance.contact.mobile}</p>
                        <p className="text-sm text-gray-500">{attendance.contact.city}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{attendance.contact.category}</Badge>
                        <Badge variant="outline">{attendance.contact.priority}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No attendees recorded yet. Use the search above to add attendees.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Form Modal for new contacts */}
      <ContactForm
        isOpen={isContactFormOpen}
        onClose={() => setIsContactFormOpen(false)}
        onSubmit={handleContactSubmit}
        initialMobile={newContactMobile}
      />
    </div>
  );
}
