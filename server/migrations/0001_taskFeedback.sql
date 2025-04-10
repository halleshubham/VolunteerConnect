-- Add response column to task_feedback table
ALTER TABLE task_feedback
ADD COLUMN response text NOT NULL DEFAULT 'Tentative';