import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dbDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, 'parking_system.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for high performance
db.exec('PRAGMA foreign_keys = ON;');

// Initialize relational SQL tables
db.exec(`
  CREATE TABLE IF NOT EXISTS parking_slots (
    id TEXT PRIMARY KEY,
    slot_number TEXT NOT NULL,
    floor INTEGER NOT NULL,
    slot_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    price_per_hour REAL NOT NULL DEFAULT 50.0,
    current_ticket_id TEXT,
    sensor_id TEXT NOT NULL,
    last_status_change TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    owner_name TEXT,
    slot_id TEXT NOT NULL,
    slot_number TEXT NOT NULL,
    floor INTEGER NOT NULL,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    base_rate_per_hour REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PAID',
    duration_formatted TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    id TEXT PRIMARY KEY,
    registration_number TEXT NOT NULL UNIQUE,
    violation_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    blacklisted_at TEXT NOT NULL,
    blacklisted_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots(status);
  CREATE INDEX IF NOT EXISTS idx_slots_floor ON parking_slots(floor);
  CREATE INDEX IF NOT EXISTS idx_tickets_reg ON tickets(registration_number);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  CREATE INDEX IF NOT EXISTS idx_blacklist_reg ON blacklist(registration_number);
`);

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

export const sqlDb = {
  dbPath,

  // Audit logger
  logAudit(action: string, entityType: string, entityId?: string, details?: string) {
    try {
      const stmt = db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(action, entityType, entityId || null, details || null, new Date().toISOString());
    } catch (err) {
      console.warn('Failed to write SQL audit log:', err);
    }
  },

  // SLOTS operations
  getAllSlots() {
    const stmt = db.prepare('SELECT * FROM parking_slots ORDER BY floor ASC, slot_number ASC');
    return stmt.all();
  },

  upsertSlot(slot: any) {
    const stmt = db.prepare(`
      INSERT INTO parking_slots (id, slot_number, floor, slot_type, status, price_per_hour, current_ticket_id, sensor_id, last_status_change, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slot_number = excluded.slot_number,
        floor = excluded.floor,
        slot_type = excluded.slot_type,
        status = excluded.status,
        price_per_hour = excluded.price_per_hour,
        current_ticket_id = excluded.current_ticket_id,
        sensor_id = excluded.sensor_id,
        last_status_change = excluded.last_status_change,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      slot.id,
      slot.slotNumber,
      slot.floor,
      slot.slotType,
      slot.status,
      slot.pricePerHour || 50,
      slot.currentTicketId || null,
      slot.sensorId || `SNS-${slot.id}`,
      slot.lastStatusChange || new Date().toISOString(),
      new Date().toISOString()
    );
  },

  // TICKETS operations
  getAllTickets() {
    const stmt = db.prepare('SELECT * FROM tickets ORDER BY entry_time DESC');
    return stmt.all();
  },

  getTicketById(id: string) {
    const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
    return stmt.all(id)[0] || null;
  },

  createTicket(ticket: any) {
    const stmt = db.prepare(`
      INSERT INTO tickets (id, vehicle_id, registration_number, vehicle_type, owner_name, slot_id, slot_number, floor, entry_time, exit_time, status, base_rate_per_hour, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        exit_time = excluded.exit_time,
        status = excluded.status
    `);
    stmt.run(
      ticket.id,
      ticket.vehicleId || `VEH-${Date.now()}`,
      ticket.registrationNumber.toUpperCase(),
      ticket.vehicleType,
      ticket.ownerName || null,
      ticket.slotId,
      ticket.slotNumber,
      ticket.floor,
      ticket.entryTime,
      ticket.exitTime || null,
      ticket.status || 'ACTIVE',
      ticket.baseRatePerHour || 50,
      new Date().toISOString()
    );

    // Update slot occupancy in SQL
    const updateSlot = db.prepare(`
      UPDATE parking_slots 
      SET status = 'OCCUPIED', current_ticket_id = ?, updated_at = ?
      WHERE id = ?
    `);
    updateSlot.run(ticket.id, new Date().toISOString(), ticket.slotId);

    this.logAudit('TICKET_CREATED', 'TICKET', ticket.id, `Vehicle ${ticket.registrationNumber} parked at ${ticket.slotNumber}`);
  },

  checkoutTicket(id: string, exitTime: string, fee: number, paymentMethod: string = 'ONLINE') {
    const ticket = this.getTicketById(id);
    if (!ticket) return null;

    const updateTicket = db.prepare(`
      UPDATE tickets 
      SET exit_time = ?, status = 'COMPLETED'
      WHERE id = ?
    `);
    updateTicket.run(exitTime, id);

    // Free the slot
    const freeSlot = db.prepare(`
      UPDATE parking_slots 
      SET status = 'AVAILABLE', current_ticket_id = NULL, updated_at = ?
      WHERE id = ?
    `);
    freeSlot.run(new Date().toISOString(), ticket.slot_id);

    // Create Payment record
    const paymentId = `PAY-${Date.now().toString().slice(-6)}`;
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, ticket_id, registration_number, amount, payment_method, payment_time, status, duration_formatted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?, ?)
    `);
    insertPayment.run(
      paymentId,
      id,
      ticket.registration_number,
      fee,
      paymentMethod,
      exitTime,
      'Settled',
      new Date().toISOString()
    );

    this.logAudit('TICKET_CHECKOUT', 'TICKET', id, `Settled ₹${fee} for ${ticket.registration_number}`);
    return { ticketId: id, paymentId, amount: fee, exitTime };
  },

  cancelTicket(id: string) {
    const ticket = this.getTicketById(id);
    if (!ticket) return false;

    const updateTicket = db.prepare(`
      UPDATE tickets 
      SET status = 'CANCELLED', exit_time = ?
      WHERE id = ?
    `);
    updateTicket.run(new Date().toISOString(), id);

    const freeSlot = db.prepare(`
      UPDATE parking_slots 
      SET status = 'AVAILABLE', current_ticket_id = NULL, updated_at = ?
      WHERE id = ?
    `);
    freeSlot.run(new Date().toISOString(), ticket.slot_id);

    this.logAudit('TICKET_CANCELLED', 'TICKET', id, `Cancelled booking for slot ${ticket.slot_number}`);
    return true;
  },

  // PAYMENTS operations
  getAllPayments() {
    const stmt = db.prepare('SELECT * FROM payments ORDER BY payment_time DESC');
    return stmt.all();
  },

  // BLACKLIST operations
  getAllBlacklist() {
    const stmt = db.prepare('SELECT * FROM blacklist ORDER BY blacklisted_at DESC');
    return stmt.all();
  },

  checkBlacklist(plate: string) {
    const sanitized = plate.trim().toUpperCase();
    const stmt = db.prepare(`
      SELECT * FROM blacklist 
      WHERE UPPER(registration_number) = ? AND status = 'ACTIVE'
    `);
    return stmt.all(sanitized)[0] || null;
  },

  upsertBlacklist(item: any) {
    const stmt = db.prepare(`
      INSERT INTO blacklist (id, registration_number, violation_type, reason, blacklisted_at, blacklisted_by, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        violation_type = excluded.violation_type,
        reason = excluded.reason,
        status = excluded.status,
        notes = excluded.notes
    `);
    stmt.run(
      item.id,
      item.registrationNumber.toUpperCase(),
      item.violationType || 'OTHER',
      item.reason,
      item.blacklistedAt || new Date().toISOString(),
      item.blacklistedBy || 'Admin',
      item.status || 'ACTIVE',
      item.notes || null
    );
    this.logAudit('BLACKLIST_UPSERT', 'BLACKLIST', item.id, `Plate ${item.registrationNumber}: ${item.reason}`);
  },

  revokeBlacklist(id: string) {
    const stmt = db.prepare(`
      UPDATE blacklist 
      SET status = 'REVOKED' 
      WHERE id = ? OR UPPER(registration_number) = ?
    `);
    stmt.run(id, id.toUpperCase());
    this.logAudit('BLACKLIST_REVOKED', 'BLACKLIST', id, `Revoked blacklist for ${id}`);
  },

  deleteBlacklist(id: string) {
    const stmt = db.prepare(`
      DELETE FROM blacklist 
      WHERE id = ? OR UPPER(registration_number) = ?
    `);
    stmt.run(id, id.toUpperCase());
    this.logAudit('BLACKLIST_DELETED', 'BLACKLIST', id, `Deleted record ${id}`);
  },

  // ANALYTICS via relational SQL queries
  getAnalytics() {
    const totalSlotsStmt = db.prepare('SELECT COUNT(*) as count FROM parking_slots');
    const occupiedSlotsStmt = db.prepare("SELECT COUNT(*) as count FROM parking_slots WHERE status = 'OCCUPIED'");
    const totalRevenueStmt = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments');
    const revenueTodayStmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE DATE(payment_time) = DATE('now')
    `);
    const floorBreakdownStmt = db.prepare(`
      SELECT 
        floor, 
        COUNT(*) as total_slots,
        SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_slots,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_slots
      FROM parking_slots 
      GROUP BY floor
      ORDER BY floor ASC
    `);
    const vehicleTypeStmt = db.prepare(`
      SELECT 
        vehicle_type, 
        COUNT(*) as count,
        COALESCE(SUM(base_rate_per_hour), 0) as potential_revenue
      FROM tickets 
      GROUP BY vehicle_type
    `);
    const recentActivityStmt = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 15
    `);

    return {
      totalSlots: (totalSlotsStmt.all()[0] as any)?.count || 0,
      occupiedSlots: (occupiedSlotsStmt.all()[0] as any)?.count || 0,
      totalRevenue: (totalRevenueStmt.all()[0] as any)?.total || 0,
      revenueToday: (revenueTodayStmt.all()[0] as any)?.total || 0,
      floorBreakdown: floorBreakdownStmt.all(),
      vehicleTypes: vehicleTypeStmt.all(),
      recentLogs: recentActivityStmt.all(),
    };
  },

  // FULL STATE SYNC
  syncFullState(state: any) {
    if (state.slots && Array.isArray(state.slots)) {
      for (const slot of state.slots) {
        this.upsertSlot(slot);
      }
    }
    if (state.tickets && Array.isArray(state.tickets)) {
      for (const tkt of state.tickets) {
        this.createTicket(tkt);
      }
    }
    if (state.payments && Array.isArray(state.payments)) {
      for (const pay of state.payments) {
        const stmt = db.prepare(`
          INSERT INTO payments (id, ticket_id, registration_number, amount, payment_method, payment_time, status, duration_formatted, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            amount = excluded.amount,
            status = excluded.status
        `);
        stmt.run(
          pay.id,
          pay.ticketId,
          pay.registrationNumber,
          pay.amount,
          pay.paymentMethod,
          pay.paymentTime,
          pay.status,
          pay.durationFormatted || 'N/A',
          new Date().toISOString()
        );
      }
    }
    this.logAudit('FULL_STATE_SYNC', 'SYSTEM', undefined, 'Synced parking slots, tickets, and payments to SQL database');
    return { success: true, timestamp: new Date().toISOString() };
  },

  // DATABASE STATS
  getStats() {
    const tableCounts = {
      parking_slots: (db.prepare('SELECT COUNT(*) as c FROM parking_slots').all()[0] as any).c,
      tickets: (db.prepare('SELECT COUNT(*) as c FROM tickets').all()[0] as any).c,
      payments: (db.prepare('SELECT COUNT(*) as c FROM payments').all()[0] as any).c,
      blacklist: (db.prepare('SELECT COUNT(*) as c FROM blacklist').all()[0] as any).c,
      audit_logs: (db.prepare('SELECT COUNT(*) as c FROM audit_logs').all()[0] as any).c,
    };

    let fileSize = 0;
    try {
      const stat = fs.statSync(dbPath);
      fileSize = stat.size;
    } catch (_) {}

    return {
      dbPath,
      fileSizeBytes: fileSize,
      fileSizeKb: (fileSize / 1024).toFixed(1),
      engine: 'Node SQLite 3 Embedded Engine (relational SQL backend)',
      version: 'SQLite 3.46+ Native',
      tables: tableCounts,
      uptimeSeconds: Math.round(process.uptime()),
    };
  },

  // CUSTOM RAW SQL QUERY RUNNER FOR ADMIN CONSOLE
  runQuery(queryStr: string): SqlQueryResult {
    const trimmed = queryStr.trim();
    if (!trimmed) {
      throw new Error('Query string cannot be empty');
    }

    const start = performance.now();
    const upper = trimmed.toUpperCase();

    // If it's a SELECT or PRAGMA or EXPLAIN, fetch all rows
    if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN') || upper.startsWith('WITH')) {
      const stmt = db.prepare(trimmed);
      const rows = stmt.all() as Record<string, any>[];
      const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
      };
    } else {
      // DDL or DML write operation
      db.exec(trimmed);
      const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;
      this.logAudit('RAW_SQL_EXEC', 'DATABASE', undefined, trimmed.slice(0, 100));

      return {
        columns: ['status', 'message'],
        rows: [{ status: 'SUCCESS', message: 'Command executed successfully.' }],
        rowCount: 1,
        executionTimeMs,
      };
    }
  },
};
