import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Phone } from "lucide-react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: (Task & { feedbacks: TaskFeedback[] }) | null;
  onUpdateFeedback: (feedbackId: number, data: Partial<TaskFeedback>) => Promise<void>;
  onCloseComplete?: () => void;  // Add this new prop
}

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdateFeedback,
  onCloseComplete,
}: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Set<number>>(new Set());
  const [localFeedbacks, setLocalFeedbacks] = useState<Record<number, {
    feedback: string;
    isCompleted: boolean;
  }>>({});

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      onCloseComplete?.();
    }
  };

  // Reset submitted feedbacks when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubmittedFeedbacks(new Set());
    }
  }, [isOpen]);

  // Fetch contacts for the feedbacks
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

  // Initialize local state when task changes
  useEffect(() => {
    if (task) {
      const initialState = task.feedbacks.reduce((acc, feedback) => ({
        ...acc,
        [feedback.id]: {
          feedback: feedback.feedback || "",
          isCompleted: feedback.isCompleted || false,
        },
      }), {});
      setLocalFeedbacks(initialState);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = async (feedbackId: number) => {
    const localFeedback = localFeedbacks[feedbackId];
    if (!localFeedback) return;

    await onUpdateFeedback(feedbackId, {
      feedback: localFeedback.feedback,
      isCompleted: localFeedback.isCompleted,
      completedAt: localFeedback.isCompleted ? new Date() : null,
    });

    // Add to submitted feedbacks
    if (localFeedback.isCompleted) {
      setSubmittedFeedbacks(prev => new Set([...prev, feedbackId]));
    } else {
      // If feedback is not completed, remove from submitted feedbacks
      setSubmittedFeedbacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(feedbackId);
        return newSet;
      });
    }

    // Refresh the task data
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ 
      queryKey: ["/api/contactsByIdList", task?.feedbacks.map(f => f.contactId)]
    });
  };

  // Filter out submitted feedbacks from active feedbacks
  const activeFeedbacks = task.feedbacks.filter(
    f => !f.isCompleted && !submittedFeedbacks.has(f.id)
  );
  const completedCount = task.feedbacks.length - activeFeedbacks.length;
  const progress = (completedCount / task.feedbacks.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-white border-b pb-4">
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 p-6">
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-gray-600">{task.description}</p>
          </div>

          <div>
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

          <Tabs defaultValue="active" className="w-full">
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
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{contact?.name}</h4>
                              <p className="text-sm text-black flex">
                                <a href={`tel:${contact?.mobile}`} className="text-sm text-blue-500 flex items-center">
                                    <Phone className="h-4 w-4 mt-1 mr-2" />{contact?.mobile}
                                </a>
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
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
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{contact?.name}</h4>
                              <p className="text-sm text-gray-500">{contact?.mobile}</p>
                            </div>
                            <Badge variant="success">Completed</Badge>
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
      </DialogContent>
    </Dialog>
  );
}