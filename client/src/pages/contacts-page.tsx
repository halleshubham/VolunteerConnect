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
import { Loader2, UserPlus, FileUp, FileDown } from "lucide-react";
import { z } from "zod";

export default function ContactsPage() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    search: "",
    category: "",
    priority: "",
    location: "",
    eventId: "",
    status: "",
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
      if (filtersObj.eventId) params.append("event", filtersObj.eventId);
      if (filtersObj.status) params.append("status", filtersObj.status);
      
      const url = `/api/contacts${params.toString() ? `?${params.toString()}` : ''}`;
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
                  onClick={handleAddContact}
                  className="inline-flex items-center"
                >
                  <UserPlus className="-ml-1 mr-2 h-5 w-5" />
                  Add Contact
                </Button>
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                  onClick={() => window.location.href = "/api/import"}
                >
                  <FileUp className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Import Excel
                </Button>
                <Button 
                  variant="outline"
                  className="inline-flex items-center"
                >
                  <FileDown className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                  Export
                </Button>
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
                  <Button 
                    variant="outline"
                    className="inline-flex items-center"
                    onClick={() => window.location.href = "/api/import"}
                    size="lg"
                  >
                    <FileUp className="-ml-1 mr-2 h-5 w-5" />
                    Import from Excel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <ContactTable 
              contacts={contacts} 
              onView={handleViewContact} 
              onEdit={handleEditContact}
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
    </div>
  );
}
