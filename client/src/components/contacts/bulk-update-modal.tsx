import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contact, User } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type BulkUpdateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Contact[];
  onUpdate: (field: string, value: string | string[], updateMode?: string) => Promise<void>;
};

export function BulkUpdateModal({
  isOpen,
  onClose,
  selectedContacts,
  onUpdate,
}: BulkUpdateModalProps) {
  const [selectedField, setSelectedField] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [updateMode, setUpdateMode] = useState<"replace" | "add">("replace");

  // Fetch users for assignedTo field
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: selectedField === "assignedTo",
  });

  // Reset selected values when modal opens or field changes
  useEffect(() => {
    setSelectedValue("");
    setSelectedUsers([]);
  }, [isOpen, selectedField]);

  const fields = {
    category: ["volunteer", "sympathiser", "attendee", "political"],
    priority: ["high", "medium", "low"],
    status: ["active", "inactive", "follow-up"],
    team: [
      "lokayat-general",
      "abhivyakti",
      "mahila-jagar-samiti",
      "congress-party",
      "ncp-party",
      "shivsena-party",
      "other-organisations",
      "congress-jj-shakti",
      "maharashtra-level",
      "sja-maharashtra",
      "sja-teachers-front"
    ],
    occupation: [
      "school-teacher",
      "professor",
      "doctor",
      "lawyer",
      "engineer",
      "worker",
      "retired",
      "student",
      "professional",
      "other",
      "journalist",
      "business",
      "housewife",
    ],
    sex: ["male", "female", "other", "prefer_not_to_say"],
    city: [], // Placeholder - uses text input instead of dropdown
    assignedTo: [], // Will be populated from users query
  };

  const handleUpdate = async () => {
    if (selectedField === "assignedTo" && selectedUsers.length > 0) {
      // For assignedTo, we pass the array of users and the update mode
      await onUpdate(selectedField, selectedUsers, updateMode);
    } else if (selectedField && selectedValue) {
      // For other fields, we pass the single value
      await onUpdate(selectedField, selectedValue);
    }
    onClose();
  };

  const handleUserSelect = (username: string) => {
    if (selectedUsers.includes(username)) {
      setSelectedUsers(selectedUsers.filter(user => user !== username));
    } else {
      setSelectedUsers([...selectedUsers, username]);
    }
  };

  const removeUser = (username: string) => {
    setSelectedUsers(selectedUsers.filter(user => user !== username));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Update Contacts</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Field to Update</Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Choose field" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(fields).map((field) => (
                  <SelectItem key={field} value={field}>
                    {field === "assignedTo" ? "Assigned To" : field.charAt(0).toUpperCase() + field.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField === "assignedTo" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Update Mode</Label>
                <Select value={updateMode} onValueChange={(value) => setUpdateMode(value as "replace" | "add")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select update mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">Replace existing assignments</SelectItem>
                    <SelectItem value="add">Add to existing assignments</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  {updateMode === "replace"
                    ? "This will replace all existing assigned users with your selection."
                    : "This will add your selected users to the existing assignments."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Users to Assign</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map((username) => (
                    <Badge key={username} className="bg-blue-100 text-blue-800 flex items-center">
                      {username}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeUser(username)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {users.map((user) => (
                    <div key={user.username} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.username}`}
                        checked={selectedUsers.includes(user.username)}
                        onCheckedChange={() => handleUserSelect(user.username)}
                      />
                      <label
                        htmlFor={`user-${user.username}`}
                        className="text-sm cursor-pointer"
                      >
                        {user.username}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedField === "city" ? (
            <div className="space-y-2">
              <Label>Enter New City</Label>
              <Input
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                placeholder="Enter city name"
              />
            </div>
          ) : selectedField && selectedField !== "assignedTo" ? (
            <div className="space-y-2">
              <Label>Select New Value</Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${selectedField}`} />
                </SelectTrigger>
                <SelectContent>
                  {fields[selectedField as keyof typeof fields].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleUpdate}
            disabled={(selectedField === "assignedTo" && selectedUsers.length === 0) || 
                     (selectedField !== "assignedTo" && !selectedValue)}
          >
            Update {selectedContacts.length} Contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}