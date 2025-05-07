import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Contact, insertContactSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ContactFilter, { FilterValues } from "@/components/contacts/contact-filter";
import ContactTable from "@/components/contacts/contact-table";
import ContactForm from "@/components/contacts/contact-form";
import ContactDetailModal from "@/components/contacts/contact-detail-modal";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, FileUp, FileDown, Megaphone } from "lucide-react";
import { z } from "zod";
import * as XLSX from "xlsx";
import WhatsappForm from "@/components/contacts/whatsapp-form";
import { BulkUpdateModal } from "@/components/contacts/bulk-update-modal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { TaskAssignmentModal } from "@/components/tasks/task-assignment-modal";
import { CreateCampaignModal } from "@/components/contacts/create-campaign-modal";

export default function ContactsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isWhatsappFormOpen, setIsWhatsappFormOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isTaskAssignmentOpen, setIsTaskAssignmentOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({
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

  // Fetch contacts with filters
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", filterValues],
    queryFn: async ({ queryKey }) => {
      const [_, filters] = queryKey;
      const filtersObj = filters as FilterValues;
      
      // Build query string from filters
      const params = new URLSearchParams();
      if (filtersObj.search) params.append("search", filtersObj.search);
      if (filtersObj.category) params.append("category", filtersObj.category);
      if (filtersObj.priority) params.append("priority", filtersObj.priority);
      if (filtersObj.location) params.append("city", filtersObj.location);
      if (filtersObj.eventId) params.append("eventId", filtersObj.eventId);
      if (filtersObj.status) params.append("status", filtersObj.status);
      if (filtersObj.occupation) params.append("occupation", filtersObj.occupation);
      
      // Build the URL manually to avoid URL-encoding commas
      let url = `/api/contacts`;
      const queryParams: string[] = [];
      
      if (params.toString()) {
        queryParams.push(params.toString());
      }
      
      // Handle comma-separated assignedTo values without URL-encoding the commas
      if (filtersObj.assignedTo) {
        const assignedToValues = filtersObj.assignedTo.split(',').map(value => value.trim()).filter(Boolean);
        queryParams.push(`assignedTo=${assignedToValues.join(',')}`);
      }
      
      if (filtersObj.team) {
        queryParams.push(`team=${encodeURIComponent(filtersObj.team)}`);
      }
      
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }
      
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      return res.json();
    },
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertContactSchema>) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contact added",
        description: "The contact has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsContactFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof insertContactSchema> }) => {
      const res = await apiRequest("PUT", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsContactFormOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update contact: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ contactIds, field, value }: { contactIds: number[], field: string, value: string }) => {
      await apiRequest("PUT", `/api/contacts-bulk/update`, { contactIds, field, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts-bulk"] });
      toast({
        title: "Contacts updated",
        description: "Selected contacts have been updated successfully.",
      });
      setSelectedContacts([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update contacts: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (contactIds: number[]) => {
      await apiRequest("DELETE", `/api/contacts-bulk/delete`, { contactIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts-bulk"] });
      toast({
        title: "Contacts deleted",
        description: "Selected contacts have been deleted successfully.",
      });
      setSelectedContacts([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete contacts: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      dueDate: Date;
      tags: string[];
      assignedTo: string;
      contacts: number[];
    }) => {
      // Ensure dueDate is converted to ISO string before sending
      return await apiRequest("POST", "/api/tasks", {
        ...data,
        dueDate: data.dueDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Task created",
        description: "The task has been assigned successfully.",
      });
      setIsTaskAssignmentOpen(false);
      setSelectedContacts([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
});

  // Handle form submission
  const handleContactSubmit = (data: z.infer<typeof insertContactSchema>) => {
    if (selectedContact) {
      updateContactMutation.mutate({ id: selectedContact.id, data });
    } else {
      createContactMutation.mutate(data);
    }
  };

  // Handle edit contact
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(false); // Close view modal if open
    setIsContactFormOpen(true);
  };

  // Handle view contact details
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewModalOpen(true);
  };

  // Handle add new contact
  const handleAddContact = () => {
    setSelectedContact(null);
    setIsContactFormOpen(true);
  };

  // Handle filter change
  const handleFilterChange = (filters: FilterValues) => {
    setFilterValues(filters);
  };

  /**
   * Converts array of objects to Excel (xlsx) and downloads the file
   * @param {Array} data - Array of objects to export
   * @param {string} fileName - Desired filename
   */
  const exportToExcel = (data: any, fileName = 'exported-contacts-'+new Date().toISOString()+'.xlsx') => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Step 1: Find max array length in assignedTo
    const maxAssigned = Math.max(...data.map(item => item.assignedTo?.length || 0));

    // Step 2: Create flattened data structure for Excel
    const flattenedData = data.map((item: any) => {
      const flatItem: any = {
        Name: item.name,
        Mobile: item.mobile,
        CountryCode: item.countryCode || '+91',
        Email: item.email,
        Area: item.area,
        City: item.city,
        State: item.state,
        Nation: item.nation,
        Pincode: item.pincode,
        Category: item.category,
        Priority: item.priority,
        Status: item.status,
        Sex: item.sex,
        Organisation: item.organisation,
        MaritalStatus: item.maritalStatus,
        Occupation: item.occupation,
        Notes: item.notes,
        Team: item.team,
      };

      // Add assignedTo columns
      if (item.assignedTo && Array.isArray(item.assignedTo)) {
        for (let i = 0; i < maxAssigned; i++) {
          flatItem[`AssignedTo${i+1}`] = item.assignedTo[i] || '';
        }
      }

      return flatItem;
    });

    // Step 3: Create workbook and add data
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    // Step 4: Save file
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Contact Management" onOpenSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Action Bar */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">All Contacts</h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button 
                  variant="outline"
                  onClick={handleAddContact}
                  className="inline-flex items-center"
                >
                  <UserPlus className="-ml-1 mr-2 h-5 w-5" />
                  Add Contact
                </Button>
                {selectedContacts.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Bulk Actions ({selectedContacts.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setIsBulkUpdateOpen(true)}>
                        Update Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) {
                            bulkDeleteMutation.mutate(selectedContacts.map(c => c.id));
                          }
                        }}
                      >
                        Delete Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsCampaignModalOpen(true)}>
                        Create Campaign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                  onClick={() => setIsWhatsappFormOpen(true)}
                >
                  <FileUp className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Send Whatsapp Message
                </Button>
                {user?.role === 'admin' && selectedContacts.length > 0 && (
                  <Button
                    onClick={() => setIsTaskAssignmentOpen(true)}
                  >
                    Assign Task
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                  onClick={()=>exportToExcel(contacts)}
                >
                <FileDown className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Export
                </Button>
                {user?.role === 'admin' && contacts.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCampaignModalOpen(true)}
                  >
                    <Megaphone className="mr-1 h-4 w-4" /> Create Campaign
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <ContactFilter onFilterChange={handleFilterChange} />
          
          {/* Contacts Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                  <UserPlus className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No contacts yet</h3>
                <p className="text-gray-500 max-w-md mb-6">
                  Get started by creating your first contact or importing contacts from an Excel file.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleAddContact}
                    className="inline-flex items-center"
                    size="lg"
                  >
                    <UserPlus className="-ml-1 mr-2 h-5 w-5" />
                    Add Your First Contact
                  </Button>
                  {/* <Button 
                    variant="outline"
                    className="inline-flex items-center"
                    onClick={() => window.location.href = "/api/import"}
                    size="lg"
                  >
                    <FileUp className="-ml-1 mr-2 h-5 w-5" />
                    Import from Excel
                  </Button> */}
                </div>
              </div>
            </div>
          ) : (
            <ContactTable 
              contacts={contacts} 
              onView={handleViewContact} 
              onEdit={handleEditContact}
              selectedContacts={selectedContacts}
              onSelectionChange={setSelectedContacts}
            />
          )}
        </main>
      </div>
      
      {/* Contact Form Modal */}
      <ContactForm 
        isOpen={isContactFormOpen}
        onClose={() => setIsContactFormOpen(false)}
        onSubmit={handleContactSubmit}
        contact={selectedContact || undefined}
      />
      
      {/* Contact Detail Modal */}
      <ContactDetailModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={handleEditContact}
        contact={selectedContact || null}
      />

      <WhatsappForm 
        isOpen={isWhatsappFormOpen}
        onClose={() => setIsWhatsappFormOpen(false)}
        contacts={contacts}
      />

      <BulkUpdateModal
        isOpen={isBulkUpdateOpen}
        onClose={() => setIsBulkUpdateOpen(false)}
        selectedContacts={selectedContacts}
        onUpdate={async (field, value) => {
          await bulkUpdateMutation.mutateAsync({
            contactIds: selectedContacts.map(c => c.id),
            field,
            value
          });
          setIsBulkUpdateOpen(false);
        }}
      />

      <TaskAssignmentModal
        isOpen={isTaskAssignmentOpen}
        onClose={() => setIsTaskAssignmentOpen(false)}
        selectedContacts={selectedContacts}
        onSubmit={async (data) => {
          await createTaskMutation.mutateAsync({
            ...data,
            contacts: selectedContacts.map(c => c.id),
          });
        }}
      />

      <CreateCampaignModal
        open={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        contacts={contacts}
      />
    </div>
  );
}
