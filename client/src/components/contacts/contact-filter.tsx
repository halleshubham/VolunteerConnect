import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Event } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export type FilterValues = {
  search: string;
  category: string;
  priority: string;
  location: string;
  eventId: string;
  status: string;
  occupation: string;
  assignedTo: string;
  team: string;
};

type ContactFilterProps = {
  onFilterChange: (filters: FilterValues) => void;
};

export default function ContactFilter({ onFilterChange }: ContactFilterProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "",
    priority: "",
    location: "",
    eventId: "",
    status: "",
    occupation: "",
    assignedTo: "",
    team: "",
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (filters.assignedTo) {
      setSelectedUsers(filters.assignedTo.split(',').filter(Boolean));
    } else {
      setSelectedUsers([]);
    }
  }, []);

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

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      if (user?.role !== 'admin') return [];
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === 'admin',
  });

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

  const handleAddUser = (username: string) => {
    if (username && !selectedUsers.includes(username)) {
      const newSelectedUsers = [...selectedUsers, username];
      setSelectedUsers(newSelectedUsers);

      const newAssignedToFilter = newSelectedUsers.join(',');
      handleSelectChange('assignedTo', newAssignedToFilter);
    }
  };

  const handleRemoveUser = (username: string) => {
    const newSelectedUsers = selectedUsers.filter(u => u !== username);
    setSelectedUsers(newSelectedUsers);

    const newAssignedToFilter = newSelectedUsers.join(',');
    handleSelectChange('assignedTo', newAssignedToFilter);
  };

  const clearFilters = () => {
    const resetFilters = {
      search: "",
      category: "",
      priority: "",
      location: "",
      eventId: "",
      status: "",
      occupation: "",
      assignedTo: "",
      team: "",
    };
    setFilters(resetFilters);
    setSelectedUsers([]);
    onFilterChange(resetFilters);
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
          {user?.role === 'admin' && (
            <div className="md:col-span-1">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <div className="mt-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map((username) => (
                    <div
                      key={username}
                      className="bg-blue-100 text-blue-800 text-xs rounded-full px-3 py-1 flex items-center"
                    >
                      {username}
                      <button
                        onClick={() => handleRemoveUser(username)}
                        className="ml-1.5 rounded-full hover:bg-blue-200 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Select
                  onValueChange={(value) => {
                    if (value && value !== "placeholder") {
                      handleAddUser(value);
                    }
                  }}
                  onOpenChange={(open) => {
                    setIsDropdownOpen(open);
                    if (open) {
                      const selectTrigger = document.querySelector("#assignedTo-trigger") as HTMLElement;
                      if (selectTrigger) {
                        const valueContainer = selectTrigger.querySelector("[data-value]");
                        if (valueContainer) {
                          valueContainer.textContent = "Select user...";
                        }
                      }
                    }
                  }}
                  value="placeholder"
                >
                  <SelectTrigger id="assignedTo-trigger" className="w-full">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Select user...</SelectItem>
                    {Array.isArray(users) && users
                      .filter((u) => u && u.username && !selectedUsers.includes(u.username))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
                <SelectItem value="political-party">Political Party</SelectItem>
                <SelectItem value="activist">Activist</SelectItem>
                <SelectItem value="sympethiser">Sympethiser</SelectItem>
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
                <SelectItem value="sja-maharashtra">SJA Maharashtra</SelectItem>
                <SelectItem value="sja-teachers-front">SJA Teachers Front</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => handleSelectChange("priority", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High (P0/P1)</SelectItem>
                <SelectItem value="medium">Medium (P2)</SelectItem>
                <SelectItem value="low">Low (P3)</SelectItem>
                <SelectItem value="to-be-decided">To Be Decided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Select
              value={filters.location || 'all'}
              onValueChange={(value) => handleSelectChange("location", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {cities.filter((city) => city && city.trim()).map((city) => (
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
              value={filters.occupation || 'all'}
              onValueChange={(value) => handleSelectChange("occupation", value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Occupations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Occupations</SelectItem>
                <SelectItem value="school-teacher">School Teacher</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="lawyer">Lawyer</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="housewife">Housewife</SelectItem>
                <SelectItem value="journalist">Journalist</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="eventId">Event</Label>
            <Select
              value={filters.eventId || 'all'}
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
              value={filters.status || 'all'}
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
