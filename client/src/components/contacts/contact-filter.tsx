import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Event } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export type FilterValues = {
  search: string;
  category: string;
  priority: string;
  location: string;
  eventId: string;
  status: string;
  occupation: string,
  assignedTo: string,
  team: string
};

type ContactFilterProps = {
  onFilterChange: (filters: FilterValues) => void;
};

export default function ContactFilter({ onFilterChange }: ContactFilterProps) {
  const {user} = useAuth();
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "",
    priority: "",
    location: "",
    eventId: "",
    status: "",
    occupation: "",
    assignedTo: "",
    team: ""
  });

  // Fetch events for the event filter dropdown
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: cities = [] } = useQuery<string[]>({
    queryKey: ["/api/contacts/cities"],
    queryFn: async () => {
      const res = await fetch("/api/contacts/cities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cities");
      return res.json();
    },
  });
  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [filters, onFilterChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      priority: "",
      location: "",
      eventId: "",
      status: "",
      occupation: "",
      assignedTo: "",
      team: ""
    });
    onFilterChange({
      search: "",
      category: "",
      priority: "",
      location: "",
      eventId: "",
      status: "",
      occupation:"",
      assignedTo: "",
      team: ""
    });
  };

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="p-4">
        <div className="grid grid-cols-1 gap-y-4 md:grid-cols-4 md:gap-x-4">
          <div className="md:col-span-1">
            <Label htmlFor="search">Search</Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                name="search"
                id="search"
                className="pl-10"
                placeholder="Search contacts..."
                value={filters.search}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {user?.role == 'admin' && <div className="md:col-span-1">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                name="assignedTo"
                id="assignedTo"
                className="pl-10"
                placeholder="Search Assignment..."
                value={filters.assignedTo}
                onChange={handleInputChange}
              />
            </div>
          </div>}
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleSelectChange("category", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="donor">Donor</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="attendee">Attendee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="team">Team</Label>
            <Select
              value={filters.team || 'all'}
              onValueChange={(value) => handleSelectChange("team", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="lokayat-general">Lokayat General</SelectItem>
                <SelectItem value="abhivyakti">Abhivyakti</SelectItem>
                <SelectItem value="mahila-jagar-samiti">Mahila Jagar Samiti</SelectItem>
                <SelectItem value="congress-party">Congress Party</SelectItem>
                <SelectItem value="ncp-party">NCP Party</SelectItem>
                <SelectItem value="shivsena-party">Shivsena Party</SelectItem>
                <SelectItem value="other-organisations">Other Organisations</SelectItem>
                <SelectItem value="congress-jj-shakti">Congress (Jai Jawan / Shakti)</SelectItem>
                <SelectItem value="maharashtra-level">Maharashtra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) => handleSelectChange("priority", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="location">Location</Label>
            <Select
              value={filters.location}
              onValueChange={(value) => handleSelectChange("location", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="occupation">Occupation</Label>
            <Select
              value={filters.occupation}
              onValueChange={(value) => handleSelectChange("occupation", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Occupations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Occupations</SelectItem>
                <SelectItem value="school teacher">School Teacher</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="lawyer">Lawyer</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="eventId">Event</Label>
            <Select
              value={filters.eventId}
              onValueChange={(value) => handleSelectChange("eventId", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleSelectChange("status", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
