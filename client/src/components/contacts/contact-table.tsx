import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Contact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";

interface ContactTableProps {
  contacts: Contact[];
  onView: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  selectedContacts: Contact[];
  onSelectionChange: (contacts: Contact[]) => void;
}

export default function ContactTable({
  contacts,
  onView,
  onEdit,
  selectedContacts,
  onSelectionChange,
}: ContactTableProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [confirmDelete, setConfirmDelete] = useState<Contact | null>(null);

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully.",
      });
      setConfirmDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete contact: ${error.message}`,
        variant: "destructive",
      });
      setConfirmDelete(null);
    },
  });

  // Pagination
  const totalPages = Math.ceil(contacts.length / itemsPerPage);
  const paginatedContacts = contacts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const allSelected =
    contacts.length > 0 &&
    contacts.every((contact) =>
      selectedContacts.some((selected) => selected.id === contact.id)
    );

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered contacts
      const newSelection = selectedContacts.filter(
        (selected) =>
          !contacts.some((contact) => contact.id === selected.id)
      );
      onSelectionChange(newSelection);
    } else {
      // Select all filtered contacts while keeping other selections
      const newSelection = [
        ...selectedContacts.filter(
          (selected) =>
            !contacts.some((contact) => contact.id === selected.id)
        ),
        ...contacts,
      ];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectContact = (checked: boolean, contact: Contact) => {
    if (checked) {
      onSelectionChange([...selectedContacts, contact]);
    } else {
      onSelectionChange(
        selectedContacts.filter((c) => c.id !== contact.id)
      );
    }
  };

  // Get category badge style
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "volunteer":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            Volunteer
          </Badge>
        );
      case "sympathiser":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
            Sympathiser
          </Badge>
        );
      case "attendee":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            Attendee
          </Badge>
        );
      case "political":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Political
          </Badge>
        );
      default:
        return <Badge>{category}</Badge>;
    }
  };

  // Get priority badge style
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            High (P0/P1)
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            Medium (P2)
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Low (P3)
          </Badge>
        );
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            Inactive
          </Badge>
        );
      case "follow-up":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Follow-up
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get avatar background color
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-primary/10 text-primary",
      "bg-secondary/10 text-secondary",
      "bg-accent/10 text-accent",
      "bg-green-100 text-green-700",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Desktop view - Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all contacts"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Activity Score</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContacts.length > 0 ? (
                paginatedContacts.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedContacts.some(sc => sc.id === contact.id)}
                        onCheckedChange={(checked) => handleSelectContact(!!checked, contact)}
                        aria-label={`Select ${contact.name}`}
                      />
                    </TableCell>
                    <TableCell>

                    <Link href={`/contacts/${contact.id}`}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full ${getAvatarColor(contact.name)} flex items-center justify-center font-medium`}>
                            {getInitials(contact.name)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-500">{contact.category}</div>
                        </div>
                      </div>
                    </Link>
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${contact.mobile}`}>
                        <div className="text-sm text-gray-900">{contact.countryCode} {contact.mobile}</div>
                      </a>
                      <div className="text-sm text-gray-500">{contact.email}</div>
                    </TableCell>
                    <TableCell>

                    <Link href={`/contacts/${contact.id}`}>
                      <div className="text-sm text-gray-900">{contact.area}</div>
                      <div className="text-sm text-gray-500">{contact.city}, {contact.state}</div>
                    </Link>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(contact.category)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(contact.priority)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{contact.sex}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{contact.organisation}</div>
                    </TableCell>
                    <TableCell>
                      {contact?.activityScore}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{contact.assignedTo?.toString()}</div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Link href={`/contacts/${contact.id}`}>
                          <Button variant="link" className="text-primary">
                            View
                          </Button>
                        </Link>
                      <Button variant="link" className="text-gray-600" onClick={() => onEdit(contact)}>
                        Edit
                      </Button>
                      <Button variant="link" className="text-red-600" onClick={() => setConfirmDelete(contact)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    No contacts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile view - Cards */}
      <div className="block md:hidden">
        {paginatedContacts.length > 0 ? (
          <div className="space-y-4 p-4">
            {paginatedContacts.map((contact) => (
              <div
                key={contact.id}
                className="border rounded-lg overflow-hidden shadow-sm cursor-pointer"
                
              >

              <Link href={`/contacts/${contact.id}`}>
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedContacts.some(
                        (c) => c.id === contact.id
                      )}
                      onCheckedChange={(checked) => {
                        handleSelectContact(!!checked, contact);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${contact.name}`}
                    />
                    <h3 className="font-medium text-gray-900">
                      {contact.name}
                    </h3>
                  </div>
                  {getCategoryBadge(contact.category)}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 w-20">
                      Mobile:
                    </span>
                    <span>{contact.mobile}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-500 w-20">
                        Email:
                      </span>
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 w-20">
                      Location:
                    </span>
                    <span>{`${contact.city || ""} ${
                      contact.state ? ", " + contact.state : ""
                    }`}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-500 w-20">
                      Priority:
                    </span>
                    <span>{contact.priority}</span>
                  </div>
                  {contact.assignedTo && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-500 w-20">
                        Assigned:
                      </span>
                      <span className="truncate">
                        {Array.isArray(contact.assignedTo)
                          ? contact.assignedTo.join(", ")
                          : contact.assignedTo}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className="flex border-t p-2 bg-gray-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-primary"
                    onClick={() => onView(contact)}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-gray-600"
                    onClick={() => onEdit(contact)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-red-600"
                    onClick={() => setConfirmDelete(contact)}
                  >
                    Delete
                  </Button>
                </div>

              </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No contacts found
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * itemsPerPage, contacts.length)}
                </span>{" "}
                of <span className="font-medium">{contacts.length}</span>{" "}
                results
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }).map(
                  (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(pageNum);
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  }
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this contact?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              contact and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmDelete) {
                  deleteMutation.mutate(confirmDelete.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
