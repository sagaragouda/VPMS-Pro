/**
 * VPMS Pro Relational SQL Backend API Client
 * Interacts with the Node.js SQLite relational database backend
 */

export interface SqlStats {
  dbPath: string;
  fileSizeBytes: number;
  fileSizeKb: string;
  engine: string;
  version: string;
  tables: {
    parking_slots: number;
    tickets: number;
    payments: number;
    blacklist: number;
    audit_logs: number;
  };
  uptimeSeconds: number;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface SqlAnalytics {
  totalSlots: number;
  occupiedSlots: number;
  totalRevenue: number;
  revenueToday: number;
  floorBreakdown: {
    floor: number;
    total_slots: number;
    occupied_slots: number;
    available_slots: number;
  }[];
  vehicleTypes: {
    vehicle_type: string;
    count: number;
    potential_revenue: number;
  }[];
  recentLogs: {
    id: number;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: string;
    created_at: string;
  }[];
}

export const sqlApi = {
  // Check health and retrieve SQL database metadata
  async getStats(): Promise<SqlStats | null> {
    try {
      const res = await fetch('/api/sql/stats');
      if (!res.ok) return null;
      const data = await res.json();
      return data.stats;
    } catch (err) {
      console.warn('SQL backend health ping failed:', err);
      return null;
    }
  },

  // Execute custom raw SQL query from Admin Terminal
  async runQuery(query: string): Promise<SqlQueryResult> {
    const res = await fetch('/api/sql/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'SQL query failed to execute');
    }
    return json.data;
  },

  // Fetch all tickets/bookings from SQL
  async getTickets(): Promise<any[]> {
    try {
      const res = await fetch('/api/sql/tickets');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // Fetch slots from SQL
  async getSlots(): Promise<any[]> {
    try {
      const res = await fetch('/api/sql/slots');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // Fetch blacklist from SQL
  async getBlacklist(): Promise<any[]> {
    try {
      const res = await fetch('/api/sql/blacklist');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // Check if plate is blacklisted in SQL
  async checkBlacklist(plate: string): Promise<{ isBlacklisted: boolean; data?: any }> {
    try {
      const res = await fetch(`/api/sql/blacklist/check/${encodeURIComponent(plate.trim().toUpperCase())}`);
      if (!res.ok) return { isBlacklisted: false };
      const json = await res.json();
      return { isBlacklisted: !!json.isBlacklisted, data: json.data };
    } catch {
      return { isBlacklisted: false };
    }
  },

  // Fetch relational analytics
  async getAnalytics(): Promise<SqlAnalytics | null> {
    try {
      const res = await fetch('/api/sql/analytics');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // Full state sync
  async syncState(state: any): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
