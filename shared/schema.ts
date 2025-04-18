import { pgTable, text, serial, integer, boolean, timestamp, unique, date, PgArray } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role"),
  mobile: text("mobile"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  nation: text("nation").notNull().default("India"),
  priority: text("priority").notNull(), // high, medium, low
  organisation: text("organisation"),
  countryCode: text("country_code").notNull().default("+91"),
  category: text("category").notNull(),
  email: text("email"),
  occupation: text("occupation").notNull().default('Other'),
  sex: text("sex"),
  maritalStatus: text("marital_status"),
  pincode: text("pincode"),
  status: text("status").default("active"), // active, inactive, follow-up
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  assignedTo: text("assignedTo").array(),
  team: text("team")
});

export const insertContactSchema = createInsertSchema(contacts)
  .omit({ id: true, createdAt: true })
  .extend({
    mobile: z.string().refine(
      (val) => {
        const numberOnly = val.replace(/\D/g, '');
        return numberOnly.length === 10 || numberOnly.length === 12;
      },
      { message: "Mobile number must be 10 digits or 12 digits with country code" }
    ),
  });

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Attendance table (for tracking event attendance)
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  eventId: integer("event_id").notNull().references(() => events.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    contactEventUnique: unique().on(table.contactId, table.eventId),
  };
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Follow-ups table
export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  notes: text("notes").notNull(),
  status: text("status").notNull(), // pending, completed, cancelled
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").notNull().references(()=> users.username),
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({ id: true, createdAt: true })
.extend({
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  completedDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  notes: text("notes").notNull(),
  title: text("status").notNull(),
  activityDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").notNull().references(()=> users.username),
});

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true })
.extend({
  activityDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;


//TASKS
// Add these after existing schemas
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  tags: text("tags").array(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  assignedTo: text("assigned_to").notNull(), // username of assigned user
  createdBy: text("created_by").notNull(), // username of admin who created
  campaignName: text("campaign_name"),
});

//below is the schema for task_feedback
export const taskFeedback = pgTable("task_feedback", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  assignedTo: text("assigned_to").notNull(),
  isCompleted: boolean("is_completed").default(false),
  feedback: text("feedback"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  response: text("response")
});

// Add a type for the response values
export type TaskResponse = "Yes" | "No" | "Tentative";

// Update the task schema to handle date strings
export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.string().transform((str) => new Date(str)), // Convert string to Date
}).omit({
  id: true,
  createdAt: true,
  isCompleted: true,
});

export const insertTaskFeedbackSchema = createInsertSchema(taskFeedback).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type TaskFeedback = typeof taskFeedback.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTaskFeedback = z.infer<typeof insertTaskFeedbackSchema>;

// Update the predefinedActivities schema
export const predefinedActivities = pgTable("predefined_activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  date: timestamp("date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add a schema for inserting predefined activities
export const insertPredefinedActivitySchema = createInsertSchema(predefinedActivities)
  .omit({ id: true, createdAt: true })
  .extend({
    date: z.string().optional().transform(val => val ? new Date(val) : null),
  });

export type PredefinedActivity = typeof predefinedActivities.$inferSelect;
export type InsertPredefinedActivity = z.infer<typeof insertPredefinedActivitySchema>;