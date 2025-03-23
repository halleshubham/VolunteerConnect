import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Contact, insertFollowUpSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { X } from "lucide-react";
import WhatsAppSender from "../whatsapp/WhatsappSender";

type FollowUpFormProps = {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[]
};

export default function WhatsappForm({ isOpen, onClose, contacts }: FollowUpFormProps) {
 
  const numbers = contacts.map((contact)=>contact.mobile);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Whatsapp Message</DialogTitle>
          <DialogDescription>
            Send Whatsapp Message
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        
        <WhatsAppSender numbers={numbers} />
            {/* <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Follow-up
              </Button>
            </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
