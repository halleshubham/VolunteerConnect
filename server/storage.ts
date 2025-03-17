import { contacts, type Contact, type InsertContact } from "@shared/schema";
import { events, type Event, type InsertEvent } from "@shared/schema";
import { attendance, type Attendance, type InsertAttendance } from "@shared/schema";
import { followUps, type FollowUp, type InsertFollowUp } from "@shared/schema";
import { users, type User, type InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private events: Map<number, Event>;
  private attendance: Map<number, Attendance>;
  private followUps: Map<number, FollowUp>;
  
  private userIdCounter: number;
  private contactIdCounter: number;
  private eventIdCounter: number;
  private attendanceIdCounter: number;
  private followUpIdCounter: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.events = new Map();
    this.attendance = new Map();
    this.followUps = new Map();
    
    this.userIdCounter = 1;
    this.contactIdCounter = 1;
    this.eventIdCounter = 1;
    this.attendanceIdCounter = 1;
    this.followUpIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Contact operations
  async getContacts(filters?: Partial<Contact>): Promise<Contact[]> {
    let contacts = Array.from(this.contacts.values());
    
    if (filters) {
      contacts = contacts.filter((contact) => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) return true;
          return contact[key as keyof Contact] === value;
        });
      });
    }
    
    return contacts;
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByMobile(mobile: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(
      (contact) => contact.mobile === mobile
    );
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const now = new Date();
    const newContact: Contact = { 
      ...contact, 
      id,
      createdAt: now
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, update: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updatedContact: Contact = { ...contact, ...update };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Event operations
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEventById(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const now = new Date();
    const newEvent: Event = { 
      ...event, 
      id,
      createdAt: now
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, update: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent: Event = { ...event, ...update };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Attendance operations
  async getAttendanceByEventId(eventId: number): Promise<(Attendance & { contact: Contact })[]> {
    const attendances = Array.from(this.attendance.values())
      .filter(a => a.eventId === eventId);
    
    return attendances.map(attendance => {
      const contact = this.contacts.get(attendance.contactId);
      if (!contact) throw new Error(`Contact not found for attendance: ${attendance.id}`);
      return { ...attendance, contact };
    });
  }

  async getAttendanceByContactId(contactId: number): Promise<(Attendance & { event: Event })[]> {
    const attendances = Array.from(this.attendance.values())
      .filter(a => a.contactId === contactId);
    
    return attendances.map(attendance => {
      const event = this.events.get(attendance.eventId);
      if (!event) throw new Error(`Event not found for attendance: ${attendance.id}`);
      return { ...attendance, event };
    });
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    // Check if attendance already exists to prevent duplicates
    const exists = Array.from(this.attendance.values()).find(
      a => a.contactId === attendanceData.contactId && a.eventId === attendanceData.eventId
    );
    
    if (exists) return exists;
    
    const id = this.attendanceIdCounter++;
    const now = new Date();
    const attendance: Attendance = { 
      ...attendanceData, 
      id,
      createdAt: now
    };
    this.attendance.set(id, attendance);
    return attendance;
  }

  // Follow-up operations
  async getFollowUpsByContactId(contactId: number): Promise<FollowUp[]> {
    return Array.from(this.followUps.values())
      .filter(f => f.contactId === contactId);
  }

  async createFollowUp(followUp: InsertFollowUp): Promise<FollowUp> {
    const id = this.followUpIdCounter++;
    const now = new Date();
    const newFollowUp: FollowUp = { 
      ...followUp, 
      id,
      createdAt: now
    };
    this.followUps.set(id, newFollowUp);
    return newFollowUp;
  }

  async updateFollowUp(id: number, update: Partial<FollowUp>): Promise<FollowUp | undefined> {
    const followUp = this.followUps.get(id);
    if (!followUp) return undefined;
    
    const updatedFollowUp: FollowUp = { ...followUp, ...update };
    this.followUps.set(id, updatedFollowUp);
    return updatedFollowUp;
  }

  async deleteFollowUp(id: number): Promise<boolean> {
    return this.followUps.delete(id);
  }

  // Search and filter
  async searchContacts(query: string): Promise<Contact[]> {
    if (!query) return this.getContacts();
    
    const lowerQuery = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.mobile.includes(lowerQuery) || 
      (contact.email && contact.email.toLowerCase().includes(lowerQuery)) ||
      contact.city.toLowerCase().includes(lowerQuery) ||
      contact.area.toLowerCase().includes(lowerQuery)
    );
  }

  async filterContacts(filters: {
    category?: string;
    priority?: string;
    city?: string;
    eventId?: number;
    status?: string;
  }): Promise<Contact[]> {
    let contacts = Array.from(this.contacts.values());
    
    if (filters.category) {
      contacts = contacts.filter(c => c.category === filters.category);
    }
    
    if (filters.priority) {
      contacts = contacts.filter(c => c.priority === filters.priority);
    }
    
    if (filters.city) {
      contacts = contacts.filter(c => c.city.toLowerCase() === filters.city.toLowerCase());
    }
    
    if (filters.status) {
      contacts = contacts.filter(c => c.status === filters.status);
    }
    
    if (filters.eventId) {
      const eventAttendees = Array.from(this.attendance.values())
        .filter(a => a.eventId === filters.eventId)
        .map(a => a.contactId);
      
      contacts = contacts.filter(c => eventAttendees.includes(c.id));
    }
    
    return contacts;
  }
}

export const storage = new MemStorage();
