import { useState } from "react";
import { Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AttendanceSearchProps {
  eventId: number;
  onContactFound: (contact: Contact) => void;
  onContactNotFound: (mobile: string) => void;
  onAttendanceAdded: () => void;
}

export default function AttendanceSearch({
  eventId,
  onContactFound,
  onContactNotFound,
  onAttendanceAdded,
}: AttendanceSearchProps) {
  const { toast } = useToast();
  const [mobile, setMobile] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundContact, setFoundContact] = useState<Contact | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSearch = async () => {
    // Validate input
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast({
        title: "Invalid mobile number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search for contact by mobile number
      const response = await fetch(`/api/contacts/search?mobile=${cleanMobile}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to search for contact");
      }
      
      const data = await response.json();
      if (data) {
        // Contact found
        setFoundContact(data);
        onContactFound(data);
      } else {
        // Contact not found
        setFoundContact(null);
        onContactNotFound(cleanMobile);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search for contact",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAttendance = async () => {
    if (!foundContact) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId: foundContact.id,
        }),
      });

      if (response.ok) {
        toast({
          title: "Attendance recorded",
          description: `${foundContact.name} has been marked as attending this event.`,
        });
        setFoundContact(null);
        setMobile("");
        onAttendanceAdded();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to add attendance");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add attendance",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-medium mb-4">Add Attendance</h3>
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Enter 10-digit mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          maxLength={10}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? (
            "Searching..."
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {foundContact && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium">{foundContact.name}</h4>
              <p className="text-sm text-gray-500">{foundContact.mobile}</p>
              <div className="flex gap-2 mt-1">
                <Badge>{foundContact.category}</Badge>
                <Badge variant="outline">{foundContact.priority}</Badge>
              </div>
            </div>
            <Button onClick={handleAddAttendance} disabled={isAdding}>
              {isAdding ? "Adding..." : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark Present
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
