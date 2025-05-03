import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Contact } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
}

export function CreateCampaignModal({ open, onClose, contacts }: CreateCampaignModalProps) {
  const { toast } = useToast();
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());

  // Get unique assignedTo users from the contacts
  const assignedToUsers = Array.from(
    new Set(
      contacts
        .flatMap(contact => contact.assignedTo || [])
        .filter(Boolean)
    )
  );

  // Create mutation for campaign creation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      dueDate: string;
      contactDistribution: Record<string, Contact[]>;
    }) => {
      return await apiRequest("POST", "/api/campaigns", data);
    },
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: "Campaign tasks have been created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error creating campaign",
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setCampaignName("");
    setDescription("");
    setDueDate(new Date());
    onClose();
  };

  const handleSubmit = () => {
    if (!campaignName) {
      toast({
        variant: "destructive",
        title: "Campaign name is required",
      });
      return;
    }

    if (!dueDate) {
      toast({
        variant: "destructive",
        title: "Due date is required",
      });
      return;
    }

    // Create contact distribution - assign contacts to their first assignedTo user
    const contactDistribution: Record<string, Contact[]> = {};
    assignedToUsers.forEach(user => {
      contactDistribution[user] = [];
    });

    contacts.forEach(contact => {
      if (contact.assignedTo && contact.assignedTo.length > 0) {
        const firstUser = contact.assignedTo[0];
        contactDistribution[firstUser] = [...(contactDistribution[firstUser] || []), contact];
      }
    });

    // Filter out users with no contacts
    const finalDistribution: Record<string, Contact[]> = {};
    Object.entries(contactDistribution).forEach(([user, userContacts]) => {
      if (userContacts.length > 0) {
        finalDistribution[user] = userContacts;
      }
    });

    createCampaignMutation.mutate({
      name: campaignName,
      description,
      dueDate: dueDate.toISOString(),
      contactDistribution: finalDistribution,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter campaign description"
              rows={3}
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
            <p className="text-sm text-gray-500 mt-2">
              {contacts.length} contacts will be distributed among {Object.keys(assignedToUsers).length} users.
            </p>
            <p className="text-xs text-gray-400">
              Each contact will be assigned to the first user in their assignedTo list.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            disabled={createCampaignMutation.isPending} 
            onClick={handleSubmit}
          >
            {createCampaignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Campaign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
