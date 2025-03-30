import { activities, Activity, contacts, InsertActivity, InsertTask, InsertTaskFeedback, Task, TaskFeedback, taskFeedback, tasks, type Contact, type InsertContact } from "@shared/schema";
import { events, type Event, type InsertEvent } from "@shared/schema";
import { attendance, type Attendance, type InsertAttendance } from "@shared/schema";
import { followUps, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, ilike, desc, asc, or, sql, inArray } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import dotenv from 'dotenv';
dotenv.config();

const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contact operations
  getContacts(filters?: Partial<Contact>): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  getContactByMobile(mobile: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  
  // Event operations
  getEvents(): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Attendance operations
  getAttendanceByEventId(eventId: number): Promise<(Attendance & { contact: Contact })[]>;
  getAttendanceByContactId(contactId: number): Promise<(Attendance & { event: Event })[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  
  // Follow-up operations
  getFollowUpsByContactId(contactId: number, user: User | undefined): Promise<FollowUp[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: number, followUp: Partial<FollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: number): Promise<boolean>;
  
  // Activity operations
  getActivitiesByContactId(contactId: number, user: User | undefined): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;

  //Bulk Operations
  bulkUpdateContacts(contactIds: number[], field: string, value: string): Promise<number>;
  bulkDeleteContacts(contactIds: number[]): Promise<number>;

  // Search and filter
  searchContacts(query: string): Promise<Contact[]>;
  filterContacts(filters: {
    category?: string;
    priority?: string;
    city?: string;
    eventId?: number;
    status?: string;
  }): Promise<Contact[]>;

  getAllTasksWithFilters(filters: {
    isCompleted?: boolean;
    assignedTo?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<(Task & { feedbacks: TaskFeedback[] })[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create the PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      conObject: { connectionString: "postgresql://postgres:@localhost:5432/volunteerconnect" },
      createTableIfMissing: true,
    });
  }
  async deleteActivity(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Contact operations
  async getContacts(filters?: Partial<Contact>): Promise<Contact[]> {
    let query = db.select().from(contacts);
    
    if (filters) {
      const conditions = [];
      
      if (filters.status) conditions.push(eq(contacts.status, filters.status));
      if (filters.category) conditions.push(eq(contacts.category, filters.category));
      if (filters.priority) conditions.push(eq(contacts.priority, filters.priority));
      if (filters.city) conditions.push(eq(contacts.city, filters.city));
      
      if (conditions.length > 0) {
        query = (query as any).where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(contacts.createdAt));
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async getContactByMobile(mobile: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.mobile, mobile));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateContact(id: number, update: Partial<Contact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set(update)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    const result = await db
      .delete(contacts)
      .where(eq(contacts.id, id));
    return true; // In PostgreSQL, if the deletion fails it will throw an error
  }

  // Event operations
  async getEvents(): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .orderBy(desc(events.date));
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateEvent(id: number, update: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(update)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(eq(events.id, id));
    return true; // In PostgreSQL, if the deletion fails it will throw an error
  }

  // Attendance operations
  async getAttendanceByEventId(eventId: number): Promise<(Attendance & { contact: Contact })[]> {
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        eventId: attendance.eventId,
        contactId: attendance.contactId,
        createdAt: attendance.createdAt,
        contact: contacts
      })
      .from(attendance)
      .where(eq(attendance.eventId, eventId))
      .innerJoin(contacts, eq(attendance.contactId, contacts.id));
    
    return attendanceRecords;
  }

  async getAttendanceByContactId(contactId: number): Promise<(Attendance & { event: Event })[]> {
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        eventId: attendance.eventId,
        contactId: attendance.contactId,
        createdAt: attendance.createdAt,
        event: events
      })
      .from(attendance)
      .where(eq(attendance.contactId, contactId))
      .innerJoin(events, eq(attendance.eventId, events.id));
    
    return attendanceRecords;
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    try {
      const [newAttendance] = await db
        .insert(attendance)
        .values(attendanceData)
        .returning();
      return newAttendance;
    } catch (error) {
      // If the attendance already exists (unique constraint violation), fetch and return it
      const [existingAttendance] = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.contactId, attendanceData.contactId),
            eq(attendance.eventId, attendanceData.eventId)
          )
        );
      
      if (existingAttendance) {
        return existingAttendance;
      }
      
      throw error;
    }
  }

  // Follow-up operations
  async getFollowUpsByContactId(contactId: number, user: User | undefined): Promise<FollowUp[]> {
    if(user?.role == 'viewonly') {
    return await db
      .select()
      .from(followUps)
      .where(and(eq(followUps.contactId, contactId), eq(followUps.createdBy, user?.username)))
      .orderBy(desc(followUps.createdAt));
    } else {
      return await db
        .select()
        .from(followUps)
        .where((eq(followUps.contactId, contactId)))
        .orderBy(desc(followUps.createdAt));
    }
  }

  async createFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const [newFollowUp] = await db
      .insert(followUps)
      .values(followUp)
      .returning();
    return newFollowUp;
  }

  async updateFollowUp(id: number, update: Partial<FollowUp>): Promise<FollowUp | undefined> {
    const [updatedFollowUp] = await db
      .update(followUps)
      .set(update)
      .where(eq(followUps.id, id))
      .returning();
    return updatedFollowUp;
  }

  async getUniqueCities(): Promise<string[]> {
    const result = await db
      .selectDistinct({ city: contacts.city })
      .from(contacts)
      .orderBy(contacts.city);
    return result.map(r => r.city);
  }

  async deleteFollowUp(id: number): Promise<boolean> {
    const result = await db
      .delete(followUps)
      .where(eq(followUps.id, id));
    return true; // In PostgreSQL, if the deletion fails it will throw an error
  }

  // Activity operations
  // Fetch activities by contactId with role-based access
  async getActivitiesByContactId(contactId: number, user: User | undefined): Promise<Activity[]> {
    // if (user?.role === 'viewonly') {
    //   return await db
    //     .select()
    //     .from(activities)
    //     .where(and(eq(activities.contactId, contactId), eq(activities.createdBy, user?.username)))
    //     .orderBy(desc(activities.createdAt));
    // } else {
      return await db
        .select()
        .from(activities)
        .where(eq(activities.contactId, contactId))
        .orderBy(desc(activities.createdAt));
    //}
  }

  // Create a new activity
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  // Update an existing activity
  async updateActivity(id: number, update: Partial<Activity>): Promise<Activity | undefined> {
    const [updatedActivity] = await db
      .update(activities)
      .set(update)
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity;
  }

  async bulkUpdateContacts(contactIds: number[], field: string, value: string): Promise<number> {
      // Validate field name exists in contacts table
      if (!(field in contacts)) {
        throw new Error(`Invalid field: ${field}`);
      }
  
    // Validate and filter out invalid IDs
    const validIds = contactIds.filter(id => 
      typeof id === 'number' && 
      !isNaN(id) && 
      Number.isInteger(id) && 
      id > 0
    );
  
    if (validIds.length === 0) {
      throw new Error('No valid contact IDs provided');
    }
  
    // ✅ Use sql.array() for clean, parameterized array binding
    const result = await db
    .update(contacts)
    .set({ [field]: value })
    .where(inArray(contacts.id, validIds))
    .returning();
  
    return result.length;
  }
  
  async bulkDeleteContacts(contactIds: number[]): Promise<number> {
    // Validate and filter out invalid IDs
    const validIds = contactIds.filter(id => 
      typeof id === 'number' && 
      !isNaN(id) && 
      Number.isInteger(id) && 
      id > 0
    );
  
    if (validIds.length === 0) {
      throw new Error('No valid contact IDs provided');
    }
  
    // Start a transaction to ensure all operations complete or none do
    return await db.transaction(async (tx) => {
      // Delete related records first
      await tx
        .delete(attendance)
        .where(inArray(attendance.contactId, validIds));
  
      await tx
        .delete(activities)
        .where(inArray(activities.contactId, validIds));
  
      await tx
        .delete(followUps)
        .where(inArray(followUps.contactId, validIds));
  
      // Now delete the contacts
      const result = await tx
        .delete(contacts)
        .where(inArray(contacts.id, validIds))
        .returning();
  
      return result.length;
    });
  }

  // Search and filter
  async searchContacts(query: string): Promise<Contact[]> {
    if (!query) {
      return await this.getContacts();
    }
    
    return await db
      .select()
      .from(contacts)
      .where(
        or(
          ilike(contacts.name, `%${query}%`),
          ilike(contacts.mobile, `%${query}%`),
          ilike(contacts.email, `%${query}%`),
          ilike(contacts.city, `%${query}%`),
          ilike(contacts.area, `%${query}%`)
        )
      )
      .orderBy(desc(contacts.createdAt));
  }

  async filterContacts(filters: {
    category?: string;
    priority?: string;
    city?: string;
    eventId?: number;
    status?: string;
    occupation?: string;
    assignedTo?:string
  }): Promise<Contact[]> {
    if (filters.eventId) {
      // Special case for filtering by event attendance
      const attendees = await db
        .select({
          contact: contacts
        })
        .from(attendance)
        .where(eq(attendance.eventId, filters.eventId))
        .innerJoin(contacts, eq(attendance.contactId, contacts.id));

      const attendeeContacts = attendees.map(a => a.contact);
      
      // Apply any additional filters
      return attendeeContacts.filter(contact => {
        let match = true;
        if (filters.category) match = match && contact.category === filters.category;
        if (filters.priority) match = match && contact.priority === filters.priority;
        if (filters.city) match = match && contact.city.toLowerCase() === filters.city.toLowerCase();
        if (filters.status) match = match && contact.status === filters.status;
        return match;
      });
    } else {
      // // Regular filtering without event attendance
      // let query = db.select().from(contacts);
      // const conditions = [];
      
      // if (filters.category) conditions.push(eq(contacts.category, filters.category));
      // if (filters.priority) conditions.push(eq(contacts.priority, filters.priority));
      // if (filters.city) conditions.push(ilike(contacts.city, filters.city));
      // if (filters.status) conditions.push(eq(contacts.status, filters.status));
      // if (filters.occupation) conditions.push(eq(contacts.occupation, filters.occupation));
      // if (filters.assignedTo) conditions.push(sql`
      //   EXISTS (
      //     SELECT 1 FROM unnest(${contacts.assignedTo}) AS assignment
      //     WHERE assignment ILIKE ${'%' + filters.assignedTo + '%'}
      //   )
      // `);

      
      // if (conditions.length > 0) {
      //   query = (query as any).where(and(...conditions));
      // }
      
      // return await query.orderBy(desc(contacts.createdAt));
      // Base query with LEFT JOIN to count activities
      let query = db
      .select({
        id: contacts.id,
        name: contacts.name,
        mobile: contacts.mobile,
        email: contacts.email,
        city: contacts.city,
        area: contacts.area,
        category: contacts.category,
        priority: contacts.priority,
        status: contacts.status,
        occupation: contacts.occupation,
        assignedTo: contacts.assignedTo,
        createdAt: contacts.createdAt,
        activityScore: sql<number>`COALESCE(COUNT(activities.id), 0)`.as('activityScore'),
      })
      .from(contacts)
      .leftJoin(activities, eq(contacts.id, activities.contactId));

      // Prepare conditions
      const conditions = [];

      if (filters.category) conditions.push(eq(contacts.category, filters.category));
      if (filters.priority) conditions.push(eq(contacts.priority, filters.priority));
      if (filters.city) conditions.push(ilike(contacts.city, filters.city));
      if (filters.status) conditions.push(eq(contacts.status, filters.status));
      if (filters.occupation) conditions.push(eq(contacts.occupation, filters.occupation));
      if (filters.assignedTo) conditions.push(sql`
      EXISTS (
        SELECT 1 FROM unnest(${contacts.assignedTo}) AS assignment
        WHERE assignment ILIKE ${'%' + filters.assignedTo + '%'}
      )
      `);

      if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
      }

      // Group by contact to ensure correct count
      query = (query as any).groupBy(contacts.id).orderBy(desc(contacts.createdAt));

      return await(query as any);
    }
  }

  //tasks-feedbacks
async updateTaskFeedback(id: number, data: Partial<TaskFeedback>): Promise<TaskFeedback | undefined> {
  const [updatedFeedback] = await db
    .update(taskFeedback)
    .set({
      ...data,
      // If marking as completed, set completedAt
      ...(data.isCompleted && { completedAt: new Date() }),
      // If marking as incomplete, clear completedAt
      ...(!data.isCompleted && { completedAt: null }),
    })
    .where(eq(taskFeedback.id, id))
    .returning();
  
  return updatedFeedback;
}

// Add to DatabaseStorage class
async getContactsByIds(ids: number[]): Promise<Contact[]> {
  const validIds = ids.filter(id => 
    typeof id === 'number' && 
    !isNaN(id) && 
    Number.isInteger(id) && 
    id > 0
  );

  if (validIds.length === 0) {
    return [];
  }

  const recontacts = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, ids));

  return recontacts;
}

// Add to DatabaseStorage class
async getContactTaskFeedbacks(contactId: number): Promise<(TaskFeedback & { task: Task })[]> {
  const results = await db
    .select({
      feedback: taskFeedback,
      task: tasks,
    })
    .from(taskFeedback)
    .where(eq(taskFeedback.contactId, contactId))
    .leftJoin(tasks, eq(taskFeedback.taskId, tasks.id))
    .orderBy(desc(tasks.dueDate));

  return results
    .filter(({ task }) => task !== null)
    .map(({ feedback, task }) => ({
      ...feedback,
      task: task!,
    }));
}

// Add this method to DatabaseStorage class
async getTaskFeedbackWithTask(feedbackId: number): Promise<[{ taskFeedback: TaskFeedback; task: Task }] | undefined> {
  const result = await db
    .select({
      taskFeedback: taskFeedback,
      task: tasks,
    })
    .from(taskFeedback)
    .where(eq(taskFeedback.id, feedbackId))
    .leftJoin(tasks, eq(taskFeedback.taskId, tasks.id))
    .limit(1);

  if (!result[0].task) {
    throw new Error("Task not found for the given feedback ID");
  }
  return result as [{ taskFeedback: TaskFeedback; task: Task }];
}

// Add this method to check if all feedbacks are completed
async updateTaskCompletionStatus(taskId: number): Promise<void> {
  const feedbacks = await db
    .select()
    .from(taskFeedback)
    .where(eq(taskFeedback.taskId, taskId));

  const allCompleted = feedbacks.every(f => f.isCompleted);

  await db
    .update(tasks)
    .set({ isCompleted: allCompleted })
    .where(eq(tasks.id, taskId));
}

  // Add this method to DatabaseStorage class
  async getUsers(): Promise<{id:number, username: string, role: string | null, mobile: string | null}[]> {
      const userList = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          mobile: users.mobile
        })
        .from(users)
        .orderBy(users.username);
      
      return userList;
    }

  // Add to DatabaseStorage class
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async createTaskFeedbacks(feedbacks: InsertTaskFeedback[]): Promise<TaskFeedback[]> {
    const result = await db
      .insert(taskFeedback)
      .values(feedbacks)
      .returning();
    return result;
  }

  async getUserTasks(username: string): Promise<(Task & { feedbacks: TaskFeedback[] })[]> {
    const result = await db
      .select({
        task: tasks,
        feedbacks: taskFeedback,
      })
      .from(tasks)
      .leftJoin(taskFeedback, eq(tasks.id, taskFeedback.taskId))
      .where(eq(tasks.assignedTo, username));

    // Group feedbacks by task
    const tasksMap = new Map();
    result.forEach(({ task, feedbacks }) => {
      if (!tasksMap.has(task.id)) {
        tasksMap.set(task.id, { ...task, feedbacks: [] });
      }
      if (feedbacks) {
        tasksMap.get(task.id).feedbacks.push(feedbacks);
      }
    });

    return Array.from(tasksMap.values());
  }

  async getAllTasks(): Promise<(Task & { feedbacks: TaskFeedback[] })[]> {
    const result = await db
      .select({
        task: tasks,
        feedbacks: taskFeedback,
      })
      .from(tasks)
      .leftJoin(taskFeedback, eq(tasks.id, taskFeedback.taskId));

    // Group feedbacks by task
    const tasksMap = new Map();
    result.forEach(({ task, feedbacks }) => {
      if (!tasksMap.has(task.id)) {
        tasksMap.set(task.id, { ...task, feedbacks: [] });
      }
      if (feedbacks) {
        tasksMap.get(task.id).feedbacks.push(feedbacks);
      }
    });

    return Array.from(tasksMap.values());
  }

  // Add this method to DatabaseStorage class
async getAllTasksWithFilters(filters: {
  isCompleted?: boolean;
  assignedTo?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<(Task & { feedbacks: TaskFeedback[] })[]> {
  let query = db
    .select({
      task: tasks,
      feedbacks: taskFeedback,
    })
    .from(tasks)
    .leftJoin(taskFeedback, eq(tasks.id, taskFeedback.taskId));

  const conditions = [];

  // Apply filters
  if (filters.isCompleted !== undefined) {
    conditions.push(eq(tasks.isCompleted, filters.isCompleted));
  }

  if (filters.assignedTo) {
    conditions.push(eq(tasks.assignedTo, filters.assignedTo));
  }

  if (filters.fromDate) {
    conditions.push(sql`${tasks.dueDate} >= ${filters.fromDate}`);
  }

  if (filters.toDate) {
    conditions.push(sql`${tasks.dueDate} <= ${filters.toDate}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Order by due date
  query = query.orderBy(asc(tasks.dueDate));

  const result = await query;

  // Group feedbacks by task
  const tasksMap = new Map();
  result.forEach(({ task, feedbacks }) => {
    if (!tasksMap.has(task.id)) {
      tasksMap.set(task.id, { ...task, feedbacks: [] });
    }
    if (feedbacks) {
      tasksMap.get(task.id).feedbacks.push(feedbacks);
    }
  });

  return Array.from(tasksMap.values());
}

}

export const storage = new DatabaseStorage();
