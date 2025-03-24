import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contact, User } from "@shared/schema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Contact[];
  onSubmit: (data: {
    title: string;
    description: string;
    dueDate: Date;
    tags: string[];
    assignedTo: string;
  }) => void;
  onUserSelect?: (username: string) => void;
  isContactsLoading?: boolean;
}

export function TaskAssignmentModal({
  isOpen,
  onClose,
  selectedContacts,
  onSubmit,
  onUserSelect,
  isContactsLoading = false,
}: TaskAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [tags, setTags] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("");

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate || !assignedTo) return;

    onSubmit({
      title,
      description,
      dueDate,
      tags: tags.split(",").map(t => t.trim()),
      assignedTo,
    });
  };

  const handleAssignedToChange = (value: string) => {
    setAssignedTo(value);
    onUserSelect?.(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b pb-4">
          <DialogTitle>Assign New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
              />
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(!dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div>
              <Label>Assign To</Label>
              <Select 
                value={assignedTo} 
                onValueChange={handleAssignedToChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.username} value={user.username}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4">
              <Label className="mb-2 block">Selected Contacts ({selectedContacts.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {isContactsLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
                  </div>
                ) : selectedContacts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No contacts available for selected user
                  </div>
                ) : (
                  selectedContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.city} • {contact.mobile}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Assign Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}