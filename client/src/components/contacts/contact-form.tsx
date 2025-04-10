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
import { Plus, X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import {User} from "@shared/schema";

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
  team?: string;
  assignedTo: string[];
  organisation?: string;
  countryCode: string;
};

// Extended schema with validation
const formSchema = insertContactSchema.extend({
  mobile: z.string()
    .refine(val => /^\d{10}$/.test(val), {
      message: "Mobile number must be exactly 10 digits without country code"
    }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  pincode: z.string().max(10, "Pincode cannot exceed 10 characters").optional().or(z.literal("")),
  countryCode: z.string().default("+91"),
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
  const [countryCode, setCountryCode] = useState("+91");


  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

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
    assignedTo: contact.assignedTo ?? [""],
    organisation: contact.organisation ?? "",
    countryCode: contact.countryCode ?? "+91",
  });

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
      maritalStatus: contact?.maritalStatus || "Single",
      organisation: contact?.organisation || "",
      countryCode: contact?.countryCode || "+91",
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
        maritalStatus: contact?.maritalStatus || "Single",
        organisation: contact?.organisation || "",
        countryCode: contact?.countryCode || "+91",
      });
    }
  }, [contact, form]);

  // Handle form submission with validation
  const handleSubmit = (data: FormSchemaType) => {
    // Validate phone number format
    const mobileNumber = data.mobile;

    if (!/^\d{10}$/.test(mobileNumber)) {
      Toast({
        title: "Invalid phone number",
        variant: "destructive",
      });
      return;
    }

    // Prepare data with country code
    const formattedData = {
      ...data,
      countryCode,
    };

    onSubmit(formattedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl" style={{ overflowY: "scroll", maxHeight: "80%" }}>
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                    <div className="flex">
                      <Select
                        value={countryCode}
                        onValueChange={setCountryCode}
                        className="w-24 mr-2"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="+91" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">+91</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                          <SelectItem value="+61">+61</SelectItem>
                          <SelectItem value="+49">+49</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="10-digit mobile number"
                        className="flex-1"
                        maxLength={10}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          field.onChange(value);
                        }}
                      />
                    </div>
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
                    <Select onValueChange={field.onChange}>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="sympathiser">Sympathiser</SelectItem>
                        <SelectItem value="attendee">Attendee</SelectItem>
                        <SelectItem value="political">Political</SelectItem>
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
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-auto min-h-10"
                          >
                            {field.value && field.value.length > 0 
                              ? `${field.value.length} user(s) selected`
                              : "Select users"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-60">
                                {users.map(user => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => {
                                      const currentValue = field.value || [];
                                      const isSelected = currentValue.includes(user.username);

                                      let newValue;
                                      if (isSelected) {
                                        newValue = currentValue.filter(name => name !== user.username);
                                      } else {
                                        newValue = [...currentValue, user.username];
                                      }

                                      field.onChange(newValue.length ? newValue : [""]);
                                    }}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      {field.value?.includes(user.username) && (
                                        <Check className="h-4 w-4" />
                                      )}
                                      <span>{user.username}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.filter(Boolean).map((name, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {name}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => {
                                const newValue = field.value.filter((_, i) => i !== index);
                                field.onChange(newValue.length ? newValue : [""]);
                              }} 
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                name="organisation"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Organisation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Organisation name" />
                    </FormControl>
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

            <DialogFooter style={{ position: "sticky", bottom: "0" }}>
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
