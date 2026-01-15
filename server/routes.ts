import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, setupAuth } from "./auth";
import multer from "multer";
import { 
  insertContactSchema, 
  insertEventSchema, 
  insertFollowUpSchema,
  insertUserSchema,
  Contact, 
  insertActivitySchema,
  insertTaskSchema,
  User,
  TaskFeedback
} from "@shared/schema";
import { z } from "zod";
import ExcelJS from 'exceljs';
import whatsapp from 'whatsapp-web.js';
import fs from 'fs/promises';
import path from 'path';
import { eq, and, ne, gte, lte, desc, inArray } from "drizzle-orm";
import { 
  tasks, 
  taskFeedback, 
  contacts as contactsTable,
  users
} from "../shared/schema";
import { db } from "./db";

interface CampaignData {
  name: string;
  description: string;
  dueDate: string;
  selectedUsers: string[];
  contactDistribution: Record<string, Contact[]>;
  fileData?: Array<{
    Name: string;
    Mobile: string;
    "Assigned To": string;
    "Task Name": string;
  }>;
}

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
const clients: Record<string, any> = {};  // Store WhatsApp client per user
const userStates: Record<string, { qr: string; lastUpdated: number }> = {}; // Store QR codes and states - declared here for global access

// Helper function to clean up lock files
async function cleanupSessionLocks(userId: string) {
  const sessionPath = path.resolve(`./sessions/user_${userId}/session`);

  try {
    // Remove lock files that prevent browser reuse
    const lockFiles = [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket'
    ];

    for (const lockFile of lockFiles) {
      const lockPath = path.join(sessionPath, lockFile);
      try {
        await fs.unlink(lockPath);
        console.log(`🗑️ Removed lock file: ${lockFile}`);
      } catch (err: any) {
        // File doesn't exist or already removed, ignore
      }
    }
  } catch (err: any) {
    console.log(`⚠️ Could not clean locks for ${userId}:`, err.message);
  }
}

// Helper function to properly destroy a client
async function destroyClient(userId: string) {
  if (clients[userId]) {
    try {
      await clients[userId].destroy();
      console.log(`🗑️ Destroyed client for ${userId}`);
    } catch (err: any) {
      console.error(`⚠️ Error destroying client for ${userId}:`, err.message);
    }
    delete clients[userId];
  }
  delete userStates[userId];
}

// Create and return client for specific user
async function getClient(userId:any) {
  if (clients[userId]) {
    console.log(`♻️ Reusing existing client for user ${userId}`);
    return clients[userId];
  }

  console.log(`🔄 Creating new WhatsApp client for user ${userId}`);

  // Clean up any stale lock files before creating new client
  await cleanupSessionLocks(userId);

  // Try to find system Chrome/Chromium
  const chromePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  let executablePath = undefined;
  for (const chromePath of chromePaths) {
    try {
      await fs.access(chromePath);
      executablePath = chromePath;
      console.log(`✓ Found Chrome at: ${chromePath}`);
      break;
    } catch {
      // Path doesn't exist, try next
    }
  }

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: `./sessions/user_${userId}` }),
    puppeteer: {
      headless: true,
      executablePath: executablePath, // Use system Chrome if found
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    },
    // Use latest stable WhatsApp Web version from wppconnect
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1032040031-alpha.html',
    }
  });

  // Global event handlers that cache state
  client.on('qr', (qr) => {
    console.log(`📱 QR code generated for user ${userId}`);
    userStates[userId] = { qr, lastUpdated: Date.now() };
  });

  client.on('ready', () => {
    console.log(`✅ WhatsApp client ready for user ${userId}`);
    delete userStates[userId]; // Clear QR cache when authenticated
  });

  client.on('auth_failure', async (msg: any) => {
    console.error(`❌ Auth failure for user ${userId}:`, msg);
    await destroyClient(userId);
  });

  client.on('disconnected', async (reason: any) => {
    console.log(`⚠️ Client disconnected for user ${userId}:`, reason);
    await destroyClient(userId);
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading for user ${userId}: ${percent}% - ${message}`);
  });

  client.initialize().catch(async (err: any) => {
    console.error(`❌ Failed to initialize WhatsApp client for user ${userId}:`, err);

    // Properly destroy the client to clean up browser processes
    await destroyClient(userId);

    // If it's a browser already running error, clean up locks and try again
    if (err.message && err.message.includes('browser is already running')) {
      console.log(`🔧 Attempting to clean up stale browser for ${userId}`);
      await cleanupSessionLocks(userId);
    }
  });

  clients[userId] = client;
  return client;
}

// ✅ Cleanup function
async function cleanupSessions() {
  console.log('Running WhatsApp session cleanup...');
  for (const userId in clients) {
    try {
      const sessionPath = path.resolve(`./sessions/user_${userId}`);

      // Properly destroy the client
      await destroyClient(userId);

      // Clean up lock files
      await cleanupSessionLocks(userId);

      // Delete the session folder
      await fs.rm(sessionPath, { recursive: true, force: true });
      console.log(`Session cleaned: ${sessionPath}`);
    } catch (err: any) {
      console.error(`Error cleaning session for user ${userId}:`, err);
    }
  }
}

// ✅ Run cleanup every 1 hour
setInterval(cleanupSessions, 40 * 60 * 1000); // 1 hour

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Store for tracking message sending jobs
interface MessageJob {
  id: string;
  userId: string;
  total: number;
  sent: number;
  failed: number;
  results: Array<{ number: string; status: string; error?: string }>;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt: Date;
  completedAt?: Date;
}

const messageJobs: Record<string, MessageJob> = {};

// Configure multer for image uploads (WhatsApp)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB max (WhatsApp limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// Add this function after CampaignData interface
function distributeContactsEvenly(contacts: Array<{
  Name: string;
  Mobile: string;
  "Assigned To": string;
  "Task Name": string;
}>, selectedUsers: string[]): Record<string, {
  Name: string;
  Mobile: string;
  "Task Name": string;
}[]> {
  const distribution: Record<string, Array<any>> = {};
  selectedUsers.forEach(user => distribution[user] = []);

  // Calculate contacts per user
  const contactsPerUser = Math.floor(contacts.length / selectedUsers.length);
  const remainingContacts = contacts.length % selectedUsers.length;

  let currentIndex = 0;
  contacts.forEach((contact, index) => {
    // Determine which user gets this contact
    const targetUser = selectedUsers[currentIndex];
    
    // Add contact to user's distribution
    distribution[targetUser].push({
      Name: contact.Name,
      Mobile: contact.Mobile,
      "Task Name": contact["Task Name"]
    });

    // Move to next user if their quota is filled
    if ((index + 1) % contactsPerUser === 0 && 
        currentIndex < selectedUsers.length - 1 && 
        distribution[targetUser].length >= contactsPerUser + (currentIndex < remainingContacts ? 1 : 0)) {
      currentIndex++;
    }
  });

  return distribution;
}

// Add this function for handling username mapping during import
async function mapAssignedToUsernames(contacts: any[], currentUsername: string, storage: any) {
  // Get all existing users
  const existingUsers = await storage.getUsers();
  const existingUsernames = existingUsers.map(user => user.username);
  
  let unmappedCount = 0;
  
  const mappedContacts = contacts.map(contact => {
    if (contact.assignedTo && Array.isArray(contact.assignedTo)) {
      // Map each assignedTo entry
      contact.assignedTo = contact.assignedTo.map((username: string) => {
        if (!username || !existingUsernames.includes(username)) {
          unmappedCount++;
          return currentUsername;
        }
        return username;
      });
    } else if (contact.assignedTo) {
      // If assignedTo is a string, convert to array and validate
      const username = contact.assignedTo;
      if (!existingUsernames.includes(username)) {
        unmappedCount++;
        contact.assignedTo = [currentUsername];
      } else {
        contact.assignedTo = [username];
      }
    } else {
      // Default to current user if not set
      contact.assignedTo = [currentUsername];
    }
    return contact;
  });
  
  return { mappedContacts, unmappedCount };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  //===== whatsapp routes ======

// API to get QR or check connection
app.get('/auth/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📥 QR request received for user: ${userId}`);

    // Check if client already exists and is authenticated
    if (clients[userId] && clients[userId].info?.wid) {
      console.log(`✅ User ${userId} already authenticated`);
      return res.json({ status: 'authenticated' });
    }

    // If we already have a QR code stored for this user, return it
    if (userStates[userId]?.qr && !clients[userId]?.info?.wid) {
      console.log(`📱 Returning cached QR for user ${userId}`);
      return res.json({ status: 'qr', qr: userStates[userId].qr });
    }

    // Create or get client
    const client = await getClient(userId);

    // Check again after getting client
    if (client.info?.wid) {
      console.log(`✅ User ${userId} authenticated after client creation`);
      return res.json({ status: 'authenticated' });
    }

    // Set a timeout to prevent indefinite waiting
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏱️ Timeout waiting for QR code for user ${userId}`);
        res.status(408).json({
          status: 'error',
          message: 'Timeout waiting for WhatsApp initialization. Please check server logs.'
        });
      }
    }, 30000); // 30 second timeout

    // Attach listeners
    const qrHandler = (qr) => {
      console.log(`📱 QR event fired for user ${userId}`);
      userStates[userId] = { qr, lastUpdated: Date.now() };
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.json({ status: 'qr', qr });
      }
    };

    const readyHandler = () => {
      clearTimeout(timeout);
      console.log(`✅ Ready event fired for user ${userId}`);
      delete userStates[userId]; // Clear QR cache when authenticated
      if (!res.headersSent) {
        res.json({ status: 'authenticated' });
      }
    };

    const authFailureHandler = (msg) => {
      clearTimeout(timeout);
      console.error(`❌ Auth failure for user ${userId}:`, msg);
      delete userStates[userId];
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Authentication failed. Please try again.'
        });
      }
    };

    client.once('qr', qrHandler);
    client.once('ready', readyHandler);
    client.once('auth_failure', authFailureHandler);

    // Cleanup listeners on timeout
    setTimeout(() => {
      if (res.headersSent) {
        client.removeListener('qr', qrHandler);
        client.removeListener('ready', readyHandler);
        client.removeListener('auth_failure', authFailureHandler);
      }
    }, 31000);

  } catch (error) {
    console.error('❌ Error in /auth/:userId:', error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to initialize WhatsApp client. Check server logs for details.',
        error: error.message
      });
    }
  }
});

  // API for status check
  app.get('/status/:userId', (req, res) => {
    const { userId } = req.params;
    const client = clients[userId];
    const hasQR = !!userStates[userId]?.qr;
    const isAuthenticated = !!(client && client.info?.wid);

    res.json({
      isReady: isAuthenticated,
      hasClient: !!client,
      hasQR: hasQR,
      clientState: client ? 'initialized' : 'not_created'
    });
  });

  // Debug endpoint to reset client (useful for testing)
  app.delete('/auth/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.user as User;

      // Only admin or the user themselves can reset their client
      if (user.role !== 'admin' && user.username !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      console.log(`🗑️ Resetting WhatsApp client for user ${userId}`);

      // Properly destroy the client
      await destroyClient(userId);

      // Clean up lock files
      await cleanupSessionLocks(userId);

      // Also delete session files
      const sessionPath = path.resolve(`./sessions/user_${userId}`);
      await fs.rm(sessionPath, { recursive: true, force: true });

      res.json({ message: `Client reset for user ${userId}` });
    } catch (error: any) {
      console.error('Error resetting client:', error);
      res.status(500).json({ message: 'Failed to reset client', error: error.message });
    }
  });

  // ✅ API to send message batch with progress tracking (SSE)
  app.post('/send-message/:userId', uploadImage.single('image'), async (req, res) => {
    try {
      const { userId } = req.params;
      const numbersStr = req.body.numbers;
      const message = req.body.message;
      const useSSE = req.body.useSSE === 'true' || req.body.useSSE === true;
      const imageFile = req.file;

      // Parse numbers if it's a string
      const numbers = typeof numbersStr === 'string' ? JSON.parse(numbersStr) : numbersStr;

      // Validation
      if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ message: 'Invalid numbers array' });
      }

      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Deduplicate numbers
      const uniqueNumbers = [...new Set(numbers.map((n: string) => {
        let num = n.toString().trim();
        // Remove any leading + or 0
        num = num.replace(/^\+/, '').replace(/^0+/, '');
        // Add country code if not present
        if (!num.startsWith('91') && num.length === 10) {
          num = '91' + num;
        }
        return num;
      }))];

      const client = await getClient(userId);
      if (!client.info?.wid) {
        return res.status(400).json({ message: 'Not Authenticated' });
      }

      // Generate unique job ID
      const jobId = `${userId}_${Date.now()}`;

      // Create job
      messageJobs[jobId] = {
        id: jobId,
        userId,
        total: uniqueNumbers.length,
        sent: 0,
        failed: 0,
        results: [],
        status: 'pending',
        startedAt: new Date()
      };

      console.log(`📤 Starting message job ${jobId}: ${uniqueNumbers.length} unique numbers (${numbers.length} original)`);

      // Process uploaded image file if provided
      let tempImagePath: string | null = null;
      let imageMedia: any = null;
      let hasImage = false;

      if (imageFile) {
        try {
          console.log(`📎 Processing uploaded image for job ${jobId}: ${imageFile.originalname} (${(imageFile.size / 1024).toFixed(1)}KB)`);

          const imageBuffer = imageFile.buffer;
          const imageExtension = imageFile.originalname.split('.').pop() || 'jpg';
          tempImagePath = path.join('/tmp', `whatsapp_${jobId}.${imageExtension}`);

          // Save to temp file (optional, for debugging)
          await fs.writeFile(tempImagePath, imageBuffer);

          // Prepare media message
          const MessageMedia = whatsapp.MessageMedia;
          imageMedia = new MessageMedia(
            imageFile.mimetype,
            imageBuffer.toString('base64'),
            imageFile.originalname
          );

          hasImage = true;
          console.log(`✅ Image prepared for job ${jobId} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
        } catch (err: any) {
          console.error(`❌ Failed to process image for job ${jobId}:`, err.message);
          // Continue without image
          hasImage = false;
        }
      }



      // If SSE is requested, set up Server-Sent Events
      if (useSSE) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial event
        res.write(`data: ${JSON.stringify({
          type: 'started',
          jobId,
          total: uniqueNumbers.length
        })}\n\n`);

        // Process messages with progress updates
        messageJobs[jobId].status = 'in_progress';

        for (let i = 0; i < uniqueNumbers.length; i++) {
          const num = uniqueNumbers[i];
          const chatId = `${num}@c.us`;

          try {
            // Send message with or without image
            if (hasImage && imageMedia) {
              await client.sendMessage(chatId, imageMedia, { caption: message });
            } else {
              await client.sendMessage(chatId, message);
            }
            messageJobs[jobId].sent++;
            messageJobs[jobId].results.push({ number: num, status: 'Sent' });

            // Send progress update
            res.write(`data: ${JSON.stringify({
              type: 'progress',
              jobId,
              current: i + 1,
              total: uniqueNumbers.length,
              sent: messageJobs[jobId].sent,
              failed: messageJobs[jobId].failed,
              number: num,
              status: 'Sent'
            })}\n\n`);
          } catch (err: any) {
            console.error(`Failed to send message to ${num}:`, err);
            messageJobs[jobId].failed++;
            messageJobs[jobId].results.push({
              number: num,
              status: 'Failed',
              error: err.message
            });

            // Send error update
            res.write(`data: ${JSON.stringify({
              type: 'progress',
              jobId,
              current: i + 1,
              total: uniqueNumbers.length,
              sent: messageJobs[jobId].sent,
              failed: messageJobs[jobId].failed,
              number: num,
              status: 'Failed',
              error: err.message
            })}\n\n`);
          }

          // Delay between messages (except for the last one)
          if (i < uniqueNumbers.length - 1) {
            const randomDelay = 3000 + Math.random() * 2000; // 3-5 sec delay
            await delay(randomDelay);
          }
        }

        // Mark job as completed
        messageJobs[jobId].status = 'completed';
        messageJobs[jobId].completedAt = new Date();

        // Send completion event
        res.write(`data: ${JSON.stringify({
          type: 'completed',
          jobId,
          sent: messageJobs[jobId].sent,
          failed: messageJobs[jobId].failed,
          results: messageJobs[jobId].results
        })}\n\n`);

        res.end();

        // Clean up temp image immediately
        if (tempImagePath) {
          try {
            await fs.unlink(tempImagePath);
            console.log(`🗑️ Cleaned up temp image for job ${jobId}`);
          } catch (err) {
            console.error(`⚠️ Failed to delete temp image ${tempImagePath}:`, err);
          }
        }

        // Clean up job after 5 minutes
        setTimeout(() => {
          delete messageJobs[jobId];
        }, 5 * 60 * 1000);

      } else {
        // Non-SSE mode: Process in background and return job ID immediately
        res.json({
          jobId,
          message: 'Message sending started. Use /send-message-status/:jobId to check progress.',
          total: uniqueNumbers.length
        });

        // Process messages in background
        (async () => {
          messageJobs[jobId].status = 'in_progress';

          for (let i = 0; i < uniqueNumbers.length; i++) {
            const num = uniqueNumbers[i];
            const chatId = `${num}@c.us`;

            try {
              // Send message with or without image
              if (hasImage && imageMedia) {
                await client.sendMessage(chatId, imageMedia, { caption: message });
              } else {
                await client.sendMessage(chatId, message);
              }
              messageJobs[jobId].sent++;
              messageJobs[jobId].results.push({ number: num, status: 'Sent' });
            } catch (err: any) {
              console.error(`Failed to send message to ${num}:`, err);
              messageJobs[jobId].failed++;
              messageJobs[jobId].results.push({
                number: num,
                status: 'Failed',
                error: err.message
              });
            }

            // Delay between messages
            if (i < uniqueNumbers.length - 1) {
              const randomDelay = 3000 + Math.random() * 2000;
              await delay(randomDelay);
            }
          }

          messageJobs[jobId].status = 'completed';
          messageJobs[jobId].completedAt = new Date();

          // Clean up temp image immediately
          if (tempImagePath) {
            try {
              await fs.unlink(tempImagePath);
              console.log(`🗑️ Cleaned up temp image for job ${jobId}`);
            } catch (err) {
              console.error(`⚠️ Failed to delete temp image ${tempImagePath}:`, err);
            }
          }

          // Clean up job after 10 minutes
          setTimeout(() => {
            delete messageJobs[jobId];
          }, 10 * 60 * 1000);
        })();
      }

    } catch (error: any) {
      console.error('❌ Error in /send-message/:userId:', error);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Failed to send messages',
          error: error.message
        });
      }
    }
  });

  // API to check message sending progress
  app.get('/send-message-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = messageJobs[jobId];

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      total: job.total,
      sent: job.sent,
      failed: job.failed,
      progress: Math.round((job.sent + job.failed) / job.total * 100),
      results: job.results,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    });
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
      const { search, category, priority, city, eventId, status, occupation, assignedTo, team } = req.query;
      const user = req.user;

      
      const filters: any = {};
      // Handle filters
      if (search || category || priority || city || eventId || status || occupation || assignedTo || team) {
       
        
        if (category) filters.category = category;
        if (priority) filters.priority = priority;
        if (city) filters.city = city;
        if (status) filters.status = status;
        if (occupation) filters.occupation = occupation;
        if (eventId) filters.eventId = parseInt(eventId);
        if (team) filters.team = team;

        
        if(user?.role=='admin'){
           if(assignedTo) {
             // Handle assignedTo as an array of values
             if (typeof assignedTo === 'string') {
               // Convert comma-separated string to array
               filters.assignedTo = assignedTo.split(',').filter(Boolean).map(item => item.trim());
             } else if (Array.isArray(assignedTo)) {
               filters.assignedTo = assignedTo;
             }
           }
         } else {
           filters.assignedTo = user?.username;
         }
        
        const contacts = await storage.filterContacts(filters);
        // Handle search query
        if (search && typeof search === 'string') {
          const filteredContacts = contacts.filter((contact: Contact) => {
            const searchLower = search.toLowerCase();
            return (
              contact.name.toLowerCase().includes(searchLower) ||
              contact.mobile.toString().includes(searchLower)
            );
          });
          return res.json(filteredContacts);
        }

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

  // Add this new route after other contact routes
  app.get("/api/contacts/search", isAuthenticated, async (req, res, next) => {
    try {
      const { mobile } = req.query;
      
      if (!mobile || typeof mobile !== 'string') {
        return res.status(400).json({ message: "Mobile number is required" });
      }
      
      
      // Find contact by mobile number
      const contact = await storage.getContactByMobile(mobile);
      
      // Return the contact if found, or null if not found (not an error)
      res.json(contact || null);
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

  // Get contacts by ID list
  app.get("/api/contactsByIdList", isAuthenticated, async (req, res, next) => {
    try {
      const { ids } = req.query;
  
      // Check if ids is provided
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ 
          message: "ids query parameter is required and must be a comma-separated string" 
        });
      }
  
      // Parse the comma-separated string into an array of numbers
      const idsArray = ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id)); // Filter out invalid numbers
  
      // Check if we have any valid IDs
      if (idsArray.length === 0) {
        return res.status(400).json({ 
          message: "No valid contact IDs provided" 
        });
      }
  
      // Get contacts
      const contacts = await storage.getContactsByIds(idsArray);
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  });

  // Get contact tasks
  app.get("/api/contacts/:id/tasks", isAuthenticated, async (req, res, next) => {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
  
      const taskFeedbacks = await storage.getContactTaskFeedbacks(contactId);
  
      res.json(taskFeedbacks);
    } catch (error) {
      next(error);
    }
  });

  // Add this with other API routes
  app.get("/api/users", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as User;
      
      // Only admin users can fetch all users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only admins can view all users" 
        });
      }

      const users = await storage.getUsers();
      res.json(users);
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

      contactData.assignedTo = [req?.user?.username || ""];
      
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

  // Add this after your other contact routes
  app.put("/api/contacts-bulk/update", isAuthenticated, async (req, res, next) => {

    // return res.status(200).json({ message: "Not implemented", req: req.body });
    try {
      const { contactIds, field, value, updateMode } = req.body;

      // Validate request body
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: "contactIds must be a non-empty array" });
      }
      if (!field || typeof field !== "string") {
        return res.status(400).json({ message: "field must be a string" });
      }

      if (!value || typeof value !== "string") {
        // Check if value is an array for assignedTo field
        if (field === "assignedTo" && Array.isArray(value)) {
          // Check if all values in the array are strings
          const allStrings = value.every(item => typeof item === "string");
          if (!allStrings) {
            return res.status(400).json({ message: "assignedTo must be an array of strings" });
          }
        } else {
          // If not assignedTo, ensure value is a string
          return res.status(400).json({ message: "value must be a string" });
        }
      }

      // Handle special case for assignedTo field (it's an array in the database)
      if (field === "assignedTo") {
        // Check if users exist
        const usernames = Array.isArray(value) ? value : [value];
        const existingUsers = await storage.getUsers();
        const existingUsernames = existingUsers.map(user => user.username);
        
        // Validate usernames
        const invalidUsernames = usernames.filter(username => !existingUsernames.includes(username));
        if (invalidUsernames.length > 0) {
          return res.status(400).json({ 
            message: `The following users don't exist: ${invalidUsernames.join(', ')}` 
          });
        }

        // Get the contacts to update
        const contacts = await Promise.all(
          contactIds.map(id => storage.getContactById(id))
        );
        
        // Update each contact's assignedTo field
        for (const contact of contacts) {
          if (!contact) continue;
          
          let newAssignedTo: string[];
          
          if (updateMode === "add") {
            // Add new users to existing ones without duplicates
            const currentAssigned = contact.assignedTo || [];
            newAssignedTo = [...new Set([...usernames, ...currentAssigned])];
          } else {
            // Replace existing users
            newAssignedTo = usernames;
          }
          
          await storage.updateContact(contact.id, { assignedTo: newAssignedTo });
        }
        
        return res.json({ 
          message: `Updated assignedTo field for ${contactIds.length} contacts` 
        });
      } else {
        // Standard field update for other fields
        for (const id of contactIds) {
          await storage.updateContact(id, { [field]: value });
        }
        
        return res.json({ 
          message: `Updated ${field} for ${contactIds.length} contacts` 
        });
      }

    } catch (error) {
      next(error);
    }
  });

  // Add bulk delete route
  app.delete("/api/contacts-bulk/delete", isAuthenticated, async (req, res, next) => {
    try {
      const { contactIds } = req.body;

      // Validate request body
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: "contactIds must be a non-empty array" });
      }

      // Perform bulk delete
      const deletedCount = await storage.bulkDeleteContacts(contactIds);

      res.json({ 
        message: `Successfully deleted ${deletedCount} contacts`,
        deleted: deletedCount
      });
    } catch (error) {
      next(error);
    }
  });

  // Add bulk update route with new options
  // app.put("/api/contacts/bulk", isAuthenticated, async (req, res) => {
  //   try {
  //     const { contactIds, field, value, updateMode } = req.body;
      
  //     if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
  //       return res.status(400).json({ message: "Contact IDs are required" });
  //     }
      
  //     if (!field) {
  //       return res.status(400).json({ message: "Field to update is required" });
  //     }
      
  //     if (value === undefined || value === null) {
  //       return res.status(400).json({ message: "Update value is required" });
  //     }

      
  //   } catch (error) {
  //     console.error("Bulk update error:", error);
  //     res.status(500).json({ message: "Failed to update contacts" });
  //   }
  // });

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
      { header: 'Organisation', key: 'organisation', width: 20 },
      { header: 'Pincode', key: 'pincode', width: 10 },
      { header: 'Occupation', key: 'occupation', width: 10 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Category', key: 'category', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'CurrentStatus', key: 'currentstatus', width: 30 },
      { header: 'AssignedTo1', key: 'assignedTo1', width: 20 },
      { header: 'AssignedTo2', key: 'assignedTo2', width: 20 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Team', key: 'team', width: 10 },
    ];

    // Add a sample row
    worksheet.addRow({
      name: 'John Doe',
      mobile: '9876543210',
      email: 'john@example.com',
      area: 'Downtown',
      city: 'Mumbai',
      state: 'Maharashtra',
      organisation: 'Lokayat',
      pincode: '400001',
      priority: 'high',
      category: 'volunteer',
      status: 'active',
      currentstatus: 'feedback note here',
      assignedTo1: 'Name1',
      assignedTo2: 'Name2',
      sex: 'Male',
      team: 'lokayat-general',
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

  // === TASKS ROUTES ===

  // Add a route to get campaign names list
  app.get("/api/tasks/campaigns/list", isAuthenticated, async (req, res, next) => {
    try {
      // Get unique campaign names
      const campaignNames = await db
        .selectDistinct({ name: tasks.campaignName })
        .from(tasks)
        .where(isNotNull(tasks.campaignName))
        .orderBy(tasks.campaignName);
      
      // Remove any null or undefined campaign names
      const filteredCampaigns = campaignNames.filter(campaign => 
        campaign.name !== null && campaign.name !== undefined
      );
      
      res.json(filteredCampaigns);
    } catch (error) {
      next(error);
    }
  });

  // Add task routes
  app.post("/api/tasks", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as User;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create tasks" });
      }

      // Parse and validate the request body
      const parsedData = insertTaskSchema.parse({
        ...req.body,
        createdBy: user.username,
        // Ensure dueDate is in ISO string format
        dueDate: new Date(req.body.dueDate).toISOString(),
      });

      const task = await storage.createTask(parsedData);

      // Create task feedbacks for each contact
      const feedbacks = req.body.contacts.map((contactId: number) => ({
        taskId: task.id,
        contactId,
        assignedTo: parsedData.assignedTo,
      }));

      await storage.createTaskFeedbacks(feedbacks);

      res.json(task);
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

  app.get("/api/tasks", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { status, assignedTo, fromDate, toDate } = req.query;
  
      const filters: any = {};
      
      // Add filters based on query params
      if (status === 'completed') filters.isCompleted = true;
      if (status === 'pending') filters.isCompleted = false;
      if (assignedTo && assignedTo !== 'all') filters.assignedTo = assignedTo as string;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
  
      // Only admins can see all tasks, others see only their assigned tasks
      if (user.role !== 'admin') {
        filters.assignedTo = user.username;
      }
  
      const tasks = await storage.getAllTasksWithFilters(filters);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/task-feedback/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback, isCompleted, completedAt, response } = req.body;
      
      const updatedFeedback = await storage.updateTaskFeedback(parseInt(id), {
        feedback,
        isCompleted,
        completedAt,
        response, // Make sure this is included
      });

      // Get the taskId from the updated feedback
      if (updatedFeedback && updatedFeedback.taskId) {
        // Update the task completion status based on all feedback entries
        await storage.updateTaskCompletionStatus(updatedFeedback.taskId);
      }

      res.json(updatedFeedback);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.put("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      await db
        .update(tasks)
        .set({ isCompleted: true })
        .where(eq(tasks.id, taskId));
      
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });

  function isNotNull(value) {
    return value !== null && value !== undefined;
  }

  app.get("/api/tasks/campaigns", isAuthenticated, async (req, res, next) => {
    try {
      const { status, assignedTo, fromDate, toDate } = req.query;
      
      let query = db
        .select()
        .from(tasks)
        .where(
          and(
            isNotNull(tasks.campaignName),
            // Add filters
            status === 'completed' ? eq(tasks.isCompleted, true) : undefined,
            status === 'pending' ? eq(tasks.isCompleted, false) : undefined,
            assignedTo ? eq(tasks.assignedTo, assignedTo as string) : undefined,
            fromDate ? gte(tasks.dueDate, new Date(fromDate as string)) : undefined,
            toDate ? lte(tasks.dueDate, new Date(toDate as string)) : undefined,
          )
        )
        .orderBy(desc(tasks.createdAt));

      // Get tasks with their feedbacks
      const tasksWithFeedback = await Promise.all(
        (await query).map(async (task) => {
          const feedbacks = await db
            .select()
            .from(taskFeedback)
            .where(eq(taskFeedback.taskId, task.id));
          return { ...task, feedbacks };
        })
      );

      res.json(tasksWithFeedback);
    } catch (error) {
      next(error);
    }
  });

  // Add an endpoint for retrieving unique tasks
  app.get("/api/tasks/unique", isAuthenticated, async (req, res, next) => {
    try {
      // Get unique tasks with relevant info
      const uniqueTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          campaignName: tasks.campaignName,
        })
        .from(tasks)
        .orderBy(tasks.createdAt);
      
      res.json(uniqueTasks);
    } catch (error) {
      next(error);
    }
  });

  // Delete a task
  app.delete("/api/tasks/:id", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as User;
      const taskId = parseInt(req.params.id);
      
      // Get the task to verify permissions
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId)
      });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check permissions - only admin or the creator can delete
      if (user.role !== 'admin' && task.createdBy !== user.username) {
        return res.status(403).json({ message: "You don't have permission to delete this task" });
      }
      
      // Delete the task (cascade will delete related feedbacks)
      await db.delete(tasks).where(eq(tasks.id, taskId));
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });
  
  // Delete a campaign (deletes all tasks with the same campaign name)
  app.delete("/api/campaigns/:name", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as User;
      const campaignName = req.params.name;
      
      // Only admins can delete campaigns
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete campaigns" });
      }
      
      // Get all tasks in the campaign to check if it exists
      const campaignTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.campaignName, campaignName));
      
      if (campaignTasks.length === 0) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Delete all tasks in the campaign
      await db.delete(tasks).where(eq(tasks.campaignName, campaignName));
      
      res.status(204).send();
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
      
      const { eventId, updateExisting } = req.body;
      const shouldUpdateExisting = updateExisting === 'true'; // Convert string to boolean
      
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
      
      const user = req.user as User;
      const result = {
        created: 0,
        updated: 0,
        errors: [] as string[],
        assignedToCurrentUser: 0
      };
      
      const processedContacts: any[] = [];
      
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
          
          // Check if contact already exists
          const existingContact = await storage.getContactByMobile(mobile);
          
          if (existingContact && !shouldUpdateExisting) {
            // If contact exists and updateExisting is false, just use it for attendance
            // without modifying the contact information
            await storage.createAttendance({
              eventId: parseInt(eventId),
              contactId: existingContact.id
            });
            result.updated += 1;

            // always update assignedTo values //
            const contactData = existingContact;
            contactData.assignedTo = [row.getCell(14).text?.trim().toLowerCase(), row.getCell(15).text?.trim().toLowerCase()],

            await storage.updateContact(contactData.id, contactData)

            return; // Skip further processing for this contact
          }
          
          const contactData: any = {
            name,
            mobile,
            email: row.getCell(3).text?.trim(),
            area: row.getCell(4).text?.trim() || 'Unknown',
            city: row.getCell(5).text?.trim() || 'Unknown',
            state: row.getCell(6).text?.trim() || 'Other',
            nation: 'India',
            pincode: row.getCell(8).text?.trim(),
            occupation: row.getCell(9).text?.trim(),
            priority: row.getCell(10).text?.trim(),
            category: row.getCell(11).text?.trim(),
            status: row.getCell(12).text?.trim(),
            assignedTo: [row.getCell(14).text?.trim().toLowerCase(), row.getCell(15).text?.trim().toLowerCase()],
            team: row.getCell(17).text?.trim(),
            sex: row.getCell(16).text?.trim(),
            organisation: row.getCell(7).text?.trim(),
          };
          
          processedContacts.push(contactData);
        } catch (error) {
          console.error(error);
          result.errors.push(`Row ${rowNumber}: ${(error as Error).message}`);
        }
      });
      
      // Map usernames before saving
      const { mappedContacts, unmappedCount } = await mapAssignedToUsernames(
        processedContacts,
        req.user.username,
        storage
      );
      
      // Save contacts with mapped usernames
      const savedContacts = await Promise.all(
        mappedContacts.map(async (contact) => {
          if (shouldUpdateExisting) {
            // Check if contact exists to decide whether to update or create
            const existingContact = await storage.getContactByMobile(contact.mobile);
            if (existingContact) {
              const updatedContact = await storage.updateContact(existingContact.id, contact);
              result.updated += 1;
              return updatedContact;
            }
          }
          
          // Create new contact
          const newContact = await storage.createContact(contact);
          result.created += 1;
          return newContact;
        })
      );

      // Create event attendance records
      savedContacts.forEach(async (contact) => {
        const contactId = contact.id;
        await storage.createAttendance({
          eventId: parseInt(eventId),
          contactId
        });
      });

      // Add notification about unmapped usernames
      let message = `Successfully imported ${result.created} new contacts and updated ${result.updated} existing contacts.`;
      if (unmappedCount > 0) {
        message += ` ${unmappedCount} contacts had unknown assignees and were assigned to you.`;
      }
      
      res.status(201).json({
        message,
        created: result.created,
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      next(error);
    }
  });

  // Download follow-up template
  app.get("/api/download-followup-template", isAuthenticated, async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Follow-up Data');
      
      // Add headers
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Mobile Number', key: 'mobile', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 }
      ];
      
      // Add sample data
      worksheet.addRow({
        name: 'John Doe',
        mobile: '9876543210',
        status: 'Interested',
        notes: 'Will attend next event'
      });
      
      worksheet.addRow({
        name: 'Jane Smith',
        mobile: '8765432109',
        status: 'Not Interested',
        notes: 'Too busy at the moment'
      });
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=followup-template.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ message: "Error generating template" });
    }
  });

  // Import follow-up data from Excel
  app.post("/api/import-followup", isAuthenticated, upload.single('file'), async (req, res, next) => {
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
      
      const user = req.user as User;
      const result = {
        created: 0,
        updated: 0,
        errors: [] as string[]
      };
      
      // Skip header row
      worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        try {
          const name = row.getCell(1).text?.trim(); // Name column
          if (!name) {
            result.errors.push(`Row ${rowNumber}: Name is required`);
            return;
          }
          const mobile = row.getCell(2).text?.trim(); // Mobile column
          const status = row.getCell(3).text?.trim(); // Status column
          const notes = row.getCell(4).text?.trim(); // Notes column
          
          if (!mobile) {
            result.errors.push(`Row ${rowNumber}: Missing mobile number`);
            return;
          }
          
          // Find contact by mobile number and update with follow-up data
          const existingContact = await storage.getContactByMobile(mobile);
          if (existingContact) {
            const followUpData = {
              contactId: existingContact.id,
              status,
              notes,
              createdBy: user.username,
              completedDate: new Date(),
            };
            
            await storage.createFollowUp(followUpData);
            result.created += 1;
          } else {
            result.errors.push(`Row ${rowNumber}: No contact found with mobile ${mobile}`);
          }
        } catch (error) {
          result.errors.push(`Row ${rowNumber}: ${error.message || "Unknown error"}`);
        }
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Add campaign creation endpoint
  app.post("/api/campaigns", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as User;
      const campaignData: CampaignData = req.body;
      
      await db.transaction(async (trx) => {
        if (campaignData.fileData) {
          // Handle imported campaign
          for (const row of campaignData.fileData) {
            // Check if contact exists
            const [contactRecord] = await trx
              .select()
              .from(contactsTable)
              .where(eq(contactsTable.mobile, row.Mobile.replace(/\s/g, "")));

            let contact;
            if (!contactRecord) {
              // Create new contact
              const [newContact] = await trx
                .insert(contactsTable)
                .values({
                  name: row.Name,
                  mobile: row.Mobile.replace(/\s/g, ""),
                  assignedTo: [row["Assigned To"]],
                  area: "Unknown",
                  city: "Unknown",
                  state: "Unknown",
                  priority: "low",
                  category: "general",
                })
                .returning();
              contact = newContact;
            } else {
              contact = contactRecord;
            }

            // Create task and feedback
            const [task] = await trx
              .insert(tasks)
              .values({
                title: `${row["Task Name"]} Task`,
                description: campaignData.description,
                dueDate: new Date(campaignData.dueDate),
                assignedTo: row["Assigned To"],
                createdBy: user.username,
                campaignName: `${campaignData.name} Campaign`,
              })
              .returning();

            await trx
              .insert(taskFeedback)
              .values({
                taskId: task.id,
                contactId: contact.id,
                assignedTo: row["Assigned To"],
              });
          }
        } else {
          // Handle manual campaign
          for (const [username, contacts] of Object.entries(campaignData.contactDistribution)) {
            if (contacts.length === 0) {
              // Skip this user but continue processing other users
              continue;
            }

            // Create task for this user
            const [task] = await trx
              .insert(tasks)
              .values({
                title: `${campaignData.name} Task`,
                description: campaignData.description,
                dueDate: new Date(campaignData.dueDate),
                assignedTo: username,
                createdBy: user.username,
                campaignName: `${campaignData.name} Campaign`,
              })
              .returning();

            // Create feedback entries for each contact
            // Process contacts in batches to handle large payloads
            const BATCH_SIZE = 100;
            for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
              const batch = contacts.slice(i, i + BATCH_SIZE);
              
              // Process each batch
              await Promise.all(batch.map(contact => 
                trx.insert(taskFeedback).values({
                  taskId: task.id,
                  contactId: contact.id,
                  assignedTo: username,
                })
              ));
            }
          }
        }
      });

      res.json({ message: "Campaign created successfully" });
    } catch (error) {
      console.error("Campaign creation error:", error);
      next(error);
    }
  });

  // === SETTINGS ROUTES ===
  // Add these routes after other settings routes
  app.get("/api/settings/activities", isAuthenticated, async (req, res, next) => {
    try {
      const activities = await storage.getPredefinedActivities();
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/settings/activities", isAuthenticated, async (req, res, next) => {
    try {
      const activity = await storage.createPredefinedActivity(req.body);
      res.status(201).json(activity);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/settings/activities/:name", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deletePredefinedActivity(req.params.name);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/settings/users", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as User;
      
      // Only admin users can fetch all users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only admins can view all users" 
        });
      }

      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/settings/users", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as User;
      
      // Only admin users can create users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only admins can create users" 
        });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/settings/users/:username", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as User;
      
      // Only admin users can update users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only admins can update users" 
        });
      }

      const { role, mobile } = req.body;
      
      // Update user
      const updatedUser = await storage.updateUser(req.params.username, { role, mobile });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/settings/users/:username", isAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as User;
      
      // Only admin users can delete users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          message: "Only admins can delete users" 
        });
      }

      // Prevent self-deletion
      if (currentUser.username === req.params.username) {
        return res.status(400).json({
          message: "Cannot delete your own account"
        });
      }

      await storage.deleteUser(req.params.username);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Response stats endpoint
  app.get("/api/task-feedback/response-stats", isAuthenticated, async (req, res, next) => {
    try {
      const { campaignName, timeRange } = req.query;
      
      // Calculate date range
      let fromDate;
      if (timeRange === "7days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeRange === "30days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (timeRange === "90days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
      }
      
      // Build task filters
      const taskFilters = [];
      if (campaignName && campaignName !== "all") {
        taskFilters.push(eq(tasks.campaignName, campaignName as string));
      }
      if (fromDate) {
        taskFilters.push(gte(tasks.createdAt, fromDate));
      }
      
      // Get tasks based on filters
      let taskQuery = db.select().from(tasks);
      if (taskFilters.length > 0) {
        taskQuery = taskQuery.where(and(...taskFilters));
      }
      
      const tasksList = await taskQuery;
      const taskIds = tasksList.map(task => task.id);
      
      // Get feedback data for these tasks
      const feedbackData = await db.select()
        .from(taskFeedback)
        .where(taskIds.length > 0 ? inArray(taskFeedback.taskId, taskIds) : undefined);
      
      // Count response types
      const yesResponses = feedbackData.filter(fb => fb.response === "Yes").length;
      const noResponses = feedbackData.filter(fb => fb.response === "No").length;
      const tentativeResponses = feedbackData.filter(fb => fb.response === "Tentative").length;
      
      res.json({
        yes: yesResponses,
        no: noResponses,
        tentative: tentativeResponses
      });
    } catch (error) {
      next(error);
    }
  });
  
  // User task stats endpoint
  app.get("/api/task-feedback/user-stats", isAuthenticated, async (req, res, next) => {
    try {
      const { campaignName, timeRange } = req.query;
      
      // Calculate date range
      let fromDate;
      if (timeRange === "7days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeRange === "30days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (timeRange === "90days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
      }
      
      // Get all users
      const allUsers = await db.select().from(users);
      
      const userStats = await Promise.all(
        allUsers.map(async (user) => {
          // Build filters for this user
          const filters = [eq(taskFeedback.assignedTo, user.username)];
          
          if (campaignName && campaignName !== "all") {
            const userTasks = await db.select()
              .from(tasks)
              .where(eq(tasks.campaignName, campaignName as string));
            
            const userTaskIds = userTasks.map(task => task.id);
            if (userTaskIds.length > 0) {
              filters.push(inArray(taskFeedback.taskId, userTaskIds));
            } else {
              // No tasks for this campaign, return empty stats
              return {
                username: user.username,
                assigned: 0,
                completed: 0,
                completionRate: 0
              };
            }
          }
          
          if (fromDate) {
            const tasksWithinRange = await db.select()
              .from(tasks)
              .where(gte(tasks.createdAt, fromDate));
            
            const tasksWithinRangeIds = tasksWithinRange.map(task => task.id);
            if (tasksWithinRangeIds.length > 0) {
              filters.push(inArray(taskFeedback.taskId, tasksWithinRangeIds));
            }
          }
          
          // Get assigned feedbacks
          const assignedFeedbacks = await db.select()
            .from(taskFeedback)
            .where(and(...filters));
          
          // Count completed
          const completedFeedbacks = assignedFeedbacks.filter(fb => fb.isCompleted);
          
          // Calculate stats
          const assigned = assignedFeedbacks.length;
          const completed = completedFeedbacks.length;
          const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
          
          return {
            username: user.username,
            assigned,
            completed,
            completionRate
          };
        })
      );
      
      // Filter out users with no assignments and sort by completion rate
      const filteredUserStats = userStats
        .filter(stats => stats.assigned > 0)
        .sort((a, b) => b.completionRate - a.completionRate);
      
      res.json(filteredUserStats);
    } catch (error) {
      next(error);
    }
  });
  
  // City stats endpoint
  app.get("/api/task-feedback/city-stats", isAuthenticated, async (req, res, next) => {
    try {
      const { campaignName, timeRange } = req.query;
      
      // Calculate date range
      let fromDate;
      if (timeRange === "7days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeRange === "30days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (timeRange === "90days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
      }
      
      // Get tasks based on filters
      let taskFilters = [];
      if (campaignName && campaignName !== "all") {
        taskFilters.push(eq(tasks.campaignName, campaignName as string));
      }
      if (fromDate) {
        taskFilters.push(gte(tasks.createdAt, fromDate));
      }
      
      const tasksList = taskFilters.length > 0
        ? await db.select().from(tasks).where(and(...taskFilters))
        : await db.select().from(tasks);
      
      const taskIds = tasksList.map(task => task.id);
      
      // Get all feedback for these tasks
      const feedbacks = taskIds.length > 0
        ? await db.select().from(taskFeedback).where(inArray(taskFeedback.taskId, taskIds))
        : await db.select().from(taskFeedback);
      
      // Get all contacts
      const contactIds = feedbacks.map(fb => fb.contactId);
      const contactsList = contactIds.length > 0
        ? await db.select().from(contactsTable).where(inArray(contactsTable.id, contactIds))
        : [];
      
      // Map feedback to contacts with their cities
      const contactFeedbacks = feedbacks.map(fb => {
        const contact = contactsList.find(c => c.id === fb.contactId);
        return {
          city: contact?.city || "Unknown",
          response: fb.response
        };
      });
      
      // Group by city and count
      const cityStats = contactFeedbacks.reduce((acc, { city, response }) => {
        if (!acc[city]) {
          acc[city] = { count: 0, yesResponses: 0, noResponses: 0, tentativeResponses: 0 };
        }
        
        acc[city].count++;
        
        if (response === "Yes") {
          acc[city].yesResponses++;
        } else if (response === "No") {
          acc[city].noResponses++;
        } else if (response === "Tentative") {
          acc[city].tentativeResponses++;
        }
        
        return acc;
      }, {});
      
      // Convert to array and sort by count
      const result = Object.entries(cityStats).map(([city, stats]) => ({
        city,
        ...stats
      })).sort((a, b) => b.count - a.count);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Campaign stats endpoint
  app.get("/api/task-feedback/campaign-stats", isAuthenticated, async (req, res, next) => {
    try {
      const { timeRange } = req.query;
      
      // Calculate date range
      let fromDate;
      if (timeRange === "7days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeRange === "30days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (timeRange === "90days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
      }
      
      // Get all campaigns
      const campaignNames = await db
        .selectDistinct({ name: tasks.campaignName })
        .from(tasks)
        .where(isNotNull(tasks.campaignName));
      
      const campaignStats = await Promise.all(
        campaignNames.map(async ({ name }) => {
          // Build filters
          const filters = [eq(tasks.campaignName, name)];
          if (fromDate) {
            filters.push(gte(tasks.createdAt, fromDate));
          }
          
          // Get tasks for this campaign
          const campaignTasks = await db
            .select()
            .from(tasks)
            .where(and(...filters));
          
          // Calculate task stats
          const total = campaignTasks.length;
          const completed = campaignTasks.filter(task => task.isCompleted).length;
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
          
          // Get feedback for these tasks
          const taskIds = campaignTasks.map(task => task.id);
          const feedbacks = taskIds.length > 0
            ? await db.select().from(taskFeedback).where(inArray(taskFeedback.taskId, taskIds))
            : [];
          
          // Count responses
          const yesResponses = feedbacks.filter(fb => fb.response === "Yes").length;
          const noResponses = feedbacks.filter(fb => fb.response === "No").length;
          const tentativeResponses = feedbacks.filter(fb => fb.response === "Tentative").length;
          
          return {
            name,
            total,
            completed,
            completionRate,
            responseStats: {
              yes: yesResponses,
              no: noResponses,
              tentative: tentativeResponses
            }
          };
        })
      );
      
      // Sort campaigns by completion rate
      const sortedCampaignStats = campaignStats
        .filter(stats => stats.total > 0)
        .sort((a, b) => b.completionRate - a.completionRate);
      
      res.json(sortedCampaignStats);
    } catch (error) {
      next(error);
    }
  });

  // Add a new endpoint for retrieving contacts by response type
  app.get("/api/task-feedback/contacts-by-response", isAuthenticated, async (req, res, next) => {
    try {
      const { responseType, campaignName, timeRange } = req.query;
      
      if (!responseType) {
        return res.status(400).json({ message: "Response type is required" });
      }

      // Calculate date range
      let fromDate;
      if (timeRange === "7days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (timeRange === "30days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (timeRange === "90days") {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 90);
      }
      
      // Get tasks based on filters
      let taskFilters = [];
      if (campaignName && campaignName !== "all") {
        taskFilters.push(eq(tasks.campaignName, campaignName as string));
      }
      if (fromDate) {
        taskFilters.push(gte(tasks.createdAt, fromDate));
      }
      
      const tasksList = taskFilters.length > 0
        ? await db.select().from(tasks).where(and(...taskFilters))
        : await db.select().from(tasks);
      
      const taskIds = tasksList.map(task => task.id);
      
      if (taskIds.length === 0) {
        return res.json([]);
      }
      
      // Get feedbacks with the specified response type
      const feedbacks = await db.select()
        .from(taskFeedback)
        .where(
          and(
            inArray(taskFeedback.taskId, taskIds),
            eq(taskFeedback.response, responseType as string)
          )
        );
      
      if (feedbacks.length === 0) {
        return res.json([]);
      }
      
      // Get contacts data
      const contactIds = feedbacks.map(fb => fb.contactId);
      const contactsList = await db.select()
        .from(contactsTable)
        .where(inArray(contactsTable.id, contactIds));
      
      // Build the result with contact and task info
      const result = await Promise.all(
        feedbacks.map(async (fb) => {
          const contact = contactsList.find(c => c.id === fb.contactId);
          const task = tasksList.find(t => t.id === fb.taskId);
          
          if (!contact || !task) return null;
          
          return {
            id: contact.id,
            name: contact.name,
            mobile: contact.mobile,
            email: contact.email,
            city: contact.city,
            response: fb.response,
            feedback: fb.feedback,
            taskTitle: task.title,
            assignedTo: fb.assignedTo
          };
        })
      );
      
      // Filter out null values and send response
      res.json(result.filter(Boolean));
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
