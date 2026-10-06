import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { sqlDb } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body parser
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`[SQL-API] ${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
      });
    }
    next();
  });

  // ==========================================
  // RELATIONAL SQL BACKEND REST API ENDPOINTS
  // ==========================================

  // 1. Health & Database Status
  app.get('/api/health', (req, res) => {
    try {
      const stats = sqlDb.getStats();
      res.json({
        status: 'online',
        database: 'SQL (SQLite 3 Relational)',
        timestamp: new Date().toISOString(),
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  app.get('/api/sql/stats', (req, res) => {
    try {
      const stats = sqlDb.getStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Parking Slots
  app.get('/api/sql/slots', (req, res) => {
    try {
      const slots = sqlDb.getAllSlots();
      res.json({ success: true, count: slots.length, data: slots });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sql/slots/upsert', (req, res) => {
    try {
      const slot = req.body;
      if (!slot || !slot.id) {
        return res.status(400).json({ success: false, error: 'Slot ID is required' });
      }
      sqlDb.upsertSlot(slot);
      res.json({ success: true, message: 'Slot saved to SQL' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Tickets & Bookings
  app.get('/api/sql/tickets', (req, res) => {
    try {
      const tickets = sqlDb.getAllTickets();
      res.json({ success: true, count: tickets.length, data: tickets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sql/tickets', (req, res) => {
    try {
      const ticket = req.body;
      if (!ticket || !ticket.id || !ticket.registrationNumber) {
        return res.status(400).json({ success: false, error: 'Invalid ticket payload' });
      }
      sqlDb.createTicket(ticket);
      res.json({ success: true, data: ticket });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sql/tickets/:id/checkout', (req, res) => {
    try {
      const { id } = req.params;
      const { exitTime, fee, paymentMethod } = req.body;
      const result = sqlDb.checkoutTicket(id, exitTime || new Date().toISOString(), Number(fee) || 0, paymentMethod);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sql/tickets/:id/cancel', (req, res) => {
    try {
      const { id } = req.params;
      const success = sqlDb.cancelTicket(id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Ticket not found' });
      }
      res.json({ success: true, message: 'Ticket cancelled in SQL backend' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Payments
  app.get('/api/sql/payments', (req, res) => {
    try {
      const payments = sqlDb.getAllPayments();
      res.json({ success: true, count: payments.length, data: payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Blacklist
  app.get('/api/sql/blacklist', (req, res) => {
    try {
      const list = sqlDb.getAllBlacklist();
      res.json({ success: true, count: list.length, data: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sql/blacklist/check/:plate', (req, res) => {
    try {
      const { plate } = req.params;
      const matched = sqlDb.checkBlacklist(plate);
      res.json({ success: true, isBlacklisted: !!matched, data: matched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sql/blacklist', (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.registrationNumber) {
        return res.status(400).json({ success: false, error: 'Registration number required' });
      }
      sqlDb.upsertBlacklist(item);
      res.json({ success: true, message: 'Blacklisted in SQL database' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/sql/blacklist/:id', (req, res) => {
    try {
      const { id } = req.params;
      sqlDb.deleteBlacklist(id);
      res.json({ success: true, message: 'Removed from SQL blacklist' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Analytics from Relational SQL Queries
  app.get('/api/sql/analytics', (req, res) => {
    try {
      const analytics = sqlDb.getAnalytics();
      res.json({ success: true, data: analytics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Full State Sync
  app.post('/api/sync', (req, res) => {
    try {
      const state = req.body;
      const result = sqlDb.syncFullState(state);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Custom SQL Console for Admin Terminal
  app.post('/api/sql/query', (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: 'Query parameter must be a string' });
      }
      const result = sqlDb.runQuery(query);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // FRONTEND INTEGRATION (Vite Dev / Static Dist)
  // ==========================================
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VPMS Pro SQL Backend] Running on port ${PORT}`);
    console.log(`[VPMS Pro SQL Backend] Engine: Native Node 22 SQLite (SQL Relational Backend)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting VPMS Pro server:', err);
  process.exit(1);
});
