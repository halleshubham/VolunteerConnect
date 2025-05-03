import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Contact, User } from "@shared/schema";

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSubmit: (data: CampaignData) => Promise<void>;
}

interface CampaignData {
  name: string;
  description: string;
  dueDate: Date;
  selectedUsers: string[];
  contactDistribution: Record<string, Contact[]>;
  fileData?: any[];
}

interface ContactDistribution {
  [username: string]: {
    contacts: Contact[];
    totalContacts: number;
  }
}

interface ValidationError {
  row: number;
  Name?: string;
  Mobile?: string;
  "Assigned To"?: string;
  "Task Name"?: string;
  error?: string;
}

export function CampaignModal({ isOpen, onClose, users, onSubmit }: CampaignModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "import">("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [contactDistribution, setContactDistribution] = useState<Record<string, Contact[]>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      const data = await readExcelFile(file);
      validateAndSetFileData(data);
    }
  });

  const readExcelFile = async (file: File) => {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const validateAndSetFileData = (data: any[]) => {
    const errors: any[] = [];
    const validData = data.filter((row, index) => {
      const isValid = validateRow(row);
      if (!isValid) {
        errors.push({ row: index + 2, ...row }); // +2 for header and 1-based index
      }
      return isValid;
    });

    setFileData(validData);
    setValidationErrors(errors);
  };

  const validateRow = (row: any) => {
    const mobileRegex = /^[0-9\s]{10}$/;
    return (
      row.Name &&
      row.Mobile &&
      mobileRegex.test(row.Mobile.toString().replace(/\s/g, "")) &&
      row["Assigned To"] &&
      row["Task Name"]
    );
  };

  const { data: contactsByUser = {} } = useQuery<Record<string, Contact[]>>({
    queryKey: ["/api/contacts/by-users", selectedUsers],
    queryFn: async () => {
      const results = await Promise.all(
        selectedUsers.map(async (username) => {
          const response = await fetch(`/api/contacts?assignedTo=${username}`, {
            credentials: "include"
          });
          if (!response.ok) throw new Error(`Failed to fetch contacts for ${username}`);
          const contacts = await response.json();
          return [username, contacts];
        })
      );
      return Object.fromEntries(results);
    },
    enabled: selectedUsers.length > 0,
  });

  const distributeContacts = () => {
    // Initialize distribution with empty arrays for each user
    const distribution: Record<string, Contact[]> = {};
    selectedUsers.forEach(username => {
      distribution[username] = [];
    });

    // Assign contacts based on their existing assignedTo
    selectedUsers.forEach(username => {
      const userContacts = contactsByUser[username] || [];
      distribution[username] = userContacts;
    });

    setContactDistribution(distribution);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dueDate || selectedUsers.length === 0) return;

    await onSubmit({
      name,
      description,
      dueDate,
      selectedUsers,
      contactDistribution,
      fileData: activeTab === "import" ? fileData : undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b pb-4">
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "import")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Creation</TabsTrigger>
              <TabsTrigger value="import">Import from Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6 mt-6">
              {!previewMode ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label>Campaign Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter campaign name"
                        required
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Campaign description"
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
                      <Label>Select Users</Label>
                      <div className="mt-2 space-y-2 border rounded-md p-4 max-h-40 overflow-y-auto">
                        <div className="flex items-center space-x-2 pb-2 border-b">
                          <Checkbox
                            id="select-all"
                            checked={selectAllUsers}
                            onCheckedChange={(checked) => {
                              setSelectAllUsers(!!checked);
                              if (checked) {
                                setSelectedUsers(users.map(user => user.username));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                          <label htmlFor="select-all" className="text-sm font-medium">
                            Select All Users
                          </label>
                        </div>
                        {users.map((user) => (
                          <div key={user.username} className="flex items-center space-x-2">
                            <Checkbox
                              id={user.username}
                              checked={selectedUsers.includes(user.username)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.username]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(u => u !== user.username));
                                  setSelectAllUsers(false);
                                }
                              }}
                            />
                            <label htmlFor={user.username} className="text-sm">
                              {user.username}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" type="button" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!name || !dueDate || selectedUsers.length === 0) return;
                        distributeContacts();
                        setPreviewMode(true);
                      }}
                      disabled={!name || !dueDate || selectedUsers.length === 0}
                    >
                      Preview Distribution
                    </Button>
                  </div>
                </>
              ) : (
                <PreviewDistribution
                  distribution={contactDistribution}
                  onBack={() => setPreviewMode(false)}
                  onConfirm={handleSubmit}
                />
              )}
            </TabsContent>

            <TabsContent value="import" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div>
                  <Label>Campaign Name (To Be Implemented)</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter campaign name"
                    required
                  />
                </div>

                {/* <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Campaign description"
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

                <div className="space-y-4">
                  <div>
                    <Label>Upload Excel File</Label>
                    <div
                      {...getRootProps()}
                      className="mt-2 border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <input {...getInputProps()} />
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Drag & drop an Excel file here, or click to select
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Generate and download template
                            const template = [
                              ["Name", "Mobile", "Assigned To", "Task Name"],
                              ["John Doe", "9876543210", "user1", "Follow up call"],
                            ];
                            const ws = XLSX.utils.aoa_to_sheet(template);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Template");
                            XLSX.writeFile(wb, "campaign-template.xlsx");
                          }}
                        >
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="border rounded-lg p-4 bg-red-50">
                      <h4 className="font-medium text-red-900 mb-2">Validation Errors</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Task Name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationErrors.map((error, index) => (
                            <TableRow key={index} className="text-red-900">
                              <TableCell>{error.row}</TableCell>
                              <TableCell>{error.Name || '-'}</TableCell>
                              <TableCell>{error.Mobile || '-'}</TableCell>
                              <TableCell>{error["Assigned To"] || '-'}</TableCell>
                              <TableCell>{error["Task Name"] || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {fileData.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-4">Valid Records ({fileData.length})</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Task Name</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileData.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{row.Name}</TableCell>
                              <TableCell>{row.Mobile}</TableCell>
                              <TableCell>{row["Assigned To"]}</TableCell>
                              <TableCell>{row["Task Name"]}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!name || !dueDate || fileData.length === 0}
                  >
                    Create Campaign
                  </Button>
                </div> */}
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewDistributionProps {
  distribution: Record<string, Contact[]>;
  onBack: () => void;
  onConfirm: (e: React.FormEvent) => Promise<void>;
}

const PreviewDistribution = ({ distribution, onBack, onConfirm }: PreviewDistributionProps) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-4">Distribution Preview</h3>
        <div className="space-y-4">
          {Object.entries(distribution).map(([username, contacts]) => (
            <div key={username} className="border rounded-lg bg-white">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedUser(expandedUser === username ? null : username)}
              >
                <div>
                  <p className="font-medium">{username}</p>
                  <p className="text-sm text-gray-500">{contacts.length} contacts</p>
                </div>
                <Button variant="ghost" size="sm">
                  {expandedUser === username ? "Hide" : "Show"} Contacts
                </Button>
              </div>
              
              {expandedUser === username && (
                <div className="border-t p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>City</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell>{contact.mobile}</TableCell>
                          <TableCell>{contact.city}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" onClick={onConfirm}>
          Create Campaign
        </Button>
      </div>
    </div>
  );
};