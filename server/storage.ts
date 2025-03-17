import { contacts, type Contact, type InsertContact } from "@shared/schema";
import { events, type Event, type InsertEvent } from "@shared/schema";
import { attendance, type Attendance, type InsertAttendance } from "@shared/schema";
import { followUps, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, ilike, desc, asc, or, sql } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";

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
  getFollowUpsByContactId(contactId: number): Promise<FollowUp[]>;
  createFollowUp(followUp: InsertFollowUp): Promise<FollowUp>;
  updateFollowUp(id: number, followUp: Partial<FollowUp>): Promise<FollowUp | undefined>;
  deleteFollowUp(id: number): Promise<boolean>;
  
  // Search and filter
  searchContacts(query: string): Promise<Contact[]>;
  filterContacts(filters: {
    category?: string;
    priority?: string;
    city?: string;
    eventId?: number;
    status?: string;
  }): Promise<Contact[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create the PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      conObject: { connectionString: process.env.DATABASE_URL },
      createTableIfMissing: true,
    });
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
        query = query.where(and(...conditions));
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
  async getFollowUpsByContactId(contactId: number): Promise<FollowUp[]> {
    return await db
      .select()
      .from(followUps)
      .where(eq(followUps.contactId, contactId))
      .orderBy(desc(followUps.createdAt));
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

  async deleteFollowUp(id: number): Promise<boolean> {
    const result = await db
      .delete(followUps)
      .where(eq(followUps.id, id));
    return true; // In PostgreSQL, if the deletion fails it will throw an error
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
      // Regular filtering without event attendance
      let query = db.select().from(contacts);
      const conditions = [];
      
      if (filters.category) conditions.push(eq(contacts.category, filters.category));
      if (filters.priority) conditions.push(eq(contacts.priority, filters.priority));
      if (filters.city) conditions.push(ilike(contacts.city, filters.city));
      if (filters.status) conditions.push(eq(contacts.status, filters.status));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(contacts.createdAt));
    }
  }
}

export const storage = new DatabaseStorage();
