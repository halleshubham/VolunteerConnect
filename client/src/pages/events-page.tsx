import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Event, insertEventSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import EventTable from "@/components/events/event-table";
import EventForm from "@/components/events/event-form";
import EventImportModal from "@/components/events/event-import-modal";
import FollowupImportModal from "@/components/events/followup-import-modal";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarPlus, FileUp, FileDown, ListChecks } from "lucide-react";
import { z } from "zod";

export default function EventsPage() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFollowupImportModalOpen, setIsFollowupImportModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertEventSchema>) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event added",
        description: "The event has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsEventFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof insertEventSchema> }) => {
      const res = await apiRequest("PUT", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event updated",
        description: "The event has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsEventFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleEventSubmit = (data: z.infer<typeof insertEventSchema>) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEventFormOpen(true);
  };

  // Handle add new event
  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsEventFormOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Event Management" onOpenSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Action Bar */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">All Events</h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button 
                  onClick={handleAddEvent}
                  className="inline-flex items-center"
                >
                  <CalendarPlus className="-ml-1 mr-2 h-5 w-5" />
                  Add Event
                </Button>
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <FileUp className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Import Registrations
                </Button>
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                  onClick={() => setIsFollowupImportModalOpen(true)}
                >
                  <ListChecks className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Import Follow-ups
                </Button>
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                >
                  <FileDown className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Export
                </Button>
              </div>
            </div>
          </div>
          
          {/* Events Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <EventTable 
              events={events} 
              onEdit={handleEditEvent}
            />
          )}
        </main>
      </div>
      
      {/* Event Form Modal */}
      <EventForm 
        isOpen={isEventFormOpen}
        onClose={() => setIsEventFormOpen(false)}
        onSubmit={handleEventSubmit}
        event={selectedEvent}
      />
      
      {/* Import Modal */}
      <EventImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        events={events}
      />
      
      {/* Follow-up Import Modal */}
      <FollowupImportModal 
        isOpen={isFollowupImportModalOpen}
        onClose={() => setIsFollowupImportModalOpen(false)}
        events={events}
      />
    </div>
  );
}
