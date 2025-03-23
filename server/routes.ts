import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { 
  insertContactSchema, 
  insertEventSchema, 
  insertFollowUpSchema,
  Contact, 
  insertActivitySchema
} from "@shared/schema";
import { z } from "zod";
import ExcelJS from 'exceljs';
import whatsapp from 'whatsapp-web.js';
import fs from 'fs/promises';
import path from 'path';
const { Client, LocalAuth } = whatsapp;

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


let latestQR = null;
let isReady = false;
const clients = {};  // Store WhatsApp client per user

// Create and return client for specific user
function getClient(userId:any) {
  if (clients[userId]) return clients[userId];
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: `./sessions/user_${userId}` }),
    puppeteer: { headless: true }
  });
  
  client.initialize();
  clients[userId] = client;
  return client;
}

// ✅ Cleanup function
async function cleanupSessions() {
  console.log('Running WhatsApp session cleanup...');
  for (const userId in clients) {
    try {
    const sessionPath = path.resolve(`./sessions/user_${userId}`);
    
      // Destroy the client if connected
      if (clients[userId]) {
        await clients[userId].destroy();
        delete clients[userId];
      }

      // Delete the session folder
      await fs.rm(sessionPath, { recursive: true, force: true });
      console.log(`Session cleaned: ${sessionPath}`);
    } catch (err) {
      console.error(`Error cleaning session for user ${userId}:`, err);
    }
  }
}

// ✅ Run cleanup every 1 hour
setInterval(cleanupSessions, 40 * 60 * 1000); // 1 hour

// client.on('qr', (qr) => {
//   console.log('QR Received');
//   latestQR = qr;
//   isReady = false;
// });

// client.on('ready', () => {
//   console.log('✅ WhatsApp Client Ready');
//   latestQR = null; // Clear QR once connected
//   isReady = true;
// });

// client.on('auth_failure', () => {
//   console.log('❌ Auth failure. QR will regenerate.');
//   isReady = false;
// });

// client.on('disconnected', () => {
//   console.log('❌ WhatsApp disconnected');
//   isReady = false;
// });

// client.initialize();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  //===== whatsapp routes ======

// API to get QR or check connection
app.get('/auth/:userId', async (req, res) => {
  const { userId } = req.params;
  const client = getClient(userId);

  if (client.info?.wid) return res.json({ status: 'authenticated' });

  client.once('qr', (qr) => {
    res.json({ status: 'qr', qr });
  });

  client.once('ready', () => {
    console.log(`✅ User ${userId} WhatsApp Ready`);
  });
});

  // API for status check
  app.get('/status/:userId', (req, res) => {
    const { userId } = req.params;
    const client = clients[userId];
    if (client && client.info?.wid) {
      res.json({ isReady: true });
    } else {
      res.json({ isReady: false });
    }
  });

  // ✅ API to send message batch
  app.post('/send-message/:userId', async (req, res) => {
    const { userId } = req.params;
    const client = getClient(userId);
    if (!client.info?.wid) return res.status(400).json({ message: 'Not Authenticated' });
  
    const { numbers, message } = req.body; // numbers = ['919876543210', '919123456789']
    const results = [];

    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      const chatId = `91${num}@c.us`;
      try {
        await client.sendMessage(chatId, message);
        results.push({ number: num, status: 'Sent' });
      } catch (err) {
        results.push({ number: num, status: 'Failed', error: err.message });
      }
      const randomDelay = 3000 + Math.random() * 2000; // 3-5 sec delay
      await delay(randomDelay);
    }
    res.json({ results });
  });

  // === CONTACTS ROUTES ===
  
  // Get unique cities from contacts
  app.get("/api/contacts/cities", isAuthenticated, async (_req, res, next) => {
    try {
      const cities = await storage.getUniqueCities();
      res.json(cities);
    } catch (error) {
      next(error);
    }
  });

  // Get all contacts with optional filtering
  app.get("/api/contacts", isAuthenticated, async (req, res, next) => {
    try {
      const { search, category, priority, city, event, status, occupation, assignedTo, team } = req.query;
      const user = req.user;

      // Handle search query
      if (search && typeof search === 'string') {
        const contacts = await storage.searchContacts(search);
        return res.json(contacts);
      }
      const filters: any = {};
      // Handle filters
      if (category || priority || city || event || status || occupation || assignedTo || team) {
       
        
        if (category) filters.category = category;
        if (priority) filters.priority = priority;
        if (city) filters.city = city;
        if (status) filters.status = status;
        if (occupation) filters.occupation = occupation;
        if (event) filters.eventId = parseInt(event as string);
        if (team) filters.team = team;

        
          if(user?.role=='admin'){
            if(assignedTo) filters.assignedTo = assignedTo;
          } else {
            filters.assignedTo = user?.username;
          }
        
        const contacts = await storage.filterContacts(filters);
        return res.json(contacts);
      }

      if(user?.role=='viewonly'){
          filters.assignedTo = user?.username;
      } 
      // Get all contacts if no filters
      const contacts = await storage.filterContacts(filters);
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
      
      const followUps = await storage.getFollowUpsByContactId(id, req.user);
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

  // ✅ Get contact's activities
  app.get("/api/contacts/:id/activities", isAuthenticated, async (req, res, next) => {
    try {
      const contactId = parseInt(req.params.id);

      // Ensure the contact exists
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const activities = await storage.getActivitiesByContactId(contactId, req.user);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // ✅ Add activity to contact
  app.post("/api/contacts/:id/activities", isAuthenticated, async (req, res, next) => {
    try {
      const contactId = parseInt(req.params.id);

      // Ensure the contact exists
      const existingContact = await storage.getContactById(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const activityData = insertActivitySchema.parse({
        ...req.body,
        contactId
      });

      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
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
  // Get sample Excel template
  app.get("/api/events/sample-template", (_req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Event Registration');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Area', key: 'area', width: 20 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 20 },
      { header: 'Nation', key: 'nation', width: 20 },
      { header: 'Pincode', key: 'pincode', width: 10 },
      { header: 'Occupation', key: 'occupation', width: 10 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Category', key: 'category', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'CurrentStatus', key: 'currentstatus', width: 30 },
      { header: 'AssignedTo1', key: 'assignedTo1', width: 20 },
      { header: 'AssignedTo2', key: 'assignedTo2', width: 20 },
    ];

    // Add a sample row
    worksheet.addRow({
      name: 'John Doe',
      mobile: '9876543210',
      email: 'john@example.com',
      area: 'Downtown',
      city: 'Mumbai',
      state: 'Maharashtra',
      nation: 'India',
      pincode: '400001',
      priority: 'high',
      category: 'volunteer',
      status: 'active',
      currentstatus: 'feedback note here',
      assignedTo1: 'Name1',
      assignedTo2: 'Name2'
    });

    // Set content type and headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=event-registration-template.xlsx');

    // Write to response
    workbook.xlsx.write(res).then(() => {
      res.end();
    });
  });
  
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
              const mobile = row.getCell(2).text?.trim(); // Mobile column
              if (!mobile) {
                result.errors.push(`Row ${rowNumber}: Mobile number is required`);
                return;
              }
              
              const name = row.getCell(1).text?.trim(); // Name column
              if (!name) {
                result.errors.push(`Row ${rowNumber}: Name is required`);
                return;
              }
              
              // Check if contact exists
              var contact = await storage.getContactByMobile(mobile);
          
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

            const assignedTo = [row.getCell(14).text?.trim(), row.getCell(15).text?.trim()];
            if(assignedTo && !contact.assignedTo?.length) updateData.assignedTo = assignedTo;

            const team = row.getCell(16).text?.trim();
            if (team && !contact.team) updateData.team = team;
            
            const occupation = row.getCell(9).text?.trim();
            if (occupation) updateData.occupation = occupation.toLowerCase();

            const priority = row.getCell(10).text?.trim().toLowerCase();
            if (priority) updateData.priority = priority.toLowerCase();
            const category = row.getCell(11).text?.trim().toLowerCase();
            if (category) updateData.category = category.toLowerCase();
            const status = row.getCell(12).text?.trim().toLowerCase();
            if (status) updateData.status = status.toLowerCase();

            //Dont update assignment
            // const assignedTo = [row.getCell(14).text?.trim(), row.getCell(15).text?.trim()];
            // if(assignedTo) updateData.assignedTo = assignedTo;

            // const team = row.getCell(16).text?.trim();
            // if (team) updateData.team = team;

            // Update if there are changes
            if (Object.keys(updateData).length > 0) {
              contact = await storage.updateContact(contact.id, updateData) as any;
            }

            result.updated++;
          } else {
            // Create new contact
            const email = row.getCell(3).text?.trim();
            const area = row.getCell(4).text?.trim() || 'Unknown';
            const city = row.getCell(5).text?.trim() || 'Unknown';
            const state = row.getCell(6).text?.trim() || 'Unknown';
            const nation = row.getCell(7).text?.trim() || 'India';
            const pincode = row.getCell(8).text?.trim();
            const occupation = row.getCell(9).text?.trim();
            const priority = row.getCell(10).text?.trim();
            const category = row.getCell(11).text?.trim();
            const status = row.getCell(12).text?.trim();
            const assignedTo = [row.getCell(14).text?.trim(), row.getCell(15).text?.trim()];
            const team = row.getCell(16).text?.trim();

            contact = await storage.createContact({
              name,
              mobile,
              email,
              area,
              city,
              state,
              nation,
              pincode,
              occupation,
              priority, // Default values
              category,
              status,
              assignedTo,
              team,
            });
            
            result.created++;
          }
          
          const note = row.getCell(13).text?.trim();
          // Add attendance record for the event if contact exists
          if (contact && note) {
            await storage.createAttendance({
              contactId: contact.id,
              eventId: parseInt(eventId)
            });

            //add followup status
            const followUpStatus = {
              contactId: contact.id,
              notes: note,
              status: "completed", // pending, completed, cancelled
              dueDate: new Date(),
              completedDate: new Date(),
            };
            await storage.createFollowUp(followUpStatus)
          }
          
        } catch (error) {
          console.error(error)
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
