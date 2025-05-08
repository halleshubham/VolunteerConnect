import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contact } from "@shared/schema";
import { useState } from "react";

type BulkUpdateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: Contact[];
  onUpdate: (field: string, value: string) => Promise<void>;
};

export function BulkUpdateModal({
  isOpen,
  onClose,
  selectedContacts,
  onUpdate,
}: BulkUpdateModalProps) {
  const [selectedField, setSelectedField] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

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
  };

  const handleUpdate = async () => {
    if (selectedField && selectedValue) {
      await onUpdate(selectedField, selectedValue);
      onClose();
    }
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
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField && (
            <div className="space-y-2">
              <Label>Select New Value</Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${selectedField}`} />
                </SelectTrigger>
                <SelectContent>
                  {fields[selectedField as keyof typeof fields].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate}>Update {selectedContacts.length} Contacts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}