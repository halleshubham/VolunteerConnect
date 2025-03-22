
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/layout/sidebar'
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRoute } from 'wouter';

export default function EventAttendancePage() {
  const [, params] = useRoute<{ id: string }>("/events/:id/attendance");
  
  const id = params?.id ? parseInt(params.id) : null;
  
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    },
  });

  const { data: attendees, isLoading: isAttendeesLoading } = useQuery({
    queryKey: ['event-attendees', id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}/attendees`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
  });

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

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Attendees ({attendees?.length || 0})</h2>
              </div>

              <div className="space-y-4">
                {attendees?.map((attendance: any) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
