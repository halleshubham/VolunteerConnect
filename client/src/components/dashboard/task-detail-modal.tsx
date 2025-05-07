import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Task, TaskFeedback, Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Phone, X, ExternalLink, MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskResponse } from "@shared/schema";
import WhatsappForm from "@/components/contacts/whatsapp-form";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: (Task & { feedbacks: TaskFeedback[] }) | null;
  onUpdateFeedback: (feedbackId: number, data: Partial<TaskFeedback>) => Promise<void>;
  onCloseComplete?: () => void;
  onCompleteTask?: (taskId: number) => Promise<void>;
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdateFeedback,
  onCloseComplete,
  onCompleteTask,
}: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Set<number>>(new Set());
  const [localFeedbacks, setLocalFeedbacks] = useState<Record<number, {
    feedback: string;
    isCompleted: boolean;
    response: TaskResponse;
  }>>({});
  const [isWhatsappFormOpen, setIsWhatsappFormOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      onCloseComplete?.();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSubmittedFeedbacks(new Set());
    }
  }, [isOpen]);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contactsByIdList", task?.feedbacks.map(f => f.contactId)],
    queryFn: async () => {
      if (!task) return [];
      const contactIds = task.feedbacks.map(f => f.contactId);
      const res = await fetch(`/api/contactsByIdList?ids=${contactIds.join(",")}`, {
        credentials: "include"
      });
      return res.json();
    },
    enabled: !!task,
  });

  useEffect(() => {
    if (task) {
      const initialState = task.feedbacks.reduce((acc, feedback) => ({
        ...acc,
        [feedback.id]: {
          feedback: feedback.feedback || "",
          isCompleted: feedback.isCompleted || false,
          response: feedback.response || "Tentative" as TaskResponse,
        },
      }), {});
      setLocalFeedbacks(initialState);
      console.log('Initial state:', initialState);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = async (feedbackId: number) => {
    const localFeedback = localFeedbacks[feedbackId];
    if (!localFeedback) return;

    console.log('Submitting feedback:', localFeedback);

    await onUpdateFeedback(feedbackId, {
      feedback: localFeedback.feedback,
      isCompleted: localFeedback.isCompleted,
      completedAt: localFeedback.isCompleted ? new Date() : null,
      response: localFeedback.response,
    });

    if (localFeedback.isCompleted) {
      setSubmittedFeedbacks(prev => new Set([...prev, feedbackId]));
    } else {
      setSubmittedFeedbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
    }

    // After updating feedback, check if all feedbacks are completed
    const allFeedbacksCompleted = task.feedbacks.every(f => {
      // Check if this is the feedback we just updated
      if (f.id === feedbackId) {
        return localFeedback.isCompleted;
      }
      // Check the existing status for other feedbacks
      return f.isCompleted || submittedFeedbacks.has(f.id);
    });

    if (allFeedbacksCompleted && !task.isCompleted && onCompleteTask) {
      // If all are completed and task isn't already completed, mark the task as completed
      await onCompleteTask(task.id);
    }

    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ 
      queryKey: ["/api/contactsByIdList", task?.feedbacks.map(f => f.contactId)]
    });
  };

  const activeFeedbacks = task.feedbacks.filter(
    f => !f.isCompleted && !submittedFeedbacks.has(f.id)
  );
  const completedCount = task.feedbacks.length - activeFeedbacks.length;
  const progress = (completedCount / task.feedbacks.length) * 100;

  const handleTabChange = (value: string) => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ 
      queryKey: ["/api/contactsByIdList", task?.feedbacks.map(f => f.contactId)]
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[100vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-0 sm:p-6 m-0 sm:m-4 h-full sm:h-auto rounded-none sm:rounded-lg">
        {/* Add explicit close button with increased hit area */}
        <DialogClose style={{'zIndex':'11'}} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        <DialogHeader className="sticky top-0 z-10 bg-white border-b pb-2 px-4 pt-4 sm:pb-4 sm:px-0 sm:pt-0 pr-10">
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 overflow-y-auto flex-1 p-4 sm:p-6">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-gray-600">{task.description}</p>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h4 className="font-medium mb-2">Progress</h4>
              <div className="flex items-center justify-between mb-2">
                <span>{completedCount} of {task.feedbacks.length} completed</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <Button 
              variant="outline"
              className="ml-4 flex items-center gap-2" 
              onClick={() => setIsWhatsappFormOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
              Send WhatsApp
            </Button>
          </div>

          <Tabs defaultValue="active" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="active">Active ({activeFeedbacks.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({task.feedbacks.length - activeFeedbacks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-4">
              {activeFeedbacks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  All contacts have been updated
                </div>
              ) : (
                activeFeedbacks.map((feedback) => {
                  const contact = contacts.find(c => c.id === feedback.contactId);
                  const localFeedback = localFeedbacks[feedback.id];

                  return (
                    <Card key={feedback.id}>
                      <CardContent className="pt-6 sm:pt-6 px-3 py-3 sm:px-6">
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div>
                              <h4 className="font-medium">{contact?.name}</h4>
                              <div className="flex items-center gap-3">
                                <a href={`tel:${contact?.mobile}`} className="text-sm text-blue-500 flex items-center">
                                    <Phone className="h-4 w-4 mt-1 mr-2" />{contact?.mobile}
                                </a>
                                <a 
                                  href={`/contacts/${contact?.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-500 flex items-center" 
                                  title="Open profile in new tab"
                                >
                                  <ExternalLink className="h-4 w-4 mt-1 mr-1" />
                                  Profile
                                </a>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4">
                              <div className="flex items-center justify-between w-full sm:w-auto space-x-2">
                                <label className="text-sm">Response:</label>
                                <Select
                                  value={localFeedback?.response || "Tentative"}
                                  onValueChange={(value: TaskResponse) => {
                                    console.log('Selected response:', value); 
                                    setLocalFeedbacks(prev => ({
                                      ...prev,
                                      [feedback.id]: {
                                        ...prev[feedback.id],
                                        response: value,
                                      },
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Yes">Yes</SelectItem>
                                    <SelectItem value="No">No</SelectItem>
                                    <SelectItem value="Tentative">Tentative</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-between w-full sm:w-auto space-x-2">
                                <label className="text-sm">Mark as completed</label>
                                <Checkbox 
                                  checked={localFeedback?.isCompleted}
                                  onCheckedChange={(checked) => {
                                    setLocalFeedbacks(prev => ({
                                      ...prev,
                                      [feedback.id]: {
                                        ...prev[feedback.id],
                                        isCompleted: checked === true,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <Textarea
                            placeholder="Add feedback..."
                            value={localFeedback?.feedback || ""}
                            onChange={(e) => {
                              setLocalFeedbacks(prev => ({
                                ...prev,
                                [feedback.id]: {
                                  ...prev[feedback.id],
                                  feedback: e.target.value,
                                },
                              }));
                            }}
                          />

                          <div className="flex justify-end">
                            <Button 
                              onClick={() => handleSubmit(feedback.id)}
                              disabled={
                                localFeedback?.feedback === feedback.feedback &&
                                localFeedback?.isCompleted === feedback.isCompleted
                              }
                            >
                              Submit Feedback
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {task.feedbacks
                .filter(f => f.isCompleted || submittedFeedbacks.has(f.id))
                .map((feedback) => {
                  const contact = contacts.find(c => c.id === feedback.contactId);
                  
                  return (
                    <Card key={feedback.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                            <div>
                              <h4 className="font-medium">{contact?.name}</h4>
                              <p className="text-sm text-gray-500">{contact?.mobile}</p>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                              <Badge variant="default">Completed</Badge>
                              <Badge variant={
                                feedback.response === "Yes" ? "default" :
                                feedback.response === "No" ? "destructive" : "secondary"
                              }>
                                {feedback.response}
                              </Badge>
                            </div>
                          </div>

                          {feedback.feedback && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">Feedback:</p>
                              <p className="text-gray-700 whitespace-pre-line mt-1 p-3 bg-gray-50 rounded-md">
                                {feedback.feedback}
                              </p>
                            </div>
                          )}

                          {feedback.completedAt && (
                            <p className="text-sm text-gray-500">
                              Completed on: {format(new Date(feedback.completedAt), "PPP")}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </TabsContent>
          </Tabs>
        </div>
        
        <WhatsappForm 
          isOpen={isWhatsappFormOpen}
          onClose={() => setIsWhatsappFormOpen(false)}
          contacts={contacts.filter(contact => 
            task.feedbacks.some(feedback => feedback.contactId === contact.id)
          )}
        />
      </DialogContent>
    </Dialog>
  );
}