import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Contact, insertContactSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useEffect } from "react";

// Create a contact form type that handles all the field types correctly
type ContactFormData = {
  id?: number;
  name: string;
  mobile: string;
  email: string;
  area: string;
  city: string;
  state: string;
  nation: string;
  priority: string;
  category: string;
  status: string;
  occupation: string;
  sex?: string;
  maritalStatus?: string;
  pincode: string;
  notes: string;
  createdAt?: Date;
  team?: string,
  assignedTo: string[]
};

// Extended schema with validation
const formSchema = insertContactSchema.extend({
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  pincode: z.string().max(10, "Pincode cannot exceed 10 characters").optional().or(z.literal("")),
});

// Convert the schema to match our ContactFormData type
type FormSchemaType = z.infer<typeof formSchema>;

type ContactFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  contact?: Contact;
};

export default function ContactForm({ isOpen, onClose, onSubmit, contact }: ContactFormProps) {
  // Helper function to convert Contact to ContactFormData
  const mapContactToFormData = (contact: Contact): ContactFormData => ({
    id: contact.id,
    name: contact.name,
    mobile: contact.mobile,
    email: contact.email ?? "",
    area: contact.area,
    city: contact.city,
    state: contact.state,
    nation: contact.nation,
    priority: contact.priority,
    category: contact.category,
    status: contact.status ?? "active",
    occupation: contact.occupation ?? "",
    sex: contact.sex ?? undefined,
    maritalStatus: contact.maritalStatus ?? undefined,
    pincode: contact.pincode ?? "",
    notes: contact.notes ?? "",
    createdAt: contact.createdAt ?? undefined,
    team: contact.team ?? "",
    assignedTo: contact.assignedTo ?? [""]
  });
  
  // Initialize form with default values or contact data for editing
    // Initialize form with default values or contact data for editing
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: contact?.name || "",
      mobile: contact?.mobile || "",
      email: contact?.email || "",
      area: contact?.area || "",
      city: contact?.city || "",
      state: contact?.state || "",
      nation: contact?.nation || "India",
      pincode: contact?.pincode || "",
      category: contact?.category || "attendee",
      priority: contact?.priority || "medium",
      status: contact?.status || "active",
      notes: contact?.notes || "",
      team: contact?.team || "",
      assignedTo: contact?.assignedTo || [""],
      sex: contact?.sex || "",
      occupation: contact?.occupation || "",
      maritalStatus: contact?.maritalStatus || "Single"
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        mobile: contact.mobile,
        email: contact.email || "",
        area: contact.area || "",
        city: contact.city || "",
        state: contact.state || "",
        nation: contact.nation || "India",
        pincode: contact.pincode || "",
        category: contact.category || "attendee",
        priority: contact.priority || "medium",
        status: contact.status || "active",
        notes: contact.notes || "",
        team: contact.team || "",
        assignedTo: contact.assignedTo || [""],
        sex: contact?.sex || "",
        occupation: contact?.occupation || "",
        maritalStatus: contact?.maritalStatus || "Single"
      });
    }
  }, [contact, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl" style={{'overflowY':'scroll', 'maxHeight':'80%'}}>
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
          <DialogDescription>
            {contact
              ? "Update contact information"
              : "Add a new contact to your database"}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+91 XXXXX XXXXX" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Team *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Team" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        <SelectItem value="lokayat-general">Lokayat General</SelectItem>
                        <SelectItem value="abhivyakti">Abhivyakti</SelectItem>
                        <SelectItem value="mahila-jagar-samiti">Mahila Jagar Samiti</SelectItem>
                        <SelectItem value="congress-jj-shakti">Congress (Jai Jawan / Shakti)</SelectItem>
                        <SelectItem value="maharashtra-level">Maharashtra</SelectItem>
                        <SelectItem value="congress-party">Congress Party</SelectItem>
                        <SelectItem value="ncp-party">NCP Party</SelectItem>
                        <SelectItem value="shivsena-party">Shivsena Party</SelectItem>
                        <SelectItem value="other-organisations">Other Organisations</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="donor">Donor</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="attendee">Attendee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Area *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Neighborhood or area" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>City/District *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Assigned To</FormLabel>
                    <div className="space-y-2">
                      {field?.value?.map((person, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              value={person}
                              onChange={(e) => {
                                const newAssignedTo = [...field?.value];
                                newAssignedTo[index] = e.target.value;
                                field.onChange(newAssignedTo);
                              }}
                              placeholder={`Person ${index + 1}`}
                            />
                          </FormControl>
                          {field?.value?.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newAssignedTo = field?.value?.filter((_, i) => i !== index);
                                field.onChange(newAssignedTo);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          field.onChange([...field.value, ""]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Person
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>State *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="gujarat">Gujarat</SelectItem>
                        <SelectItem value="karnataka">Karnataka</SelectItem>
                        <SelectItem value="delhi">Delhi</SelectItem>
                        <SelectItem value="tamil nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="andhra pradesh">Andhra Pradesh</SelectItem>
                        <SelectItem value="telangana">Telangana</SelectItem>
                        <SelectItem value="west bengal">West Bengal</SelectItem>
                        <SelectItem value="uttar pradesh">Uttar Pradesh</SelectItem>
                        <SelectItem value="rajasthan">Rajasthan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nation"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nation *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Postal code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Occupation</FormLabel>
                    <Select
                      value={field.value ?? "Other"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Occupation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school-teacher">School Teacher</SelectItem>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Sex</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Marital Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Priority *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || "active"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-6">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ?? ""}
                        placeholder="Any additional notes about this contact"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter style={{'position': 'sticky', 'bottom': '0'}}>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {contact ? "Update Contact" : "Save Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
