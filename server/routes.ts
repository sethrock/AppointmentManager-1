import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertAppointmentSchema, insertClientSchema } from "@shared/schema";
import { handleNewAppointmentNotifications, handleAppointmentStatusNotifications } from "./services/notificationService";
import { testEmailSending, testCalendarConnection } from "./services/testService";
import { importAppointmentsFromJson, validateImportFile } from "./services/importService";
import { log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupSession } from "./middleware/session";
import { registerHandler, loginHandler, logoutHandler, getCurrentUserHandler, isAuthenticated } from "./middleware/auth";
import { uploadPhoto, uploadDocument, handleUploadError } from "./middleware/upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);
  
  // API Routes - all prefixed with /api
  
  // ===== Authentication ===== //
  app.post("/api/auth/register", registerHandler);
  app.post("/api/auth/login", loginHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.get("/api/auth/me", getCurrentUserHandler);
  
  // ===== Providers ===== //
  
  // List providers with filters
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const { search, department, status, archived, limit, offset, sortBy, sortOrder } = req.query;
      
      const filters = {
        search: search as string,
        department: department as string,
        status: status as string,
        archived: archived === 'true',
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'asc'
      };
      
      const result = await storage.listProviders(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to retrieve providers" });
    }
  });
  
  // Search providers
  app.get("/api/providers/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json({ providers: [], total: 0 });
      }
      
      const result = await storage.listProviders({
        search: q as string,
        limit: 10
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error searching providers:", error);
      res.status(500).json({ message: "Failed to search providers" });
    }
  });
  
  // Get provider by ID
  app.get("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const provider = await storage.getProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error fetching provider:", error);
      res.status(500).json({ message: "Failed to retrieve provider" });
    }
  });
  
  // Create provider
  app.post("/api/providers", async (req: Request, res: Response) => {
    try {
      const { insertProviderSchema } = await import("@shared/schema");
      const validation = insertProviderSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid provider data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      // Check for duplicate email
      if (validation.data.email) {
        const existingByEmail = await storage.getProviderByEmail(validation.data.email);
        if (existingByEmail) {
          return res.status(409).json({ message: "Provider with this email already exists" });
        }
      }
      
      const provider = await storage.createProvider(validation.data);
      res.status(201).json(provider);
    } catch (error) {
      console.error("Error creating provider:", error);
      res.status(500).json({ message: "Failed to create provider" });
    }
  });
  
  // Update provider
  app.put("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const { insertProviderSchema } = await import("@shared/schema");
      const validation = insertProviderSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid provider data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const provider = await storage.updateProvider(id, validation.data);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error updating provider:", error);
      res.status(500).json({ message: "Failed to update provider" });
    }
  });
  
  // Archive provider
  app.patch("/api/providers/:id/archive", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // Get current user ID from session if available
      const userId = (req.session as any)?.userId;
      
      const provider = await storage.archiveProvider(id, userId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error archiving provider:", error);
      res.status(500).json({ message: "Failed to archive provider" });
    }
  });
  
  // Unarchive provider
  app.patch("/api/providers/:id/unarchive", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // Get current user ID from session if available
      const userId = (req.session as any)?.userId;
      
      const provider = await storage.unarchiveProvider(id, userId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error unarchiving provider:", error);
      res.status(500).json({ message: "Failed to unarchive provider" });
    }
  });
  
  // Delete provider (only if archived)
  app.delete("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const success = await storage.deleteProvider(id);
      if (!success) {
        return res.status(400).json({ message: "Provider not found or not archived" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting provider:", error);
      res.status(500).json({ message: "Failed to delete provider" });
    }
  });
  
  // ===== Provider Photo Upload ===== //
  
  // Upload provider photo
  app.post("/api/providers/:id/photo", 
    uploadPhoto.single('photo'),
    handleUploadError,
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ message: "Invalid provider ID" });
        }
        
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Generate the relative URL path for the uploaded photo
        const photoUrl = `/uploads/providers/${providerId}/photos/${req.file.filename}`;
        
        // Update provider's photoUrl in database
        const provider = await storage.updateProvider(providerId, { photoUrl });
        if (!provider) {
          // Clean up uploaded file if provider not found
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: "Provider not found" });
        }
        
        // Create audit log
        const userId = (req.session as any)?.userId;
        await storage.createAuditLog({
          entity: 'provider',
          entityId: providerId,
          action: 'PHOTO_UPLOAD',
          actorUserId: userId,
          metadata: { filename: req.file.filename, photoUrl }
        });
        
        res.json({ 
          photoUrl,
          message: "Photo uploaded successfully"
        });
      } catch (error) {
        console.error("Error uploading provider photo:", error);
        res.status(500).json({ message: "Failed to upload photo" });
      }
    }
  );
  
  // ===== Provider Credentials ===== //
  
  // Get provider credentials
  app.get("/api/providers/:id/credentials", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const credentials = await storage.getProviderCredentials(providerId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching provider credentials:", error);
      res.status(500).json({ message: "Failed to retrieve provider credentials" });
    }
  });
  
  // Create provider credentials
  app.post("/api/providers/:id/credentials", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const { insertProviderCredentialsSchema } = await import("@shared/schema");
      const validation = insertProviderCredentialsSchema.safeParse({ ...req.body, providerId });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid credentials data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const credentials = await storage.createProviderCredentials(validation.data);
      res.status(201).json(credentials);
    } catch (error) {
      console.error("Error creating provider credentials:", error);
      res.status(500).json({ message: "Failed to create provider credentials" });
    }
  });
  
  // Update provider credentials
  app.put("/api/providers/credentials/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid credentials ID" });
      }
      
      const { insertProviderCredentialsSchema } = await import("@shared/schema");
      const validation = insertProviderCredentialsSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid credentials data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const credentials = await storage.updateProviderCredentials(id, validation.data);
      if (!credentials) {
        return res.status(404).json({ message: "Credentials not found" });
      }
      
      res.json(credentials);
    } catch (error) {
      console.error("Error updating provider credentials:", error);
      res.status(500).json({ message: "Failed to update provider credentials" });
    }
  });
  
  // Delete provider credentials
  app.delete("/api/providers/credentials/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid credentials ID" });
      }
      
      const success = await storage.deleteProviderCredentials(id);
      if (!success) {
        return res.status(404).json({ message: "Credentials not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting provider credentials:", error);
      res.status(500).json({ message: "Failed to delete provider credentials" });
    }
  });
  
  // ===== Provider Compensation ===== //
  
  // Get provider compensation history
  app.get("/api/providers/:id/compensation", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const compensation = await storage.getProviderCompensation(providerId);
      res.json(compensation);
    } catch (error) {
      console.error("Error fetching provider compensation:", error);
      res.status(500).json({ message: "Failed to retrieve provider compensation" });
    }
  });
  
  // Get current provider compensation
  app.get("/api/providers/:id/compensation/current", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const compensation = await storage.getCurrentProviderCompensation(providerId);
      if (!compensation) {
        return res.status(404).json({ message: "No current compensation found" });
      }
      
      res.json(compensation);
    } catch (error) {
      console.error("Error fetching current provider compensation:", error);
      res.status(500).json({ message: "Failed to retrieve current provider compensation" });
    }
  });
  
  // Create provider compensation
  app.post("/api/providers/:id/compensation", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const { insertProviderCompensationSchema } = await import("@shared/schema");
      const validation = insertProviderCompensationSchema.safeParse({ ...req.body, providerId });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid compensation data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const compensation = await storage.createProviderCompensation(validation.data);
      res.status(201).json(compensation);
    } catch (error) {
      console.error("Error creating provider compensation:", error);
      res.status(500).json({ message: "Failed to create provider compensation" });
    }
  });
  
  // Update provider compensation
  app.put("/api/providers/compensation/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid compensation ID" });
      }
      
      const { insertProviderCompensationSchema } = await import("@shared/schema");
      const validation = insertProviderCompensationSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid compensation data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const compensation = await storage.updateProviderCompensation(id, validation.data);
      if (!compensation) {
        return res.status(404).json({ message: "Compensation record not found" });
      }
      
      res.json(compensation);
    } catch (error) {
      console.error("Error updating provider compensation:", error);
      res.status(500).json({ message: "Failed to update provider compensation" });
    }
  });
  
  // Delete provider compensation
  app.delete("/api/providers/compensation/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid compensation ID" });
      }
      
      const success = await storage.deleteProviderCompensation(id);
      if (!success) {
        return res.status(404).json({ message: "Compensation record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting provider compensation:", error);
      res.status(500).json({ message: "Failed to delete provider compensation" });
    }
  });
  
  // ===== Provider Contacts ===== //
  
  // Get provider contacts
  app.get("/api/providers/:id/contacts", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const contacts = await storage.getProviderContacts(providerId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching provider contacts:", error);
      res.status(500).json({ message: "Failed to retrieve provider contacts" });
    }
  });
  
  // Create provider contact
  app.post("/api/providers/:id/contacts", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const { insertProviderContactsSchema } = await import("@shared/schema");
      const validation = insertProviderContactsSchema.safeParse({ ...req.body, providerId });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid contact data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const contact = await storage.createProviderContact(validation.data);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating provider contact:", error);
      res.status(500).json({ message: "Failed to create provider contact" });
    }
  });
  
  // Update provider contact
  app.put("/api/providers/contacts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const { insertProviderContactsSchema } = await import("@shared/schema");
      const validation = insertProviderContactsSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid contact data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const contact = await storage.updateProviderContact(id, validation.data);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error updating provider contact:", error);
      res.status(500).json({ message: "Failed to update provider contact" });
    }
  });
  
  // Delete provider contact
  app.delete("/api/providers/contacts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      const success = await storage.deleteProviderContact(id);
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting provider contact:", error);
      res.status(500).json({ message: "Failed to delete provider contact" });
    }
  });
  
  // ===== Provider Documents ===== //
  
  // Get provider documents
  app.get("/api/providers/:id/documents", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      if (isNaN(providerId)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const documents = await storage.getProviderDocuments(providerId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching provider documents:", error);
      res.status(500).json({ message: "Failed to retrieve provider documents" });
    }
  });
  
  // Upload provider document
  app.post("/api/providers/:id/documents",
    uploadDocument.single('document'),
    handleUploadError,
    async (req: Request, res: Response) => {
      try {
        const providerId = parseInt(req.params.id);
        if (isNaN(providerId)) {
          return res.status(400).json({ message: "Invalid provider ID" });
        }
        
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Extract document type and description from request body
        const { documentType, description } = req.body;
        if (!documentType) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Document type is required" });
        }
        
        // Generate the relative URL path for the document
        const filePath = `/uploads/providers/${providerId}/documents/${req.file.filename}`;
        
        // Create document record in database
        const { insertProviderDocumentsSchema } = await import("@shared/schema");
        const documentData = {
          providerId,
          documentType,
          description: description || null,
          filePath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: (req.session as any)?.userId || null
        };
        
        const validation = insertProviderDocumentsSchema.safeParse(documentData);
        if (!validation.success) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ 
            message: "Invalid document data",
            errors: fromZodError(validation.error).message 
          });
        }
        
        const document = await storage.createProviderDocument(validation.data);
        
        // Create audit log
        const userId = (req.session as any)?.userId;
        await storage.createAuditLog({
          entity: 'provider',
          entityId: providerId,
          action: 'DOCUMENT_UPLOAD',
          actorUserId: userId,
          metadata: { 
            documentId: document.id,
            documentType,
            fileName: req.file.originalname,
            filePath 
          }
        });
        
        res.status(201).json(document);
      } catch (error) {
        console.error("Error uploading provider document:", error);
        res.status(500).json({ message: "Failed to upload document" });
      }
    }
  );
  
  // Delete provider document
  app.delete("/api/providers/:id/documents/:docId", async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const docId = parseInt(req.params.docId);
      
      if (isNaN(providerId) || isNaN(docId)) {
        return res.status(400).json({ message: "Invalid provider or document ID" });
      }
      
      // Get document to find file path
      const documents = await storage.getProviderDocuments(providerId);
      const document = documents.find(d => d.id === docId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Delete file from filesystem
      const fullPath = path.join(process.cwd(), document.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      
      // Delete database record
      const success = await storage.deleteProviderDocument(docId);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Create audit log
      const userId = (req.session as any)?.userId;
      await storage.createAuditLog({
        entity: 'provider',
        entityId: providerId,
        action: 'DOCUMENT_DELETE',
        actorUserId: userId,
        metadata: { 
          documentId: docId,
          documentType: document.documentType,
          fileName: document.fileName
        }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting provider document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
  
  // ===== Audit Logs ===== //
  
  // Get audit logs for an entity
  app.get("/api/audit-logs/:entity/:entityId", async (req: Request, res: Response) => {
    try {
      const { entity, entityId } = req.params;
      const id = parseInt(entityId);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entity ID" });
      }
      
      const logs = await storage.getAuditLogs(entity, id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to retrieve audit logs" });
    }
  });
  
  // ===== Clients ===== //
  
  // Get all clients with filters
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      const { search, status, marketingChannel, limit, offset } = req.query;
      
      const filters = {
        search: search as string,
        status: status as string,
        marketingChannel: marketingChannel as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      const result = await storage.getClients(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to retrieve clients" });
    }
  });
  
  // Search clients
  app.get("/api/clients/search", async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.json({ clients: [], total: 0 });
      }
      
      const result = await storage.getClients({
        search: q as string,
        limit: 10
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error searching clients:", error);
      res.status(500).json({ message: "Failed to search clients" });
    }
  });
  
  // Get single client
  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to retrieve client" });
    }
  });
  
  // Get client appointments
  app.get("/api/clients/:id/appointments", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const appointments = await storage.getClientAppointments(id);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ message: "Failed to retrieve client appointments" });
    }
  });
  
  // Get client analytics
  app.get("/api/clients/:id/analytics", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const appointments = await storage.getClientAppointments(id);
      
      // Calculate analytics
      const completedAppointments = appointments.filter(a => a.dispositionStatus === 'Complete');
      const cancelledAppointments = appointments.filter(a => a.dispositionStatus === 'Cancel');
      const rescheduledAppointments = appointments.filter(a => a.rescheduleOccurrences && a.rescheduleOccurrences > 0);
      
      const analytics = {
        clientId: id,
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        rescheduledAppointments: rescheduledAppointments.length,
        cancellationRate: appointments.length > 0 ? (cancelledAppointments.length / appointments.length) * 100 : 0,
        lifetimeValue: client.totalRevenue || 0,
        averageAppointmentValue: completedAppointments.length > 0 
          ? (client.totalRevenue || 0) / completedAppointments.length 
          : 0,
        lastAppointmentDate: client.lastAppointmentDate,
        preferredProviders: getPreferredProviders(appointments),
        preferredTimes: getPreferredTimes(appointments),
        paymentMethods: getPaymentMethods(completedAppointments)
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching client analytics:", error);
      res.status(500).json({ message: "Failed to retrieve client analytics" });
    }
  });
  
  // Create new client
  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const validation = insertClientSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid client data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      // Check for duplicates
      if (validation.data.email) {
        const existingByEmail = await storage.getClientByEmail(validation.data.email);
        if (existingByEmail) {
          return res.status(409).json({ message: "Client with this email already exists" });
        }
      }
      
      if (validation.data.phoneNumber) {
        const existingByPhone = await storage.getClientByPhone(validation.data.phoneNumber);
        if (existingByPhone) {
          return res.status(409).json({ message: "Client with this phone number already exists" });
        }
      }
      
      const client = await storage.createClient(validation.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });
  
  // Update client
  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const validation = insertClientSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid client data",
          errors: fromZodError(validation.error).message 
        });
      }
      
      const client = await storage.updateClient(id, validation.data);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });
  
  // Delete client
  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });
  
  // Bulk export clients
  app.post("/api/clients/bulk/export", async (req: Request, res: Response) => {
    try {
      const { filters } = req.body;
      const result = await storage.getClients({
        ...filters,
        limit: 10000 // Export up to 10k clients
      });
      
      // Convert to CSV format
      const csv = convertClientsToCSV(result.clients);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting clients:", error);
      res.status(500).json({ message: "Failed to export clients" });
    }
  });
  
  // ===== Appointments ===== //
  
  // Get all appointments
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to retrieve appointments" });
    }
  });
  
  // Get a single appointment
  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to retrieve appointment" });
    }
  });
  
  // Create a new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Validate request body against schema
      const parsedData = insertAppointmentSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const newAppointment = await storage.createAppointment(parsedData.data);
      
      // Send notifications for the new appointment (async)
      handleNewAppointmentNotifications(newAppointment)
        .then(async (result) => {
          log(`Notifications processed for new appointment ${newAppointment.id}`, 'routes');
        })
        .catch(error => {
          log(`Error processing notifications for appointment ${newAppointment.id}: ${error}`, 'routes');
        });
      
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });
  
  // Update an appointment
  app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      // Get the current appointment to track status changes
      const currentAppointment = await storage.getAppointment(id);
      if (!currentAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Store the previous status to detect changes
      const previousStatus = currentAppointment.dispositionStatus || null;
      
      // Partial validation - only validate fields that are included
      const partialSchema = insertAppointmentSchema.partial();
      const parsedData = partialSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, parsedData.data);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Handle notifications when disposition status changes OR when reschedule dates change
      const isStatusChange = parsedData.data.dispositionStatus && 
                           parsedData.data.dispositionStatus !== previousStatus;
      
      const isRescheduleUpdate = updatedAppointment.dispositionStatus === 'Reschedule' && 
                                (parsedData.data.updatedStartDate || 
                                 parsedData.data.updatedStartTime || 
                                 parsedData.data.updatedEndDate || 
                                 parsedData.data.updatedEndTime);
      
      if (isStatusChange || isRescheduleUpdate) {
        // Process notifications asynchronously to not block the response
        handleAppointmentStatusNotifications(updatedAppointment, previousStatus)
          .then(() => {
            if (isStatusChange) {
              log(`Status notifications processed for appointment ${id} (${previousStatus} -> ${updatedAppointment.dispositionStatus})`, 'routes');
            } else {
              log(`Reschedule date/time update notifications processed for appointment ${id}`, 'routes');
            }
          })
          .catch(error => {
            log(`Error processing notifications for appointment ${id}: ${error}`, 'routes');
          });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });
  
  // Delete an appointment
  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });
  
  // Confirm deposit return
  app.patch("/api/appointments/:id/confirm-deposit-return", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const updatedAppointment = await storage.confirmDepositReturn(id);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error confirming deposit return:", error);
      res.status(500).json({ message: "Failed to confirm deposit return" });
    }
  });
  
  // ===== Import Data ===== //
  
  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept any file with .json extension regardless of mimetype
      if (file.originalname.toLowerCase().endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed'));
      }
    }
  });
  
  // Validate import file
  app.post("/api/import/validate", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await validateImportFile(filePath);
      
      res.json({
        message: `Validation completed. Valid: ${result.valid}, Invalid: ${result.invalid}`,
        ...result
      });
    } catch (error) {
      console.error("Error validating import file:", error);
      res.status(500).json({ 
        message: `Error validating import file: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Import appointments from file
  app.post("/api/import/appointments", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await importAppointmentsFromJson(filePath);
      
      res.json({
        message: `Import completed. Imported ${result.success} appointments, Failed: ${result.failed}`,
        ...result
      });
    } catch (error) {
      console.error("Error importing appointments:", error);
      res.status(500).json({ 
        message: `Error importing appointments: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // ===== Test Endpoints ===== //
  
  // Test email notification
  app.post("/api/test/email", async (req: Request, res: Response) => {
    try {
      const success = await testEmailSending();
      if (success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully. Check the email address configured in NOTIFICATION_EMAIL." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error sending test email: ${error}` 
      });
    }
  });
  
  // Test Google Calendar connection
  app.post("/api/test/calendar", async (req: Request, res: Response) => {
    try {
      const success = await testCalendarConnection();
      if (success) {
        res.json({ 
          success: true, 
          message: "Successfully connected to Google Calendar API." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to connect to Google Calendar API. Check server logs for details or make sure GOOGLE_REFRESH_TOKEN is configured." 
        });
      }
    } catch (error) {
      console.error("Error testing calendar connection:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing calendar connection: ${error}` 
      });
    }
  });

  // Secure database import endpoints
  app.post("/api/import/preview", async (req: Request, res: Response) => {
    try {
      const { previewImport } = await import('./services/secureImportService');
      const filePath = './server/data/6.2.25_database.json';
      const result = await previewImport(filePath);
      
      res.json({
        message: "Preview completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Error previewing import:", error);
      res.status(500).json({ 
        message: `Error previewing import: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.post("/api/import/secure", async (req: Request, res: Response) => {
    try {
      const { secureImportAppointments } = await import('./services/secureImportService');
      const filePath = './server/data/6.2.25_database.json';
      const result = await secureImportAppointments(filePath);
      
      if (result.success) {
        res.json({
          message: `Successfully imported ${result.importedRecords} appointments. Backup created: ${result.backupTableName}`,
          ...result
        });
      } else {
        res.status(400).json({
          message: "Import failed",
          ...result
        });
      }
    } catch (error) {
      console.error("Error during secure import:", error);
      res.status(500).json({ 
        message: `Error during import: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.get("/api/backup/list", async (req: Request, res: Response) => {
    try {
      const { listBackups } = await import('./services/databaseBackupService');
      const backups = await listBackups();
      
      res.json({
        message: "Backup list retrieved successfully",
        backups
      });
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ 
        message: `Error listing backups: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.post("/api/backup/restore/:backupName", async (req: Request, res: Response) => {
    try {
      const { restoreFromBackup } = await import('./services/databaseBackupService');
      const { backupName } = req.params;
      
      await restoreFromBackup(backupName);
      
      res.json({
        message: `Successfully restored from backup: ${backupName}`
      });
    } catch (error) {
      console.error("Error restoring from backup:", error);
      res.status(500).json({ 
        message: `Error restoring from backup: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.get("/api/analytics/future-earnings", async (req: Request, res: Response) => {
    try {
      const { calculateFutureEarnings } = await import('./services/futureEarningsService');
      const { timeframe = 'all', provider, includeRescheduled = 'true' } = req.query;
      
      const result = await calculateFutureEarnings({
        timeframe: timeframe as string,
        provider: provider as string | undefined,
        includeRescheduled: includeRescheduled === 'true'
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating future earnings:", error);
      res.status(500).json({ 
        message: `Error calculating future earnings: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for client analytics
function getPreferredProviders(appointments: any[]): { provider: string; count: number }[] {
  const providerCounts: Record<string, number> = {};
  
  appointments.forEach(apt => {
    if (apt.provider) {
      providerCounts[apt.provider] = (providerCounts[apt.provider] || 0) + 1;
    }
  });
  
  return Object.entries(providerCounts)
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3 providers
}

function getPreferredTimes(appointments: any[]): { hour: number; count: number }[] {
  const hourCounts: Record<number, number> = {};
  
  appointments.forEach(apt => {
    if (apt.startTime) {
      const hour = parseInt(apt.startTime.split(':')[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });
  
  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 hours
}

function getPaymentMethods(appointments: any[]): { method: string; count: number }[] {
  const methodCounts: Record<string, number> = {};
  
  appointments.forEach(apt => {
    if (apt.paymentProcessUsed) {
      methodCounts[apt.paymentProcessUsed] = (methodCounts[apt.paymentProcessUsed] || 0) + 1;
    }
  });
  
  return Object.entries(methodCounts)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
}

function convertClientsToCSV(clients: any[]): string {
  const headers = [
    'ID',
    'Name',
    'Email',
    'Phone',
    'Status',
    'Marketing Channel',
    'Total Revenue',
    'Appointment Count',
    'Last Appointment',
    'Tags',
    'Created At'
  ];
  
  const rows = clients.map(client => [
    client.id,
    client.name,
    client.email || '',
    client.phoneNumber || '',
    client.status || 'active',
    client.marketingChannel || '',
    client.totalRevenue || '0',
    client.appointmentCount || '0',
    client.lastAppointmentDate ? new Date(client.lastAppointmentDate).toISOString() : '',
    client.tags ? client.tags.join('; ') : '',
    client.createdAt ? new Date(client.createdAt).toISOString() : ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(','))
  ].join('\n');
  
  return csvContent;
}
