import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { insertContactSchema, insertEventSchema, insertFollowUpSchema } from "@shared/schema";
import { z } from "zod";
import * as ExcelJS from "exceljs";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept excel files only
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // === CONTACTS ROUTES ===
  
  // Get all contacts with optional filtering
  app.get("/api/contacts", isAuthenticated, async (req, res, next) => {
    try {
      const { search, category, priority, city, event, status } = req.query;
      
      // Handle search query
      if (search && typeof search === 'string') {
        const contacts = await storage.searchContacts(search);
        return res.json(contacts);
      }
      
      // Handle filters
      if (category || priority || city || event || status) {
        const filters: any = {};
        
        if (category) filters.category = category;
        if (priority) filters.priority = priority;
        if (city) filters.city = city;
        if (status) filters.status = status;
        if (event) filters.eventId = parseInt(event as string);
        
        const contacts = await storage.filterContacts(filters);
        return res.json(contacts);
      }
      
      // Get all contacts if no filters
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  });

  // Get contact by ID
  app.get("/api/contacts/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContactById(id);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      next(error);
    }
  });

  // Create contact
  app.post("/api/contacts", isAuthenticated, async (req, res, next) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      
      // Check if contact with that mobile already exists
      const existingContact = await storage.getContactByMobile(contactData.mobile);
      if (existingContact) {
        return res.status(400).json({ message: "Contact with this mobile number already exists" });
      }
      
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Update contact
  app.put("/api/contacts/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      // If mobile number is being changed, check if it already exists
      if (updateData.mobile && updateData.mobile !== existingContact.mobile) {
        const mobileExists = await storage.getContactByMobile(updateData.mobile);
        if (mobileExists) {
          return res.status(400).json({ message: "Contact with this mobile number already exists" });
        }
      }
      
      const updatedContact = await storage.updateContact(id, updateData);
      res.json(updatedContact);
    } catch (error) {
      next(error);
    }
  });

  // Delete contact
  app.delete("/api/contacts/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await storage.deleteContact(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get contact's attendance
  app.get("/api/contacts/:id/events", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const attendance = await storage.getAttendanceByContactId(id);
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  });

  // Get contact's follow-ups
  app.get("/api/contacts/:id/followups", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const followUps = await storage.getFollowUpsByContactId(id);
      res.json(followUps);
    } catch (error) {
      next(error);
    }
  });

  // Add follow-up to contact
  app.post("/api/contacts/:id/followups", isAuthenticated, async (req, res, next) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const followUpData = insertFollowUpSchema.parse({
        ...req.body,
        contactId
      });
      
      const followUp = await storage.createFollowUp(followUpData);
      res.status(201).json(followUp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // === EVENTS ROUTES ===
  
  // Get all events
  app.get("/api/events", isAuthenticated, async (req, res, next) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      next(error);
    }
  });

  // Get event by ID
  app.get("/api/events/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      next(error);
    }
  });

  // Create event
  app.post("/api/events", isAuthenticated, async (req, res, next) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  // Update event
  app.put("/api/events/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Ensure the event exists
      const existingEvent = await storage.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const updatedEvent = await storage.updateEvent(id, updateData);
      res.json(updatedEvent);
    } catch (error) {
      next(error);
    }
  });

  // Delete event
  app.delete("/api/events/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the event exists
      const existingEvent = await storage.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.deleteEvent(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get event attendees
  app.get("/api/events/:id/attendees", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ensure the event exists
      const existingEvent = await storage.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const attendees = await storage.getAttendanceByEventId(id);
      res.json(attendees);
    } catch (error) {
      next(error);
    }
  });

  // Add attendee to event
  app.post("/api/events/:id/attendees", isAuthenticated, async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      const { contactId } = req.body;
      
      if (!contactId) {
        return res.status(400).json({ message: "contactId is required" });
      }
      
      // Ensure the event exists
      const existingEvent = await storage.getEventById(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Ensure the contact exists
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const attendance = await storage.createAttendance({
        eventId,
        contactId
      });
      
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  });

  // === IMPORT/EXPORT ROUTES ===
  
  // Import event registrations from Excel
  app.post("/api/import", isAuthenticated, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { eventId } = req.body;
      if (!eventId) {
        return res.status(400).json({ message: "eventId is required" });
      }
      
      // Ensure the event exists
      const existingEvent = await storage.getEventById(parseInt(eventId));
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Process Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        return res.status(400).json({ message: "Invalid Excel file: no worksheets found" });
      }
      
      const result = {
        created: 0,
        updated: 0,
        errors: [] as string[]
      };
      
      // Skip header row
      worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        try {
          const mobile = row.getCell('Mobile').text?.trim();
          if (!mobile) {
            result.errors.push(`Row ${rowNumber}: Mobile number is required`);
            return;
          }
          
          const name = row.getCell('Name').text?.trim();
          if (!name) {
            result.errors.push(`Row ${rowNumber}: Name is required`);
            return;
          }
          
          // Check if contact exists
          let contact = await storage.getContactByMobile(mobile);
          
          if (contact) {
            // Update existing contact with any new info
            const updateData: any = {};
            
            // Only update if the fields are provided and empty in the DB
            const email = row.getCell('Email').text?.trim();
            if (email && !contact.email) updateData.email = email;
            
            const area = row.getCell('Area').text?.trim();
            if (area && !contact.area) updateData.area = area;
            
            const city = row.getCell('City').text?.trim();
            if (city && !contact.city) updateData.city = city;
            
            const state = row.getCell('State').text?.trim();
            if (state && !contact.state) updateData.state = state;
            
            const pincode = row.getCell('Pincode').text?.trim();
            if (pincode && !contact.pincode) updateData.pincode = pincode;
            
            // Update if there are changes
            if (Object.keys(updateData).length > 0) {
              contact = await storage.updateContact(contact.id, updateData) as any;
            }
            
            result.updated++;
          } else {
            // Create new contact
            const email = row.getCell('Email').text?.trim();
            const area = row.getCell('Area').text?.trim() || 'Unknown';
            const city = row.getCell('City').text?.trim() || 'Unknown';
            const state = row.getCell('State').text?.trim() || 'Unknown';
            const nation = row.getCell('Nation').text?.trim() || 'India';
            const pincode = row.getCell('Pincode').text?.trim();
            
            contact = await storage.createContact({
              name,
              mobile,
              email,
              area,
              city,
              state,
              nation,
              pincode,
              priority: 'medium', // Default values
              category: 'attendee',
              status: 'active'
            });
            
            result.created++;
          }
          
          // Add attendance record for the event
          await storage.createAttendance({
            contactId: contact.id,
            eventId: parseInt(eventId)
          });
          
        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${(error as Error).message}`);
        }
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
