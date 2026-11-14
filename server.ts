import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import { exec, execFile } from "child_process";
import { connectToDatabase, isDbConnected, getLastDbError, RestaurantStateModel } from "./src/db/mongodb";
// @ts-ignore
import ZKLib from "node-zklib";

dotenv.config();

const STATE_FILE = path.join(process.cwd(), "restaurant_data.json");
const STATE_KEY = "default_cafe_banani";
let cachedState: any = null;
let lastServerUpdate = 0;
let lastFullStateUpdate = 0;
let isLoadedFromMongo = false;

// Try to load fallback state from JSON backup on startup (used only until MongoDB connects)
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedState = parsed.data || null;
      // Default fallback file from repository has timestamp = 0 so client state with real updates always takes priority
      lastServerUpdate = 0;
    }
  }
} catch (e) {
  console.error("Error reading startup state from file:", e);
}

let savedLogoBuffer: Buffer | null = null;
let savedLogoMime = "image/png";

function normalizeLogo(state: any): boolean {
  if (!state || !state.restaurantProfile || !state.restaurantProfile.logoUrl) return false;
  const logoUrl = state.restaurantProfile.logoUrl;
  if (typeof logoUrl === 'string' && logoUrl.startsWith('data:image/')) {
    try {
      const matches = logoUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
      if (matches && matches[2]) {
        savedLogoMime = matches[1];
        savedLogoBuffer = Buffer.from(matches[2], 'base64');
        state.restaurantProfile.logoUrl = '/api/restaurant/logo';
        try {
          const distDir = path.join(process.cwd(), 'dist');
          if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'restaurant-logo.png'), savedLogoBuffer);
          }
          const publicDir = path.join(process.cwd(), 'public');
          if (fs.existsSync(publicDir)) {
            fs.writeFileSync(path.join(publicDir, 'restaurant-logo.png'), savedLogoBuffer);
          }
        } catch {}
        return true;
      }
    } catch (e) {
      console.error('Error normalizing logoUrl:', e);
    }
  }
  return false;
}

function buildSettledOrdersByTable(sales: any[] = []) {
  const map = new Map<string, Set<string>>();
  (sales || []).forEach((s: any) => {
    const tid = s.tableId || s.table;
    if (!tid || !s.orderRef) return;
    if (!map.has(tid)) {
      map.set(tid, new Set());
    }
    map.get(tid)!.add(s.orderRef);
    if (s.table && s.table !== tid) {
      if (!map.has(s.table)) {
        map.set(s.table, new Set());
      }
      map.get(s.table)!.add(s.orderRef);
    }
  });
  return map;
}

// Dedicated Ultra-Fast Real-Time POS Sync (3.8KB payload, <5ms round-trip)
function sanitizeTables(tables: any[], existingSales: any[] = [], isHoldSyncOnKotOnly = false) {
  if (!Array.isArray(tables)) return tables;
  const settledOrdersByTable = buildSettledOrdersByTable(existingSales);

  return tables.map(t => {
    const tableSettledRefs = settledOrdersByTable.get(t.id) || settledOrdersByTable.get(t.name);
    // A table is only considered already settled if it has no active cart items
    const isAlreadySettled = t.orderRef && tableSettledRefs && tableSettledRefs.has(t.orderRef) && (!t.cart || t.cart.length === 0) && !t.isPaidOrder && !t.linkedSaleId;
    const isReallyEmpty = !t.cart || t.cart.length === 0;
    const hasAnyKot = !isReallyEmpty && t.cart.some((item: any) => (item.kotPrintedQty || 0) > 0 || item.kotPrinted);
    const isUnprintedDraftInOnKotMode = isHoldSyncOnKotOnly && !isReallyEmpty && !hasAnyKot && t.status !== 'billed';

    if (isReallyEmpty || isAlreadySettled || isUnprintedDraftInOnKotMode) {
      return {
        ...t,
        status: 'free',
        waiter: '',
        customer: 'Walk-in Customer',
        cart: [],
        discountVal: 0,
        channelOrAgentId: 'dine_in',
        linkedSaleId: undefined,
        linkedInvoiceNo: undefined,
        kotBaseSerial: undefined,
        isPaidOrder: false,
        paidAmount: 0,
        orderCreatedBy: undefined,
        orderCreatedRole: undefined,
        orderCreatedId: undefined,
        orderCreatedAt: undefined,
        billedAt: undefined,
        billedAtTime: undefined,
        orderRef: undefined,
        kotCount: 0,
        billCount: 0
      };
    }
    return t;
  });
}

function mergeTablesSafely(
  currentServerTables: any[], 
  incomingTables: any[], 
  existingSales: any[] = [], 
  action: string = 'TABLES_UPDATE',
  modifiedTableId?: string
) {
  if (!Array.isArray(incomingTables)) return currentServerTables || [];
  if (!Array.isArray(currentServerTables) || currentServerTables.length === 0) {
    return sanitizeTables(incomingTables, existingSales);
  }

  const settledOrdersByTable = buildSettledOrdersByTable(existingSales);

  const now = Date.now();
  const serverTableMap = new Map((currentServerTables || []).map((t: any) => [t.id, t]));
  const isConfigChange = (action === 'TABLES_CONFIG_UPDATE');

  // If this is an explicit structural table configuration change (tables added/deleted/recreated dynamically)
  if (isConfigChange) {
    return incomingTables.map((it: any) => {
      const st = serverTableMap.get(it.id);
      if (!st) return it; // Brand new table dynamically created
      // If surviving table already has active running orders on server, preserve them intact
      if ((st.status === 'hold' || st.status === 'billed') && (st.cart?.length || 0) > 0) {
        return {
          ...it,
          status: st.status,
          cart: st.cart,
          waiter: st.waiter,
          customer: st.customer,
          orderRef: st.orderRef,
          kotCount: st.kotCount,
          billCount: st.billCount,
          billedAt: st.billedAt,
          billedAtTime: st.billedAtTime,
          linkedInvoiceNo: st.linkedInvoiceNo,
          orderCreatedAt: st.orderCreatedAt,
          orderCreatedBy: st.orderCreatedBy,
          orderCreatedRole: st.orderCreatedRole
        };
      }
      return it;
    });
  }

  const updatedExisting = currentServerTables.map(st => {
    const it = incomingTables.find((t: any) => t.id === st.id);
    if (!it) return st;

    const tableSettledRefs = settledOrdersByTable.get(st.id) || settledOrdersByTable.get(st.name);

    // 1. Explicit settle action for this table
    const isTargetOfSettle = (action === 'TABLE_SETTLE') && (modifiedTableId ? it.id === modifiedTableId : (!it.cart || it.cart.length === 0));
    if (isTargetOfSettle || (it.orderRef && tableSettledRefs && tableSettledRefs.has(it.orderRef) && (!it.cart || it.cart.length === 0) && !it.isPaidOrder && !it.linkedSaleId)) {
      return {
        ...st,
        ...it,
        status: 'free',
        waiter: '',
        customer: 'Walk-in Customer',
        cart: [],
        discountVal: 0,
        channelOrAgentId: 'dine_in',
        linkedSaleId: undefined,
        linkedInvoiceNo: undefined,
        kotBaseSerial: undefined,
        isPaidOrder: false,
        paidAmount: 0,
        orderCreatedBy: undefined,
        orderCreatedRole: undefined,
        orderCreatedId: undefined,
        orderCreatedAt: undefined,
        billedAt: undefined,
        billedAtTime: undefined,
        orderRef: undefined,
        kotCount: 0,
        billCount: 0,
        settledAt: now,
        lastSettledOrderRef: it.orderRef || st.orderRef
      };
    }

    // 2. Explicit release or cart clear for this table
    const isTargetOfRelease = (action === 'TABLE_RELEASE' || action === 'CART_CLEAR' || action === 'ORDER_CANCEL_DRAFT') && 
      (modifiedTableId ? it.id === modifiedTableId : true) && (!it.cart || it.cart.length === 0);
    if (isTargetOfRelease && it.status === 'free') {
      return {
        ...st,
        ...it,
        status: 'free',
        waiter: '',
        customer: 'Walk-in Customer',
        cart: [],
        discountVal: 0,
        orderRef: undefined,
        kotCount: 0,
        billCount: 0,
        settledAt: now
      };
    }

    // 3. Protection: If server table is FREE, never let stale incoming table revive it!
    if (st.status === 'free') {
      const hasIncomingCart = it.cart && it.cart.length > 0;
      if (!hasIncomingCart) {
        return st; // Stays free
      }

      // Explicit intentional user actions (KOT submit, Bill print)
      const isExplicitOrderAction = (action === 'KOT_SUBMIT' || action === 'BILL_PRINT');

      // If server table was settled recently and this incoming order was created before or at settle time, REJECT!
      if (st.settledAt && it.orderCreatedAt && it.orderCreatedAt <= st.settledAt) {
        return st;
      }

      // If incoming table has an old orderRef that was already settled in sales FOR THIS TABLE
      if (it.orderRef && tableSettledRefs && tableSettledRefs.has(it.orderRef)) {
        if (isExplicitOrderAction && hasIncomingCart && (!st.settledAt || !it.orderCreatedAt || it.orderCreatedAt > st.settledAt)) {
          // Assign a fresh unique orderRef so it does not collide with settled historical order
          it.orderRef = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
        } else {
          return st;
        }
      }
    }

    // 4. If modifiedTableId was specified, only update that specific table!
    if (modifiedTableId) {
      if (it.id === modifiedTableId) {
        return it;
      }
      return st;
    }

    // 5. If server table is billed, do not downgrade to hold from an older client
    if (st.status === 'billed' && it.status === 'hold' && (!it.cart || it.cart.length <= (st.cart?.length || 0))) {
      return st;
    }

    // 6. Protection: If server table has an active order (hold or billed) with items, NEVER let a generic background sync from another client wipe it to free!
    const isExplicitSettleOrRelease = (action === 'TABLE_SETTLE' || action === 'TABLE_RELEASE' || action === 'CART_CLEAR' || action === 'ORDER_CANCEL_DRAFT') && 
      (modifiedTableId ? it.id === modifiedTableId : true);
    if ((st.status === 'hold' || st.status === 'billed') && (st.cart?.length || 0) > 0 && (it.status === 'free' || !it.cart || it.cart.length === 0) && !isExplicitSettleOrRelease) {
      return st; // Keep server's active hold/billed order authoritative!
    }

    // Otherwise accept updated table
    return it;
  });

  // Dynamically include any brand-new tables from client that server doesn't have yet!
  const newTables = incomingTables.filter((it: any) => !serverTableMap.has(it.id));
  return [...updatedExisting, ...newTables];
}

// Initialize MongoDB connection and synchronize state
async function initDatabase() {
  const connected = await connectToDatabase();
  if (connected) {
    try {
      const doc = await RestaurantStateModel.findOne({ stateKey: STATE_KEY }).lean() as any;
      if (doc && doc.data) {
        cachedState = doc.data;
        if (cachedState && cachedState.tables) {
          cachedState.tables = sanitizeTables(cachedState.tables, cachedState.sales);
        }
        const now = Date.now();
        lastServerUpdate = (doc.timestamp && doc.timestamp <= now + 60000) ? doc.timestamp : now;
        isLoadedFromMongo = true;
        if (normalizeLogo(cachedState)) {
          RestaurantStateModel.updateOne(
            { stateKey: STATE_KEY },
            { $set: { "data.restaurantProfile.logoUrl": "/api/restaurant/logo" } }
          ).catch(() => {});
        }
        console.log("📦 Loaded restaurant state from MongoDB successfully.");
      } else if (cachedState) {
        // Seed MongoDB from existing JSON backup only if collection is completely empty
        await RestaurantStateModel.findOneAndUpdate(
          { stateKey: STATE_KEY },
          { stateKey: STATE_KEY, data: cachedState, timestamp: Date.now() },
          { upsert: true, returnDocument: 'after' }
        );
        isLoadedFromMongo = true;
        console.log("🌱 Seeded initial restaurant state into MongoDB from local backup.");
      }
    } catch (err) {
      console.error("Error querying initial state from MongoDB:", err);
    }
  }
}

let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: "50mb" })); // Support large restaurant dataset syncing

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    if (!isDbConnected()) {
      await connectToDatabase();
    }
    res.json({
      status: "ok",
      mongodbConnected: isDbConnected(),
      lastDbError: getLastDbError(),
      timestamp: new Date().toISOString()
    });
  });

  // DB status endpoint
  app.get("/api/db/status", async (req, res) => {
    if (!isDbConnected()) {
      await initDatabase();
    }
    res.json({
      success: true,
      mongodbConnected: isDbConnected(),
      isLoadedFromMongo,
      lastDbError: getLastDbError(),
      hasCachedState: !!cachedState,
      lastServerUpdate
    });
  });

  const VIRTUAL_PRINTER_REGEX = /microsoft print to pdf|xps document writer|onenote|fax|adobe pdf|foxit|send to|anydesk|snagit|cutepdf/i;

  let cachedWinDiscovery: { names: string[]; detailed: any[]; isUsbConnected: boolean; usbPaths: string[]; updatedAt: number } = {
    names: [],
    detailed: [],
    isUsbConnected: false,
    usbPaths: [],
    updatedAt: 0
  };
  let winScanInProgress: Promise<{ names: string[]; detailed: any[]; isUsbConnected: boolean }> | null = null;

  // Helper to discover all Windows installed printers & USB PnP receipt printers dynamically
  async function getWindowsPrintersDetailed(force = false): Promise<{ names: string[]; detailed: any[]; isUsbConnected: boolean }> {
    if (process.platform !== 'win32') {
      return { names: [], detailed: [], isUsbConnected: false };
    }
    const now = Date.now();
    if (!force && cachedWinDiscovery.updatedAt > 0) {
      if (now - cachedWinDiscovery.updatedAt >= 8000 && !winScanInProgress) {
        getWindowsPrintersDetailed(true).catch(() => {});
      }
      return cachedWinDiscovery;
    }
    if (winScanInProgress) return winScanInProgress;

    winScanInProgress = new Promise((resolve) => {
      const psCmd = [
        `$usb = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Service -eq 'usbprint' -and $_.Status -eq 'OK' });`,
        `$usbDevices = @();`,
        `foreach ($u in $usb) {`,
        `  $busDesc = (Get-PnpDeviceProperty -InstanceId $u.InstanceId -KeyName 'DEVPKEY_Device_BusReportedDeviceDesc' -ErrorAction SilentlyContinue).Data;`,
        `  $friendly = $u.FriendlyName;`,
        `  $label = if ($busDesc) { [string]$busDesc } elseif ($friendly) { [string]$friendly } else { 'USB Receipt Printer' };`,
        `  $usbDevices += [PSCustomObject]@{ Name = $label.Trim(); InstanceId = [string]$u.InstanceId; FriendlyName = [string]$friendly };`,
        `}`,
        `$printers = @(Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus);`,
        `[PSCustomObject]@{ usbCount = $usb.Count; usbDevices = $usbDevices; printers = $printers } | ConvertTo-Json -Depth 4 -Compress`
      ].join(' ');

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd.replace(/"/g, '\\"')}"`, { timeout: 10000 }, (err, stdout) => {
        winScanInProgress = null;
        if (err || !stdout) return resolve(cachedWinDiscovery);
        try {
          const parsed = JSON.parse(stdout.trim());
          const isUsbConnected = (Number(parsed.usbCount) || 0) > 0;
          const rawList = Array.isArray(parsed.printers) ? parsed.printers : (parsed.printers ? [parsed.printers] : []);
          const usbDevList = Array.isArray(parsed.usbDevices) ? parsed.usbDevices : (parsed.usbDevices ? [parsed.usbDevices] : []);
          const detailed: any[] = [];
          const usbPaths: string[] = [];

          for (const p of rawList) {
            const name = (p && p.Name ? String(p.Name) : '').trim();
            const rawPort = (p && p.PortName ? String(p.PortName) : '').trim();
            if (!name) continue;

            const ipMatch = rawPort.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            const isVirtual = VIRTUAL_PRINTER_REGEX.test(name) || /^(PORTPROMPT:|SHRFAX:|nul:|FILE:)/i.test(rawPort) || /^Microsoft\.Office\./i.test(rawPort);
            const isUsbPort = /^USB/i.test(rawPort);
            const isLanPort = Boolean(ipMatch) || /^(IP_|WSD|TCP)/i.test(rawPort);
            const connType = isLanPort ? 'LAN' : 'USB';
            const displayPort = /^Microsoft\.Office\.OneNote/i.test(rawPort)
              ? 'OneNote Port'
              : (rawPort.length > 28 ? rawPort.slice(0, 25) + '...' : (rawPort || 'USB001'));

            detailed.push({
              name,
              portName: displayPort,
              driverName: (p && p.DriverName ? String(p.DriverName) : ''),
              connectionType: connType,
              ipAddress: ipMatch ? ipMatch[1] : (connType === 'LAN' ? '192.168.1.87' : undefined),
              port: 9100,
              usbPort: isUsbPort ? rawPort : displayPort,
              isConnected: isUsbPort ? isUsbConnected : (!p.WorkOffline),
              isVirtual,
              deviceCategory: 'Printers'
            });
          }

          for (const u of usbDevList) {
            const instId = (u && u.InstanceId ? String(u.InstanceId) : '').trim();
            if (instId) {
              usbPaths.push('\\\\?\\' + instId.replace(/\\/g, '#') + '#{28d78fad-5a12-11d1-ae5b-0000f803a8c2}');
            }
            const usbName = (u && u.Name ? String(u.Name) : '').trim();
            if (!usbName) continue;
            if (!detailed.some(d => d.name.toLowerCase() === usbName.toLowerCase())) {
              detailed.push({
                name: usbName,
                portName: 'USB001',
                driverName: (u && u.FriendlyName ? String(u.FriendlyName) : 'USB Printing Support'),
                connectionType: 'USB',
                port: 9100,
                usbPort: 'USB001',
                isConnected: true,
                isVirtual: false,
                deviceCategory: 'Unspecified (USB)'
              });
            }
          }

          detailed.sort((a, b) => {
            if (Boolean(a.isVirtual) !== Boolean(b.isVirtual)) {
              return a.isVirtual ? 1 : -1;
            }
            if (Boolean(a.isConnected) !== Boolean(b.isConnected)) {
              return a.isConnected ? -1 : 1;
            }
            return String(a.name).localeCompare(String(b.name));
          });

          cachedWinDiscovery = {
            names: detailed.map(d => d.name),
            detailed,
            isUsbConnected,
            usbPaths,
            updatedAt: Date.now()
          };
          resolve(cachedWinDiscovery);
        } catch {
          resolve(cachedWinDiscovery);
        }
      });
    });
    return winScanInProgress;
  }

  async function getWindowsPrinters(): Promise<string[]> {
    const res = await getWindowsPrintersDetailed(false);
    return res.names;
  }

  // Resolve active thermal printer: Prioritizes 80 Printer (LAN 192.168.1.87) or Kot Printer (USB001)
  function resolveThermalPrinter(installedPrinters: string[], requestedName?: string): string {
    const printers = (installedPrinters || []).filter(p => !VIRTUAL_PRINTER_REGEX.test(p));

    // 1. If a specific printer name was requested:
    if (requestedName && !VIRTUAL_PRINTER_REGEX.test(requestedName)) {
      const trimmedReq = requestedName.trim();
      const exact = printers.find(p => p.toLowerCase() === trimmedReq.toLowerCase());
      if (exact) return exact;

      if (/80\s*printer/i.test(trimmedReq) || trimmedReq.includes('80')) {
        const match80 = printers.find(p => /80\s*printer/i.test(p));
        if (match80) return match80;
      }

      if (/kot/i.test(trimmedReq)) {
        const matchKot = printers.find(p => /kot/i.test(p));
        if (matchKot) return matchKot;
      }
    }

    // 2. Prioritize active 80 Printer (LAN 192.168.1.87)
    const lanPrinter = printers.find(p => /80\s*printer/i.test(p));
    if (lanPrinter) return lanPrinter;

    // 3. Fallback to Kot Printer (USB001)
    const kot = printers.find(p => /kot\s*printer/i.test(p)) || printers.find(p => /kot/i.test(p));
    if (kot) return kot;

    // 4. Fallback to any other thermal/receipt printer
    const thermal = printers.find(p => /pos|receipt|thermal|80|58|xp|xprinter|gp|rongta|epson|bixolon|generic/i.test(p));
    if (thermal) return thermal;

    return printers[0] || '80 Printer';
  }

  function line2Col(left: string, right: string, width = 48): string {
    const l = (left || '').trim();
    const r = (right || '').trim();
    const maxL = Math.max(0, width - 1 - r.length);
    const safeL = l.length > maxL ? l.slice(0, maxL) : l;
    const spaces = Math.max(1, width - safeL.length - r.length);
    return safeL + ' '.repeat(spaces) + r + '\n';
  }

  function centerLine(text: string, width = 48): string {
    const t = (text || '').trim();
    if (t.length >= width) return t;
    const leftPad = Math.floor((width - t.length) / 2);
    return ' '.repeat(leftPad) + t;
  }

  // Build ESC/POS binary buffer for a compact single-page KOT slip
  function buildKotEscPosBuffer(
    req: { tableName: string; tableZone?: string; waiter?: string; customer?: string; invoiceNo: string; dateTime?: string; showPrices?: boolean; showWaiter?: boolean; showCustomer?: boolean; showDateTime?: boolean; paperWidth?: string; isAddonKot?: boolean },
    slip: { station: string; category?: string; showPrices?: boolean; showWaiter?: boolean; showCustomer?: boolean; showDateTime?: boolean; paperWidth?: string; items: { name: string; qty: number; price?: number; variation?: string; addons?: string[]; notes?: string }[] },
    index: number,
    total: number,
    targetPrinter?: string
  ): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF (prevents muddy/bleeding characters)
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform standard font A (12x24)

    const is58mmReq = (slip.paperWidth || req.paperWidth) === '58mm';
    const is58mmPrinter = /58/i.test(targetPrinter || '') && !/80/i.test(targetPrinter || '');
    const width = (is58mmReq && is58mmPrinter) ? 32 : 48;
    const divider = '-'.repeat(width) + '\n';

    // 3. Center Align: Station & KOT Number (Exactly as in picture)
    pushBytes([0x1B, 0x61, 0x01]);
    pushStr(divider);
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    const cleanStation = (!slip.station || slip.station === 'SPLIT_ALL' || slip.station === 'ALL') ? 'MAIN KITCHEN' : slip.station;
    pushStr(`STATION: ${cleanStation.toUpperCase()}\n`);
    const invoiceVal = req.invoiceNo || 'KOT-0000';
    pushStr(`KOT NO: ${invoiceVal}\n`);
    if (slip.category) {
      pushStr(`Category: ${slip.category}\n`);
    }
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    pushStr(divider);

    // 4. Left & Right Justified: Metadata (Strict 48 Columns Flush Left/Right)
    pushBytes([0x1B, 0x61, 0x00]);

    // Table & Zone (Matches Bill format)
    pushStr(line2Col('Table & Zone :', `${req.tableName || 'Table'}${req.tableZone ? ` (${req.tableZone})` : ''}`, width));

    // Dual Date & Time (Date on left, Time on right flush to column 48)
    const shouldShowDateTime = slip.showDateTime !== undefined ? Boolean(slip.showDateTime) : (req.showDateTime !== false);
    if (shouldShowDateTime) {
      let dateStr = '';
      let timeStr = '';
      const rawDt = req.dateTime || new Date().toLocaleString('en-US');
      if (rawDt.includes(',')) {
        const parts = rawDt.split(',');
        dateStr = parts[0].trim();
        timeStr = parts.slice(1).join(',').trim();
      } else {
        const parts = rawDt.trim().split(/\s+/);
        if (parts.length >= 2) {
          dateStr = parts[0];
          timeStr = parts.slice(1).join(' ');
        } else {
          dateStr = rawDt;
          timeStr = new Date().toLocaleTimeString('en-US');
        }
      }
      pushStr(line2Col('Date : ' + dateStr, 'Time: ' + timeStr, width));
    }

    // Waiter
    const shouldShowWaiter = slip.showWaiter !== undefined ? Boolean(slip.showWaiter) : (req.showWaiter !== undefined ? Boolean(req.showWaiter) : true);
    if (shouldShowWaiter) {
      pushStr(line2Col('Waiter :', req.waiter || 'Staff', width));
    }

    // Customer
    const shouldShowCustomer = slip.showCustomer !== undefined ? Boolean(slip.showCustomer) : Boolean(req.showCustomer);
    if (shouldShowCustomer && req.customer && req.customer !== 'Walk-in Customer') {
      pushStr(line2Col('Customer :', req.customer, width));
    }

    pushStr(divider);

    // 5. Items Grid
    const shouldShowPrices = Boolean(slip.showPrices || req.showPrices);

    if (shouldShowPrices) {
      // 3 Columns: ITEM (starts col 1), QTY (center), PRICE (ends col 48)
      pushBytes([0x1B, 0x45, 0x01]); // Bold ON
      if (width === 48) {
        const colItemH = 'ITEM'.padEnd(28, ' ');
        const colQtyH = ' QTY  ';
        const colPriceH = '       PRICE';
        pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + '\n');
      } else {
        const colItemH = 'ITEM'.padEnd(14, ' ');
        const colQtyH = ' QTY ';
        const colPriceH = '     PRICE';
        pushStr(colItemH + ' ' + colQtyH + ' ' + colPriceH + '\n');
      }
      pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
      pushStr(divider);

      // Food Items with Prices
      const nameLimit = width === 48 ? 28 : 14;
      for (const item of (slip.items || [])) {
        const itemPrice = Number(item.price || 0);

        let firstLineName = (item.name || '').trim();
        let remainder = '';
        if (firstLineName.length > nameLimit) {
          const lastSpace = firstLineName.lastIndexOf(' ', nameLimit);
          if (lastSpace > 8) {
            remainder = firstLineName.slice(lastSpace + 1).trim();
            firstLineName = firstLineName.slice(0, lastSpace);
          } else {
            remainder = firstLineName.slice(nameLimit).trim();
            firstLineName = firstLineName.slice(0, nameLimit);
          }
        }

        if (width === 48) {
          const nameCol = firstLineName.padEnd(28, ' ');
          const qtyCol = (item.qty + 'x').padStart(4, ' ').padEnd(6, ' ');
          const priceCol = itemPrice.toFixed(2).padStart(12, ' ');
          pushBytes([0x1B, 0x45, 0x01]); // Bold ON
          pushStr(nameCol + ' ' + qtyCol + ' ' + priceCol + '\n');
          pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
        } else {
          const nameCol = firstLineName.padEnd(14, ' ');
          const qtyCol = (item.qty + 'x').padStart(4, ' ').padEnd(5, ' ');
          const priceCol = itemPrice.toFixed(2).padStart(11, ' ');
          pushBytes([0x1B, 0x45, 0x01]); // Bold ON
          pushStr(nameCol + ' ' + qtyCol + ' ' + priceCol + '\n');
          pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
        }

        if (remainder) pushStr('  ' + remainder + '\n');
        if (item.variation) pushStr('   - Cut: ' + item.variation + '\n');
        if (item.addons && item.addons.length > 0) pushStr('   - Extras: ' + item.addons.join(', ') + '\n');
        if (item.notes) pushStr('   - Note: ' + item.notes + '\n');
      }

      pushStr(divider);
    } else {
      // 2 Columns: ITEM (starts col 1), QTY (ends col 48)
      pushBytes([0x1B, 0x45, 0x01]); // Bold ON
      if (width === 48) {
        const colItemH = 'ITEM'.padEnd(38, ' ');
        const colQtyH = '      QTY';
        pushStr(colItemH + ' ' + colQtyH + '\n');
      } else {
        const colItemH = 'ITEM'.padEnd(22, ' ');
        const colQtyH = '      QTY';
        pushStr(colItemH + ' ' + colQtyH + '\n');
      }
      pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
      pushStr(divider);

      const nameLimit = width === 48 ? 38 : 22;
      for (const item of (slip.items || [])) {
        const name = item.name.length > nameLimit ? item.name.slice(0, nameLimit) : item.name;
        if (width === 48) {
          const nameCol = name.padEnd(38, ' ');
          const qtyCol = (item.qty + 'x').padStart(9, ' ');
          pushBytes([0x1B, 0x45, 0x01]); // Bold ON
          pushStr(nameCol + ' ' + qtyCol + '\n');
          pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
        } else {
          const nameCol = name.padEnd(22, ' ');
          const qtyCol = (item.qty + 'x').padStart(9, ' ');
          pushBytes([0x1B, 0x45, 0x01]); // Bold ON
          pushStr(nameCol + ' ' + qtyCol + '\n');
          pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
        }

        if (item.variation) pushStr('   - Cut: ' + item.variation + '\n');
        if (item.addons && item.addons.length > 0) pushStr('   - Extras: ' + item.addons.join(', ') + '\n');
        if (item.notes) pushStr('   - Note: ' + item.notes + '\n');
      }

      pushStr(divider);
    }

    // 6. Feed & Cut
    pushStr('\n\n\n');
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Build ESC/POS binary buffer for a customer bill / cash memo
  function buildBillEscPosBuffer(
    bill: {
      restaurantName?: string;
      restaurantAddress?: string;
      restaurantHotline?: string;
      restaurantBin?: string;
      invoiceNo: string;
      dateTime?: string;
      tableName: string;
      tableZone?: string;
      channelOrAgent?: string;
      waiter?: string;
      orderTakenBy?: string;
      orderCreatedBy?: string;
      settleBillRole?: string;
      cashierRole?: string;
      customer?: string;
      items: { name: string; qty: number; price: number; variation?: string; addons?: string[]; notes?: string }[];
      subtotal: number;
      discountDeduction?: number;
      discountType?: string;
      discountVal?: number;
      netTotal: number;
      isSettled?: boolean;
    }
  ): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    // Helper to format a 42-column dual aligned line (Label on left, Value on right)
    const line2Col = (left: string, right: string, width = 42) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, width - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, width - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r + '\n';
    };

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF (prevents muddy/bleeding characters)
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (12x24, 42 columns)

    // 3. Center Align: Restaurant Header
    pushBytes([0x1B, 0x61, 0x01]); // Center
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    pushStr(`${bill.restaurantName || cachedState?.restaurantProfile?.name || "BD HOSTT POS"}\n`);
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

    const width = (bill as any).paperWidth === '58mm' ? 32 : 48;
    const divider = '-'.repeat(width) + '\n';

    if ((bill as any).showAddress !== false) {
      const rawAddress = bill.restaurantAddress || cachedState?.restaurantProfile?.address || "Chattogram, Bangladesh";
      if (rawAddress) {
        if (rawAddress.includes(",")) {
          const parts = rawAddress.split(",").map(p => p.trim());
          let currentLine = "";
          for (const part of parts) {
            if (!currentLine) {
              currentLine = part;
            } else if ((currentLine + ", " + part).length <= (width - 2)) {
              currentLine += ", " + part;
            } else {
              pushStr(`${currentLine}\n`);
              currentLine = part;
            }
          }
          if (currentLine) {
            pushStr(`${currentLine}\n`);
          }
        } else {
          pushStr(`${rawAddress}\n`);
        }
      }
    }

    if ((bill as any).showPhone !== false) {
      const rawHotline = bill.restaurantHotline || cachedState?.restaurantProfile?.phone || "+880 1756-007600";
      if (rawHotline) {
        pushStr(`Hotline: ${rawHotline}\n`);
      }
    }

    if ((bill as any).showBinVat && bill.restaurantBin) {
      const rawBin = bill.restaurantBin || "0029381-01";
      pushStr(`BIN/VAT Reg: ${rawBin}\n`);
    }

    pushStr(divider);
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    const bannerText = bill.isSettled 
      ? ((bill as any).headerTitle && (bill as any).headerTitle.includes('PAID') ? (bill as any).headerTitle : "PAID CASH MEMO") 
      : ((bill as any).headerTitle || "INVOICE / GUEST BILL");
    pushStr(`${bannerText}\n`);
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    pushStr(divider);

    // 4. Left & Right Justified: Invoice metadata (Flush to margins)
    pushBytes([0x1B, 0x61, 0x00]); // Left
    pushStr(line2Col("Invoice No :", bill.invoiceNo || "INV-0000", width));
    let dateStr = "";
    let timeStr = "";
    const rawDt = bill.dateTime || new Date().toLocaleString("en-US");
    if (rawDt.includes(",")) {
      const parts = rawDt.split(",");
      dateStr = parts[0].trim();
      timeStr = parts.slice(1).join(",").trim();
    } else {
      const parts = rawDt.trim().split(/\s+/);
      if (parts.length >= 2) {
        dateStr = parts[0];
        timeStr = parts.slice(1).join(" ");
      } else {
        dateStr = rawDt;
        timeStr = new Date().toLocaleTimeString("en-US");
      }
    }
    pushStr(line2Col(`Date : ${dateStr}`, `Time: ${timeStr}`, width));
    if ((bill as any).showTableZone !== false) {
      pushStr(line2Col("Table & Zone :", `${bill.tableName || "Takeaway"}${bill.tableZone ? ` (${bill.tableZone})` : ""}`, width));
    }
    if (bill.channelOrAgent) {
      pushStr(line2Col("Channel :", bill.channelOrAgent, width));
    }
    if ((bill as any).showWaiter !== false) {
      const waiterTxt = bill.waiter && bill.waiter !== "N/A" && bill.waiter !== "Staff" ? bill.waiter : (bill.waiter || "Staff");
      pushStr(line2Col("Waiter :", waiterTxt, width));
    }
    const orderTaker = bill.orderTakenBy || bill.orderCreatedBy || bill.waiter || "Staff";
    if (orderTaker && orderTaker !== (bill.waiter || "Staff")) {
      pushStr(line2Col("Order Taken By :", orderTaker, width));
    }
    if (bill.isSettled) {
      const settleRole = bill.settleBillRole || bill.cashierRole || "Cashier";
      pushStr(line2Col("Bill Settled By :", settleRole, width));
    }
    if ((bill as any).showCustomer !== false && bill.customer && bill.customer !== "Walk-in Customer") {
      pushStr(line2Col("Customer :", bill.customer, width));
    }
    pushStr(divider);

    // 5. Items Header
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    if (width === 48) {
      const colItemH = "ITEM".padEnd(21, ' ');
      const colQtyH = " QTY ";
      const colPriceH = "    PRICE";
      const colTotalH = "     TOTAL";
      pushStr(`${colItemH} ${colQtyH} ${colPriceH} ${colTotalH}\n`);
    } else {
      const colItemH = "ITEM".padEnd(14, ' ');
      const colQtyH = "QTY";
      const colPriceH = " PRICE";
      const colTotalH = " TOTAL";
      pushStr(`${colItemH} ${colQtyH} ${colPriceH} ${colTotalH}\n`);
    }
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    pushStr(divider);

    // 6. Food Items (Crisp & High Legibility)
    const itemLimit = width === 48 ? 21 : 14;
    for (const item of bill.items) {
      let firstLineName = (item.name || "").trim();
      let remainder = "";
      if (firstLineName.length > itemLimit) {
        const lastSpace = firstLineName.lastIndexOf(" ", itemLimit);
        if (lastSpace > 8) {
          remainder = firstLineName.slice(lastSpace + 1).trim();
          firstLineName = firstLineName.slice(0, lastSpace);
        } else {
          remainder = firstLineName.slice(itemLimit).trim();
          firstLineName = firstLineName.slice(0, itemLimit);
        }
      }
      if (width === 48) {
        const colItem = firstLineName.padEnd(21, ' ');
        const colQty = (" " + item.qty + " ").padStart(5, ' ');
        const colPrice = Number(item.price).toFixed(2).padStart(9, ' ');
        const colTotal = Number(item.price * item.qty).toFixed(2).padStart(10, ' ');
        pushStr(`${colItem} ${colQty} ${colPrice} ${colTotal}\n`);
      } else {
        const colItem = firstLineName.padEnd(14, ' ');
        const colQty = String(item.qty).padStart(3, ' ');
        const colPrice = Number(item.price).toFixed(0).padStart(6, ' ');
        const colTotal = Number(item.price * item.qty).toFixed(0).padStart(6, ' ');
        pushStr(`${colItem} ${colQty} ${colPrice} ${colTotal}\n`);
      }

      if (remainder) {
        pushStr(`  ${remainder}\n`);
      }
      if (item.variation) {
        pushStr(`  * Cut: ${item.variation}\n`);
      }
      if (item.addons && item.addons.length > 0) {
        pushStr(`  + Extras: ${item.addons.join(", ")}\n`);
      }
      if (item.notes) {
        pushStr(`  - Note: ${item.notes}\n`);
      }
    }

    pushStr(divider);

    // 7. Financial Summary (Right-aligned matching the TOTAL column at column width)
    pushBytes([0x1B, 0x61, 0x00]); // Left align
    pushStr(line2Col("Subtotal:", Number(bill.subtotal || 0).toFixed(2), width));
    if (bill.discountDeduction && bill.discountDeduction > 0) {
      const discLbl = bill.discountType === 'percent' && bill.discountVal 
        ? `Discount (${bill.discountVal}%):` 
        : "Discount:";
      pushStr(line2Col(discLbl, `-${Number(bill.discountDeduction).toFixed(2)}`, width));
    }
    pushStr(divider);
    pushBytes([0x1B, 0x45, 0x01]); // Bold ON
    pushStr(line2Col("TOTAL PAYABLE:", Number(bill.netTotal || 0).toFixed(2), width));
    pushBytes([0x1B, 0x45, 0x00]); // Bold OFF

    // Payment breakdown if settled
    const pb = (bill as any).paymentBreakdown;
    if (pb && (bill as any).showPaymentBreakdown !== false) {
      pushStr(divider);
      if (pb.cash > 0) pushStr(line2Col("Cash Paid:", Number(pb.cash).toFixed(2), width));
      if (pb.card > 0) pushStr(line2Col("Card Paid:", Number(pb.card).toFixed(2), width));
      if (pb.bkash > 0) pushStr(line2Col("bKash Paid:", Number(pb.bkash).toFixed(2), width));
      if (pb.nagad > 0) pushStr(line2Col("Nagad Paid:", Number(pb.nagad).toFixed(2), width));
      if (pb.due > 0) pushStr(line2Col("Due / Credit:", Number(pb.due).toFixed(2), width));
      if ((bill as any).changeReturn && (bill as any).changeReturn > 0) {
        pushStr(line2Col("Change Return:", Number((bill as any).changeReturn).toFixed(2), width));
      }
    }
    pushStr(divider);

    // 8. Center Align: Footer Note
    pushBytes([0x1B, 0x61, 0x01]); // Center
    if (bill.isSettled) {
      pushBytes([0x1B, 0x45, 0x01]); // Bold ON
      pushStr("*** PAID & SETTLED ***\n");
      pushBytes([0x1B, 0x45, 0x00]); // Bold OFF
    }
    if ((bill as any).footerMessage) {
      pushStr(`${(bill as any).footerMessage}\n`);
    } else {
      pushStr("Thank you for dining with us!\n");
      pushStr("Please visit again\n");
    }
    if ((bill as any).footerNotes) {
      pushStr(`${(bill as any).footerNotes}\n`);
    }
    pushStr(divider);

    // 9. Feed & Cut
    pushStr("\n\n\n");
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Build ESC/POS binary buffer for a POS Shift End Z-Report
  function buildZReportEscPosBuffer(
    report: {
      restaurantName?: string;
      restaurantAddress?: string;
      restaurantHotline?: string;
      restaurantBin?: string;
      session: {
        id: string;
        date: string;
        openedBy: string;
        closedBy?: string;
        startTime: string;
        endTime?: string;
        orderCount: number;
        cashSales: number;
        cardSales: number;
        bkashSales: number;
        nagadSales: number;
        dueSales: number;
        totalSales: number;
        openingCash: number;
        expectedCash: number;
        actualClosingCash?: number;
        cashDifference?: number;
        shiftType?: string;
        notes?: string;
      }
    }
  ): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    const line2Col = (left: string, right: string, width = 42) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, width - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, width - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r + '\n';
    };

    const s = report.session;

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (42 columns)

    // 3. Center Align: Restaurant Header
    pushBytes([0x1B, 0x61, 0x01]); // Center
    pushStr(`${report.restaurantName || cachedState?.restaurantProfile?.name || "BD HOSTT POS"}\n`);

    // Restaurant Address
    const rawAddress = report.restaurantAddress || cachedState?.restaurantProfile?.address || "Chattogram, Bangladesh";
    if (rawAddress) {
      if (rawAddress.includes(",")) {
        const parts = rawAddress.split(",").map(p => p.trim());
        let currentLine = "";
        for (const part of parts) {
          if (!currentLine) {
            currentLine = part;
          } else if ((currentLine + ", " + part).length <= 40) {
            currentLine += ", " + part;
          } else {
            pushStr(`${currentLine}\n`);
            currentLine = part;
          }
        }
        if (currentLine) {
          pushStr(`${currentLine}\n`);
        }
      } else {
        pushStr(`${rawAddress}\n`);
      }
    }

    const rawHotline = report.restaurantHotline || cachedState?.restaurantProfile?.phone || "+880 1756-007600";
    if (rawHotline) {
      pushStr(`Hotline: ${rawHotline}\n`);
    }

    const rawBin = report.restaurantBin || "0029381-01";
    if (rawBin) {
      pushStr(`BIN/VAT Reg: ${rawBin}\n`);
    }

    pushStr("------------------------------------------\n");
    pushStr("*** POS SHIFT Z-REPORT ***\n");
    pushStr("------------------------------------------\n");

    // 4. Session Meta Information (Left Align)
    pushBytes([0x1B, 0x61, 0x00]); // Left
    pushStr(line2Col("Session ID    :", s.id || "SES-ACTIVE"));
    pushStr(line2Col("Date          :", s.date || new Date().toISOString().split("T")[0]));
    pushStr(line2Col("Shift Name    :", s.shiftType || "Shift 1"));
    pushStr(line2Col("Shift Timing  :", `${s.startTime || "N/A"} - ${s.endTime || "Closed"}`));
    pushStr(line2Col("Opened By     :", s.openedBy || "Cashier"));
    if (s.closedBy) {
      pushStr(line2Col("Closed By     :", s.closedBy));
    }
    if ((s as any).handoverToCashier) {
      pushStr(line2Col("Handover To   :", (s as any).handoverToCashier));
    }
    pushStr(line2Col("Orders Settled:", `${s.orderCount || 0} Invoices`));
    pushStr("------------------------------------------\n");

    // 5. Sales Payment Breakdown
    pushStr("1. SALES PAYMENT BREAKDOWN\n");
    pushStr(line2Col("Cash Sales       :", Number(s.cashSales || 0).toFixed(2)));
    pushStr(line2Col("Credit/Debit Card:", Number(s.cardSales || 0).toFixed(2)));
    pushStr(line2Col("bKash Payment    :", Number(s.bkashSales || 0).toFixed(2)));
    pushStr(line2Col("Nagad Payment    :", Number(s.nagadSales || 0).toFixed(2)));
    if (s.dueSales && s.dueSales > 0) {
      pushStr(line2Col("Customer Due     :", Number(s.dueSales).toFixed(2)));
    }
    pushStr("------------------------------------------\n");
    pushStr(line2Col("GROSS SHIFT REVENUE:", Number(s.totalSales || 0).toFixed(2)));
    pushStr("------------------------------------------\n");

    // 2. Cash Collection (Staff / Cashier Breakdown)
    const cashiers = (s as any).cashierBreakdown;
    pushStr(`2. CASH COLLECTION (${(cashiers && Array.isArray(cashiers)) ? cashiers.length : 1} STAFF)\n`);

    if (cashiers && Array.isArray(cashiers) && cashiers.length > 0) {
      for (const c of cashiers) {
        const shName = c.shift || s.shiftType || "Shift 1";
        const cleanCashier = (c.cashier || '').replace(/\s*\([A-Z_]+\)\s*$/i, '').trim();
        const roleTag = c.role ? ` (${c.role})` : '';
        pushStr(line2Col(`* [${shName}] ${cleanCashier}${roleTag}:`, `Tk ${Number(c.totalCollected || 0).toFixed(2)}`));
        const due = c.dueAmount !== undefined ? c.dueAmount : Math.max(0, (c.totalCollected || 0) - (c.cashCollected || 0) - (c.digitalCollected || 0));
        const dueStr = due > 0 ? ` | Due: Tk ${Number(due).toFixed(0)}` : '';
        pushStr(`   (${c.orderCount || 0} inv) Cash: Tk ${Number(c.cashCollected || 0).toFixed(0)} | Dig: Tk ${Number(c.digitalCollected || 0).toFixed(0)}${dueStr}\n`);
      }
    } else {
      pushStr(line2Col(`* [${s.shiftType || 'Shift 1'}] ${s.openedBy}:`, `Tk ${Number(s.totalSales || 0).toFixed(2)}`));
      pushStr(`   (${s.orderCount || 0} inv) Cash: Tk ${Number(s.cashSales || 0).toFixed(0)} | Dig: Tk ${Number((s.cardSales || 0) + (s.bkashSales || 0) + (s.nagadSales || 0)).toFixed(0)}\n`);
    }
    pushStr("------------------------------------------\n");

    // 3. Role-Wise Sales Breakdown (Only active roles that sold)
    const rawRoles = (s as any).roleBreakdown;
    const roles = Array.isArray(rawRoles) ? rawRoles.filter((r: any) => (Number(r.orderCount) || 0) > 0 || (Number(r.totalCollected) || 0) > 0) : [];
    if (roles && roles.length > 0) {
      pushStr(`3. ROLE-WISE SALES (${roles.length} ROLES)\n`);
      for (const r of roles) {
        pushStr(line2Col(`* [${r.role}] (${r.orderCount} ord):`, `Tk ${Number(r.totalCollected || 0).toFixed(2)}`));
      }
      pushStr("------------------------------------------\n");
    }

    // 4. Waiter-wise Sales Breakdown
    const waiters = (s as any).waiterBreakdown;
    if (waiters && Array.isArray(waiters) && waiters.length > 0) {
      pushStr(`4. WAITER-WISE SALES (${waiters.length} WAITERS)\n`);
      for (const w of waiters) {
        const pct = s.totalSales > 0 ? Math.round(((w.totalSales || 0) / s.totalSales) * 100) : 0;
        pushStr(line2Col(`* ${w.waiter} (${w.orderCount} ord - ${pct}%):`, `Tk ${Number(w.totalSales || 0).toFixed(2)}`));
      }
      pushStr("------------------------------------------\n");
    }

    // 5. Cash Drawer Reconciliation
    pushStr("5. CASH DRAWER RECONCILIATION\n");
    pushStr(line2Col("(+) Opening Float     :", Number(s.openingCash || 0).toFixed(2)));
    pushStr(line2Col("(+) Cash Sales Total  :", Number(s.cashSales || 0).toFixed(2)));
    pushStr(line2Col("(=) Expected in Drawer:", Number(s.expectedCash || 0).toFixed(2)));
    pushStr(line2Col("Actual Counted Cash   :", Number(s.actualClosingCash ?? s.expectedCash ?? 0).toFixed(2)));
    pushStr("------------------------------------------\n");

    // Variance
    const diff = Number(s.cashDifference || 0);
    const varTxt = diff === 0 
      ? "0.00 (MATCH)" 
      : diff < 0 
        ? `-${Math.abs(diff).toFixed(2)} (SHORT)` 
        : `+${diff.toFixed(2)} (OVER)`;
    pushStr(line2Col("DRAWER VARIANCE:", varTxt));
    pushStr("------------------------------------------\n");

    // 5.1 Cash Handover & Settlement Allocation
    if ((s as any).nextShiftDrawerFloat !== undefined || (s as any).cashDropToVault !== undefined) {
      pushStr(">> CASH ALLOCATION:\n");
      if ((s as any).nextShiftDrawerFloat !== undefined) {
        pushStr(line2Col("1. Float Left in Drawer:", `Tk ${Number((s as any).nextShiftDrawerFloat || 0).toFixed(2)}`));
      }
      if ((s as any).cashDropToVault !== undefined) {
        pushStr(line2Col("2. Drop to Vault / Safe:", `Tk ${Number((s as any).cashDropToVault || 0).toFixed(2)}`));
      }
      pushStr("------------------------------------------\n");
    }

    // 6. Shift Notes (if any)
    if (s.notes) {
      pushStr(`Shift Notes:\n  ${s.notes}\n`);
      pushStr("------------------------------------------\n");
    }

    // 7. Signatures
    pushStr("\n");
    pushStr("Cashier Signature       Manager Signature \n");
    pushStr("_________________       _________________ \n\n");

    // 8. Center Align Footer
    pushBytes([0x1B, 0x61, 0x01]); // Center
    pushStr("*** END OF SHIFT Z-REPORT ***\n");
    pushStr(`Printed: ${new Date().toLocaleString("en-US")}\n`);
    pushStr("------------------------------------------\n");

    // Feed & Cut
    pushStr("\n\n\n");
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Build ESC/POS binary buffer for Waiter Server Slip
  function buildWaiterSlipEscPosBuffer(data: {
    restaurantName?: string;
    restaurantAddress?: string;
    waiterName: string;
    date: string;
    time: string;
    totalOrders: number;
    totalSales: number;
    estimatedTips: number;
    serverCashFloat?: number;
    runningTables?: { name: string; zone: string; total: number }[];
  }): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    const line2Col = (left: string, right: string, width = 42) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, width - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, width - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r + '\n';
    };

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (42 columns)

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr(`${data.restaurantName || cachedState?.restaurantProfile?.name || "BD HOSTT POS"}\n`);
    pushStr(`${data.restaurantAddress || cachedState?.restaurantProfile?.address || "Chattogram, Bangladesh"}\n`);
    pushStr("------------------------------------------\n");
    pushStr("*** WAITER SERVER SUMMARY SLIP ***\n");
    pushStr("------------------------------------------\n");

    pushBytes([0x1B, 0x61, 0x00]);
    pushStr(line2Col("Waiter Name   :", data.waiterName || "Staff"));
    pushStr(line2Col("Date          :", data.date || "Today"));
    pushStr(line2Col("Time Printed  :", data.time || "N/A"));
    pushStr(line2Col("Orders Served :", `${data.totalOrders || 0} Orders`));
    pushStr("------------------------------------------\n");

    pushStr(line2Col("TOTAL SALES GENERATED:", Number(data.totalSales || 0).toFixed(2)));
    pushStr(line2Col("ESTIMATED TIPS (5%)  :", Number(data.estimatedTips || 0).toFixed(2)));
    pushStr("------------------------------------------\n");

    if (data.serverCashFloat && data.serverCashFloat > 0) {
      pushStr(line2Col("SERVER CASH FLOAT (POCKET):", Number(data.serverCashFloat || 0).toFixed(2)));
      pushStr(line2Col("FLOAT RETURN TO REGISTER  :", Number(data.serverCashFloat || 0).toFixed(2)));
      pushStr("------------------------------------------\n");
    }

    if (data.runningTables && data.runningTables.length > 0) {
      pushStr("RUNNING TABLES HANDED OVER:\n");
      for (const t of data.runningTables) {
        pushStr(line2Col(`* ${t.name} (${t.zone}):`, Number(t.total || 0).toFixed(2)));
      }
      pushStr("------------------------------------------\n");
    }

    pushStr("\n");
    pushStr("Waiter Signature        Manager Signature\n");
    pushStr("_________________       _________________\n\n");

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr("*** END OF SERVER SLIP ***\n");
    pushStr("------------------------------------------\n");

    pushStr("\n\n\n");
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Build ESC/POS binary buffer for Daily Consolidated Day-End Master Z-Report
  function buildDayEndEscPosBuffer(data: {
    restaurantName?: string;
    restaurantAddress?: string;
    dayRecord: {
      id: string;
      date: string;
      totalDaySales: number;
      totalDayOrders: number;
      shiftCount: number;
      shiftIds: string[];
      totalCash: number;
      totalCard: number;
      totalBkash: number;
      totalNagad: number;
      totalDue: number;
      totalExpenses: number;
      netCashToVault: number;
      closedBy: string;
      closedAt: string;
      notes?: string;
    };
    daySessions?: any[];
  }): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    const line2Col = (left: string, right: string, width = 42) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, width - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, width - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r + '\n';
    };

    const r = data.dayRecord;

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (42 columns)

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr(`${data.restaurantName || cachedState?.restaurantProfile?.name || "BD HOSTT POS"}\n`);
    pushStr(`${data.restaurantAddress || cachedState?.restaurantProfile?.address || "Chattogram, Bangladesh"}\n`);
    pushStr("------------------------------------------\n");
    pushStr("*** DAILY MASTER DAY-END Z-REPORT ***\n");
    pushStr("------------------------------------------\n");

    pushBytes([0x1B, 0x61, 0x00]);
    pushStr(line2Col("Day End ID    :", r.id));
    pushStr(line2Col("Business Date :", r.date));
    if ((r as any).openedBy) {
      pushStr(line2Col("Day Started By:", (r as any).openedBy));
    }
    if ((r as any).openedAt) {
      pushStr(line2Col("Start Time    :", (r as any).openedAt));
    }
    if ((r as any).openingCash !== undefined) {
      pushStr(line2Col("Opening Float :", `Tk ${Number((r as any).openingCash).toFixed(2)}`));
    }
    pushStr(line2Col("Day Closed By :", r.closedBy));
    pushStr(line2Col("Close Time    :", r.closedAt));
    if ((r as any).closingCash !== undefined) {
      pushStr(line2Col("Closing Cash  :", `Tk ${Number((r as any).closingCash).toFixed(2)}`));
    }
    pushStr(line2Col("Total Shifts  :", `${r.shiftCount} Shifts Consolidated`));
    pushStr(line2Col("Total Orders  :", `${r.totalDayOrders} Orders`));
    pushStr("------------------------------------------\n");

    // Shift 1, Shift 2... Summary
    if (data.daySessions && Array.isArray(data.daySessions) && data.daySessions.length > 0) {
      pushStr(">> SHIFT BREAKDOWN (SHIFT 1, 2...):\n");
      data.daySessions.forEach((s: any, idx: number) => {
        const shName = s.shiftType || `Shift ${idx + 1}`;
        pushStr(line2Col(`* [${shName}] ${s.openedBy}:`, `Tk ${Number(s.totalSales || 0).toFixed(2)}`));
        pushStr(`   Time : ${s.startTime || 'N/A'} - ${s.endTime || 'Active'} (${s.orderCount || 0} Invoices)\n`);
        pushStr(`   Float: Tk ${Number(s.openingCash || 0).toFixed(0)} | Cash: Tk ${Number(s.cashSales || 0).toFixed(0)} | Dig: Tk ${Number((s.cardSales || 0) + (s.bkashSales || 0) + (s.nagadSales || 0)).toFixed(0)}\n`);
        if (s.actualClosingCash !== undefined) {
          pushStr(`   Drawer Close: Tk ${Number(s.actualClosingCash).toFixed(0)}\n`);
        }
      });
      pushStr("------------------------------------------\n");
    }

    pushStr("1. CONSOLIDATED PAYMENT REVENUE\n");
    pushStr(line2Col("Cash Sales (Total) :", Number(r.totalCash || 0).toFixed(2)));
    pushStr(line2Col("Card Sales (Total) :", Number(r.totalCard || 0).toFixed(2)));
    pushStr(line2Col("bKash Sales (Total):", Number(r.totalBkash || 0).toFixed(2)));
    pushStr(line2Col("Nagad Sales (Total):", Number(r.totalNagad || 0).toFixed(2)));
    if (r.totalDue > 0) {
      pushStr(line2Col("Due / Credit Total :", Number(r.totalDue || 0).toFixed(2)));
    }
    pushStr("------------------------------------------\n");
    pushStr(line2Col("GROSS DAILY REVENUE:", Number(r.totalDaySales || 0).toFixed(2)));
    pushStr("------------------------------------------\n");

    pushStr("2. EXPENSES & VAULT DEPOSIT\n");
    pushStr(line2Col("(-) Daily Petty Exp:", Number(r.totalExpenses || 0).toFixed(2)));
    pushStr("------------------------------------------\n");
    pushStr(line2Col("NET CASH TO VAULT  :", Number(r.netCashToVault || 0).toFixed(2)));
    pushStr("------------------------------------------\n");

    pushStr("\n");
    pushStr("General Manager         Managing Director\n");
    pushStr("_________________       _________________\n\n");

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr("*** END OF DAILY MASTER REPORT ***\n");
    pushStr("------------------------------------------\n");

    pushStr("\n\n\n");
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Build ESC/POS binary buffer for Kitchen Chef Production & Handover Slip
  function buildChefSlipEscPosBuffer(data: {
    restaurantName?: string;
    restaurantAddress?: string;
    shift: {
      id: string;
      chefName: string;
      station: string;
      shiftType: string;
      date: string;
      startTime: string;
      endTime?: string;
      kotsPreparedCount: number;
      dishesCookedCount: number;
      notes?: string;
      handoverToChef?: string;
    };
  }): Buffer {
    const chunks: Buffer[] = [];
    const pushStr = (str: string) => chunks.push(Buffer.from(str, 'latin1'));
    const pushBytes = (arr: number[]) => chunks.push(Buffer.from(arr));

    const line2Col = (left: string, right: string, width = 42) => {
      const l = left.trim();
      const r = right.trim();
      const maxL = Math.max(0, width - 1 - r.length);
      const safeL = l.length > maxL ? l.slice(0, maxL) : l;
      const spaces = Math.max(1, width - safeL.length - r.length);
      return safeL + ' '.repeat(spaces) + r + '\n';
    };

    const s = data.shift;

    // 1. ESC @ : Initialize printer
    pushBytes([0x1B, 0x40]);

    // 2. Hardware Thermal Calibration (Clean, Crisp, Normal Density)
    pushBytes([0x1B, 0x47, 0x00]); // ESC G 0: Double-strike OFF
    pushBytes([0x1B, 0x45, 0x00]); // ESC E 0: Bold OFF by default
    pushBytes([0x1B, 0x21, 0x00]); // ESC ! 0: Uniform font A (42 columns)

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr(`${data.restaurantName || cachedState?.restaurantProfile?.name || "BD HOSTT POS"}\n`);
    pushStr(`${data.restaurantAddress || cachedState?.restaurantProfile?.address || "Chattogram, Bangladesh"}\n`);
    pushStr("------------------------------------------\n");
    pushStr("*** KITCHEN PRODUCTION & HANDOVER SLIP ***\n");
    pushStr("------------------------------------------\n");

    pushBytes([0x1B, 0x61, 0x00]);
    pushStr(line2Col("Shift ID      :", s.id || "KCS-ACTIVE"));
    pushStr(line2Col("Chef Name     :", s.chefName || "Head Chef"));
    pushStr(line2Col("Station       :", s.station || "Main Kitchen"));
    pushStr(line2Col("Shift Timing  :", s.shiftType || "Morning Shift"));
    pushStr(line2Col("Date          :", s.date || new Date().toISOString().split('T')[0]));
    pushStr(line2Col("Duty Hours    :", `${s.startTime} - ${s.endTime || "In Progress"}`));
    pushStr("------------------------------------------\n");

    pushStr("KITCHEN PRODUCTION STATS:\n");
    pushStr(line2Col("KOTs Processed    :", `${s.kotsPreparedCount || 0} Tickets`));
    pushStr(line2Col("Total Dishes Cooked:", `${s.dishesCookedCount || 0} Portions`));
    pushStr("------------------------------------------\n");

    if (s.handoverToChef) {
      pushStr(line2Col("HANDOVER TO CHEF  :", s.handoverToChef));
      pushStr("------------------------------------------\n");
    }

    if (s.notes) {
      pushStr(`Kitchen Notes:\n  ${s.notes}\n`);
      pushStr("------------------------------------------\n");
    }

    pushStr("\n");
    pushStr("Outgoing Chef           Incoming Chef\n");
    pushStr("_________________       _________________\n\n");

    pushBytes([0x1B, 0x61, 0x01]);
    pushStr("*** END OF KITCHEN SLIP ***\n");
    pushStr("------------------------------------------\n");

    pushStr("\n\n\n");
    pushBytes([0x1D, 0x56, 0x00]);

    return Buffer.concat(chunks);
  }

  // Print individual slip as an isolated RAW ESC/POS Windows print job (~80ms via native raw-print.exe)
  async function printSlipWindows(printerName: string, rawBuffer: Buffer): Promise<boolean> {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `kot_slip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
      fs.writeFileSync(tempFile, rawBuffer);

      const safePrinter = (printerName || "80 Printer").trim();
      const fastExe = path.join(process.cwd(), "scripts", "raw-print.exe");
      const usbDevPath = cachedWinDiscovery.usbPaths[0] || "";

      if (fs.existsSync(fastExe)) {
        execFile(fastExe, [safePrinter, tempFile, usbDevPath], { timeout: 2500 }, (err) => {
          if (!err) {
            try { fs.unlinkSync(tempFile); } catch (e) {}
            return resolve(true);
          }
          const scriptPath = path.join(process.cwd(), "scripts", "print-raw.ps1");
          const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${safePrinter.replace(/"/g, '`"')}" -FilePath "${tempFile.replace(/"/g, '`"')}"`;
          exec(psCmd, (error) => {
            try { fs.unlinkSync(tempFile); } catch (e) {}
            resolve(!error);
          });
        });
        return;
      }

      const scriptPath = path.join(process.cwd(), "scripts", "print-raw.ps1");
      const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${safePrinter.replace(/"/g, '`"')}" -FilePath "${tempFile.replace(/"/g, '`"')}"`;

      exec(psCmd, (error) => {
        try { fs.unlinkSync(tempFile); } catch (e) {}
        if (error) {
          console.error(`Error printing raw slip to ${printerName}:`, error.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Cloud Print Bridge Job Queue (For Remote Thermal Printing via Local Agent)
  // ---------------------------------------------------------------------------
  interface CloudPrintJob {
    id: string;
    type: 'KOT' | 'BILL' | 'ZREPORT' | 'WAITER_SLIP' | 'CHEF_SLIP' | 'DAYEND';
    payload: any;
    createdAt: number;
    status: 'pending' | 'completed';
  }

  const cloudPrintJobs: CloudPrintJob[] = [];
  let lastAgentHeartbeat = 0;
  let lastAgentTelemetry: {
    activePrinter?: string;
    isUsbConnected?: boolean;
    isLanReachable?: boolean;
    printers?: string[];
    detailedPrinters?: any[];
  } = {};

  function enqueueCloudPrintJob(type: CloudPrintJob['type'], payload: any) {
    const job: CloudPrintJob = {
      id: 'pjob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type,
      payload,
      createdAt: Date.now(),
      status: 'pending'
    };
    cloudPrintJobs.push(job);
    if (cloudPrintJobs.length > 60) {
      cloudPrintJobs.splice(0, cloudPrintJobs.length - 60);
    }
    console.log(`📥 [Print Queue] Enqueued ${type} job (${job.id}) for local print bridge.`);
    return job;
  }

  // REST endpoint: Discover connected Windows printers & USB devices dynamically (from local Windows server or active floor agent)
  app.get("/api/hardware/printers", async (req, res) => {
    try {
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;
      const localDiscovery = process.platform === 'win32'
        ? await getWindowsPrintersDetailed()
        : { names: [], detailed: [], isUsbConnected: false };

      const agentPrinters = (isAgentOnline && Array.isArray(lastAgentTelemetry.printers)) ? lastAgentTelemetry.printers : [];
      const mergedPrinters = Array.from(new Set([...agentPrinters, ...localDiscovery.names]));
      const activePrinter = (isAgentOnline && lastAgentTelemetry.activePrinter) || resolveThermalPrinter(mergedPrinters);

      const mergedDetailedMap = new Map<string, any>();
      if (isAgentOnline && Array.isArray(lastAgentTelemetry.detailedPrinters)) {
        for (const item of lastAgentTelemetry.detailedPrinters) {
          if (item && item.name) mergedDetailedMap.set(item.name.toLowerCase(), item);
        }
      }
      for (const item of localDiscovery.detailed) {
        if (item && item.name && !mergedDetailedMap.has(item.name.toLowerCase())) {
          mergedDetailedMap.set(item.name.toLowerCase(), item);
        }
      }
      for (const name of mergedPrinters) {
        if (name && !mergedDetailedMap.has(name.toLowerCase())) {
          mergedDetailedMap.set(name.toLowerCase(), {
            name,
            portName: /80\s*printer/i.test(name) ? 'USB001 / 192.168.1.87' : 'USB001',
            connectionType: /lan|192\./i.test(name) ? 'LAN' : 'USB',
            ipAddress: '192.168.1.87',
            port: 9100,
            usbPort: 'USB001',
            isConnected: true
          });
        }
      }

      const detailedPrinters = Array.from(mergedDetailedMap.values());

      res.json({
        success: true,
        isAgentOnline,
        isUsbConnected: isAgentOnline ? Boolean(lastAgentTelemetry.isUsbConnected) : localDiscovery.isUsbConnected,
        isLanReachable: isAgentOnline ? Boolean(lastAgentTelemetry.isLanReachable) : false,
        printers: mergedPrinters,
        detailedPrinters,
        activePrinter
      });
    } catch (err: any) {
      res.json({ success: false, printers: [], detailedPrinters: [], error: err?.message });
    }
  });

  // REST endpoints for Local Print Bridge Agent
  app.get("/api/print-bridge/poll", (req, res) => {
    lastAgentHeartbeat = Date.now();
    const metaHeader = req.headers['x-agent-printers'];
    if (typeof metaHeader === 'string' && metaHeader.trim()) {
      try {
        const decoded = JSON.parse(Buffer.from(metaHeader, 'base64').toString('utf8'));
        if (decoded && typeof decoded === 'object') {
          lastAgentTelemetry = decoded;
        }
      } catch {}
    }
    const pending = cloudPrintJobs.filter(j => j.status === 'pending');
    res.json({
      success: true,
      jobs: pending,
      serverTime: Date.now()
    });
  });

  app.post("/api/print-bridge/complete", (req, res) => {
    lastAgentHeartbeat = Date.now();
    const { jobIds } = req.body || {};
    if (Array.isArray(jobIds)) {
      for (const j of cloudPrintJobs) {
        if (jobIds.includes(j.id)) {
          j.status = 'completed';
        }
      }
    }
    res.json({ success: true });
  });

  app.get("/api/print-bridge/status", (req, res) => {
    const isOnline = (Date.now() - lastAgentHeartbeat) < 30000;
    res.json({
      success: true,
      isAgentOnline: isOnline,
      activePrinter: isOnline ? lastAgentTelemetry.activePrinter : undefined,
      isUsbConnected: isOnline ? Boolean(lastAgentTelemetry.isUsbConnected) : false,
      isLanReachable: isOnline ? Boolean(lastAgentTelemetry.isLanReachable) : false,
      printers: isOnline ? (lastAgentTelemetry.printers || []) : [],
      detailedPrinters: isOnline ? (lastAgentTelemetry.detailedPrinters || []) : [],
      lastHeartbeatAgoSeconds: Math.floor((Date.now() - lastAgentHeartbeat) / 1000),
      pendingCount: cloudPrintJobs.filter(j => j.status === 'pending').length
    });
  });

  // Download 1-Click Printer Agent Setup ZIP
  app.get("/api/download/printer-agent-zip", (req, res) => {
    const brandSlug = "POSDEMO";
    const candidates = [
      path.join(process.cwd(), "public", "downloads", "POSDEMO-Printer-Setup.zip"),
      path.join(process.cwd(), "dist", "downloads", "POSDEMO-Printer-Setup.zip")
    ];
    for (const zipPath of candidates) {
      if (fs.existsSync(zipPath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${brandSlug}-Printer-Setup.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        return res.sendFile(zipPath);
      }
    }
    return res.status(404).json({ success: false, error: "Setup package not found" });
  });

  // Download 1-Click Installer BAT directly
  app.get("/api/download/printer-installer-bat", (req, res) => {
    const batCandidates = [
      path.join(process.cwd(), "scripts", "INSTALL-POSDEMO-PRINTER.bat")
    ];
    const batPath = batCandidates.find(p => fs.existsSync(p));
    if (batPath) {
      // Strictly resolve target URL from .env (APP_URL) or current incoming request
      const effectiveUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
      let batContent = fs.readFileSync(batPath, 'utf8');

      // Ensure the generated installer strictly connects to effectiveUrl and never hits other servers
      batContent = batContent.replace(/http:\/\/localhost:3000/g, effectiveUrl);
      batContent = batContent.replace(/https:\/\/posdemo\.bdhostt\.com/g, effectiveUrl);
      batContent = batContent.replace(/https:\/\/tsc-cafeteria\.onrender\.com/g, effectiveUrl);

      res.setHeader('Content-Disposition', `attachment; filename="INSTALL-POSDEMO-PRINTER.bat"`);
      res.setHeader('Content-Type', 'application/x-bat');
      return res.send(batContent);
    }
    return res.status(404).json({ success: false, error: "Installer script not found" });
  });

  // REST endpoint: Direct hardware Bill / Cash Memo print with auto-cut
  app.post("/api/hardware/print-bill", async (req, res) => {
    try {
      const billData = req.body;
      if (!billData || !billData.items || billData.items.length === 0) {
        return res.status(400).json({ success: false, error: "No bill data provided" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const targetPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Bill Print] Printing bill for ${billData.tableName} on "${targetPrinter}"`);
        const rawBuffer = buildBillEscPosBuffer(billData);
        const ok = await printSlipWindows(targetPrinter, rawBuffer);
        if (ok) {
          return res.json({
            success: true,
            printerUsed: targetPrinter,
            isLocalServer: true
          });
        }
      }

      // Enqueue for remote/other PC print agent if local print unavailable or on Linux/Cloud
      enqueueCloudPrintJob('BILL', billData);

      console.log(`☁️ [Cloud Bill Queue] Enqueued bill for ${billData.tableName}. Agent online: ${isAgentOnline}`);
      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline,
        message: isAgentOnline
          ? "Bill queued and dispatched to active local printer agent"
          : "Bill queued in cloud. Run start-printer-agent.bat on cashier PC."
      });
    } catch (err: any) {
      console.error("Hardware bill print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware bill print failed" });
    }
  });

  // REST endpoint: Direct hardware POS Shift End Z-Report print with auto-cut
  app.post("/api/hardware/print-zreport", async (req, res) => {
    try {
      const reportData = req.body;
      if (!reportData || !reportData.session) {
        return res.status(400).json({ success: false, error: "No session report data provided" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const targetPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Z-Report Print] Printing shift Z-Report for session ${reportData.session.id} on "${targetPrinter}"`);
        const rawBuffer = buildZReportEscPosBuffer(reportData);
        const ok = await printSlipWindows(targetPrinter, rawBuffer);
        if (ok) {
          return res.json({
            success: true,
            printerUsed: targetPrinter,
            isLocalServer: true
          });
        }
      }

      enqueueCloudPrintJob('ZREPORT', reportData);

      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline
      });
    } catch (err: any) {
      console.error("Hardware Z-Report print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware Z-Report print failed" });
    }
  });

  // REST endpoint: Direct hardware Waiter Shift Summary Slip print
  app.post("/api/hardware/print-waiter-slip", async (req, res) => {
    try {
      const slipData = req.body;
      if (!slipData || !slipData.waiterName) {
        return res.status(400).json({ success: false, error: "No waiter slip data provided" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const targetPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Waiter Slip Print] Printing slip for waiter ${slipData.waiterName} on "${targetPrinter}"`);
        const rawBuffer = buildWaiterSlipEscPosBuffer(slipData);
        const ok = await printSlipWindows(targetPrinter, rawBuffer);
        if (ok) {
          return res.json({
            success: true,
            printerUsed: targetPrinter,
            isLocalServer: true
          });
        }
      }

      enqueueCloudPrintJob('WAITER_SLIP', slipData);

      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline
      });
    } catch (err: any) {
      console.error("Hardware Waiter Slip print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware Waiter Slip print failed" });
    }
  });

  // REST endpoint: Direct hardware Daily Consolidated Day-End Master Z-Report print
  app.post("/api/hardware/print-dayend", async (req, res) => {
    try {
      const dayData = req.body;
      if (!dayData || !dayData.dayRecord) {
        return res.status(400).json({ success: false, error: "No day-end report data provided" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const targetPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Day-End Print] Printing master day-end for date ${dayData.dayRecord.date} on "${targetPrinter}"`);
        const rawBuffer = buildDayEndEscPosBuffer(dayData);
        const ok = await printSlipWindows(targetPrinter, rawBuffer);
        if (ok) {
          return res.json({
            success: true,
            printerUsed: targetPrinter,
            isLocalServer: true
          });
        }
      }

      enqueueCloudPrintJob('DAYEND', dayData);

      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline
      });
    } catch (err: any) {
      console.error("Hardware Day-End print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware Day-End print failed" });
    }
  });

  // REST endpoint: Direct hardware Kitchen Chef Production & Handover Slip print
  app.post("/api/hardware/print-chef-slip", async (req, res) => {
    try {
      const shiftData = req.body;
      if (!shiftData || !shiftData.shift) {
        return res.status(400).json({ success: false, error: "No chef shift data provided" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const targetPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Chef Slip Print] Printing production slip for chef ${shiftData.shift.chefName} on "${targetPrinter}"`);
        const rawBuffer = buildChefSlipEscPosBuffer(shiftData);
        const ok = await printSlipWindows(targetPrinter, rawBuffer);
        if (ok) {
          return res.json({
            success: true,
            printerUsed: targetPrinter,
            isLocalServer: true
          });
        }
      }

      enqueueCloudPrintJob('CHEF_SLIP', shiftData);

      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline
      });
    } catch (err: any) {
      console.error("Hardware Chef Slip print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware Chef Slip print failed" });
    }
  });

  // REST endpoint: Direct hardware KOT print with automatic printer fallback and slip auto-cut
  app.post("/api/hardware/print-kot", async (req, res) => {
    try {
      const { tableName, tableZone, waiter, customer, invoiceNo, dateTime, slips } = req.body;
      if (!slips || !Array.isArray(slips) || slips.length === 0) {
        return res.status(400).json({ success: false, error: "No slips provided to print" });
      }

      const isWindows = process.platform === 'win32';
      const isAgentOnline = (Date.now() - lastAgentHeartbeat) < 30000;

      if (isWindows) {
        const installedPrinters = await getWindowsPrinters();
        const masterPrinter = resolveThermalPrinter(installedPrinters);

        console.log(`🖨️ [Hardware Print] Processing ${slips.length} KOT slips. Master fallback printer: "${masterPrinter}"`);

        let printedCount = 0;
        for (let i = 0; i < slips.length; i++) {
          const slip = slips[i];
          const targetPrinter = resolveThermalPrinter(installedPrinters, slip.targetPrinterName);
          console.log(` ➔ Printing KOT Slip ${i + 1}/${slips.length} on "${targetPrinter}"...`);

          const rawBuffer = buildKotEscPosBuffer(
            { tableName, tableZone, waiter, customer, invoiceNo, dateTime, showPrices: req.body.showPrices, showWaiter: req.body.showWaiter, showCustomer: req.body.showCustomer, showDateTime: req.body.showDateTime, paperWidth: req.body.paperWidth, isAddonKot: req.body.isAddonKot },
            slip,
            i + 1,
            slips.length,
            targetPrinter
          );

          const ok = await printSlipWindows(targetPrinter, rawBuffer);
          if (ok) {
            printedCount++;
            console.log(`✅ [Hardware Print] Slip ${i + 1}/${slips.length} printed & cut on "${targetPrinter}"`);
          }

          if (i < slips.length - 1) {
            await new Promise(r => setTimeout(r, 60));
          }
        }

        if (printedCount > 0) {
          return res.json({
            success: true,
            printedCount,
            totalSlips: slips.length,
            printerUsed: masterPrinter,
            isLocalServer: true
          });
        }
      }

      // Enqueue for cloud print agent on Linux/Cloud deployments
      enqueueCloudPrintJob('KOT', req.body);

      console.log(`☁️ [Cloud KOT Queue] Enqueued ${slips.length} KOT slips for table ${tableName}. Agent online: ${isAgentOnline}`);
      res.json({
        success: isAgentOnline,
        queued: true,
        isAgentOnline,
        totalSlips: slips.length,
        message: isAgentOnline
          ? "KOT slips queued and dispatched to active local printer agent"
          : "KOT slips queued in cloud. Run start-printer-agent.bat on cashier PC."
      });
    } catch (err: any) {
      console.error("Hardware KOT print error:", err);
      res.status(500).json({ success: false, error: err?.message || "Hardware print failed" });
    }
  });

  // Helper to connect and safely run action with ZKTeco biometric device
  async function withZKDevice<T>(ip: string, port = 4370, timeout = 5000, action: (zk: any) => Promise<T>): Promise<T> {
    const zk = new ZKLib(ip, port, timeout, 4000);
    let socketCreated = false;
    try {
      const connectPromise = zk.createSocket().catch((err: any) => {
        const msg = err?.err?.message || err?.message || 'TCP/UDP socket connection failed';
        throw new Error(msg);
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Connection to biometric device at ${ip}:${port} timed out after ${timeout}ms. Ensure device is powered on, IP is correct, and PC is on same local network.`)), timeout + 1500)
      );
      await Promise.race([connectPromise, timeoutPromise]);
      socketCreated = true;
      return await action(zk);
    } catch (err: any) {
      const msg = err?.err?.message || err?.message || 'Biometric device connection failed.';
      throw new Error(msg);
    } finally {
      if (socketCreated) {
        try {
          await zk.disconnect();
        } catch {
          // ignore disconnect error
        }
      }
    }
  }

  // REST API: Test biometric device connection via IP
  app.post("/api/biometric/test-connection", async (req, res) => {
    const { ip, port = 4370, timeout = 5000 } = req.body || {};
    if (!ip) {
      return res.status(400).json({ success: false, message: "Device IP address is required." });
    }

    try {
      const info = await withZKDevice(ip, Number(port) || 4370, Number(timeout) || 5000, async (zk) => {
        try {
          return await zk.getInfo();
        } catch {
          return { status: "connected" };
        }
      });

      res.json({
        success: true,
        message: `Successfully connected to biometric machine at ${ip}:${port}`,
        info
      });
    } catch (err: any) {
      console.error("Biometric device test failed:", err?.message || err);
      res.status(500).json({
        success: false,
        message: err?.message || "Failed to reach device. Check IP and network connection."
      });
    }
  });

  // REST API: Fetch attendance logs directly from device database via IP
  app.post("/api/biometric/fetch-logs", async (req, res) => {
    const { ip, port = 4370, timeout = 10000, date } = req.body || {};
    if (!ip) {
      return res.status(400).json({ success: false, message: "Device IP address is required." });
    }

    try {
      const logs = await withZKDevice(ip, Number(port) || 4370, Number(timeout) || 10000, async (zk) => {
        const attData = await zk.getAttendances();
        return Array.isArray(attData?.data) ? attData.data : (Array.isArray(attData) ? attData : []);
      });

      const formatted = (logs || []).map((log: any) => {
        const d = log.recordTime ? new Date(log.recordTime) : new Date();
        const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
        const hours = !isNaN(d.getTime()) ? d.getHours().toString().padStart(2, "0") : "00";
        const mins = !isNaN(d.getTime()) ? d.getMinutes().toString().padStart(2, "0") : "00";
        const timeStr = `${hours}:${mins}`;

        return {
          deviceUserId: String(log.deviceUserId || log.userSn || "").trim(),
          userSn: log.userSn,
          recordTime: log.recordTime,
          date: dateStr,
          time: timeStr
        };
      }).filter((l: any) => l.deviceUserId && (!date || l.date === date));

      res.json({
        success: true,
        count: formatted.length,
        totalDeviceLogs: (logs || []).length,
        logs: formatted
      });
    } catch (err: any) {
      console.error("Biometric device log fetch failed:", err?.message || err);
      res.status(500).json({
        success: false,
        message: err?.message || "Failed to fetch attendance logs from device."
      });
    }
  });

  // REST API: Fetch registered users list from device
  app.post("/api/biometric/fetch-users", async (req, res) => {
    const { ip, port = 4370, timeout = 8000 } = req.body || {};
    if (!ip) {
      return res.status(400).json({ success: false, message: "Device IP address is required." });
    }

    try {
      const usersData = await withZKDevice(ip, Number(port) || 4370, Number(timeout) || 8000, async (zk) => {
        const res = await zk.getUsers();
        return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      });

      res.json({
        success: true,
        count: usersData.length,
        users: usersData
      });
    } catch (err: any) {
      console.error("Biometric device users fetch failed:", err?.message || err);
      res.status(500).json({
        success: false,
        message: err?.message || "Failed to fetch registered users from device."
      });
    }
  });

  // Restaurant Logo Endpoint (Caches the image separately so state stays small <80KB)
  app.get("/api/restaurant/logo", (req, res) => {
    if (savedLogoBuffer) {
      res.setHeader("Content-Type", savedLogoMime || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.send(savedLogoBuffer);
    }
    const distLogo = path.join(process.cwd(), "dist", "restaurant-logo.png");
    if (fs.existsSync(distLogo)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.sendFile(distLogo);
    }
    const pubLogo = path.join(process.cwd(), "public", "restaurant-logo.png");
    if (fs.existsSync(pubLogo)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.sendFile(pubLogo);
    }
    res.status(404).end();
  });

  // Active SSE connections for instant real-time push to all devices
  const sseClients = new Set<express.Response>();

  function broadcastRealtimeState(payload: any) {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(dataString);
        (client as any).flush?.();
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Real-time Event Stream (SSE) for zero-lag instant cross-device synchronization (<15ms)
  app.get("/api/restaurant/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("X-LiteSpeed-Cache-Control", "no-cache");
    res.flushHeaders?.();

    // Send immediate compact initial packet (only tables & timestamp, NOT full 1MB)
    const isOnKotMode = cachedState?.restaurantProfile?.tableHoldSyncMode === 'on_kot';
    res.write(`data: ${JSON.stringify({ 
      type: 'CONNECTED', 
      timestamp: lastServerUpdate, 
      tables: sanitizeTables(cachedState?.tables || [], cachedState?.sales || [], isOnKotMode)
    })}\n\n`);
    (res as any).flush?.();

    sseClients.add(res);

    const pingInterval = setInterval(() => {
      try {
        res.write(": ping\n\n");
        (res as any).flush?.();
      } catch {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    }, 10000);

    req.on("close", () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
  });

  app.post("/api/restaurant/pos-sync", async (req, res) => {
    try {
      const { tables, newSale, action = 'TABLES_UPDATE', serialConfig, sender, modifiedTableId } = req.body;
      const now = Date.now();

      if (serialConfig && typeof serialConfig === 'object' && cachedState) {
        cachedState.serialConfig = {
          ...(cachedState.serialConfig || {}),
          ...serialConfig
        };
      }

      if (Array.isArray(tables) && cachedState) {
        if (newSale && newSale.invoiceNo) {
          if (!Array.isArray(cachedState.sales)) cachedState.sales = [];
          const exists = cachedState.sales.some((s: any) => s.invoiceNo === newSale.invoiceNo || (s.id && newSale.id && s.id === newSale.id));
          if (!exists) {
            cachedState.sales.push(newSale);
          }
        }
        cachedState.tables = mergeTablesSafely(cachedState.tables || [], tables, cachedState.sales || [], action, modifiedTableId);

        lastServerUpdate = now;
        lastMongoSyncCheck = now;

        const isOnKotMode = cachedState?.restaurantProfile?.tableHoldSyncMode === 'on_kot';
        // Broadcast to all connected terminals instantly via SSE (<10ms)
        broadcastRealtimeState({
          type: 'POS_TABLES_UPDATE',
          action,
          sender: sender || null,
          timestamp: now,
          tables: sanitizeTables(cachedState.tables, cachedState.sales || [], isOnKotMode),
          newSale: newSale || null,
          serialConfig: cachedState.serialConfig
        });

        // Persist to MongoDB asynchronously in background
        if (isDbConnected()) {
          RestaurantStateModel.findOneAndUpdate(
            { stateKey: STATE_KEY },
            { stateKey: STATE_KEY, data: cachedState, timestamp: lastServerUpdate },
            { upsert: true }
          ).catch((err: any) => console.error("Mongo background sync error:", err));
        }

        // File backup asynchronously in background
        fs.writeFile(STATE_FILE, JSON.stringify({ data: cachedState, timestamp: lastServerUpdate }), () => {});
      }

      res.setHeader("X-LiteSpeed-Cache-Control", "no-cache");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json({ success: true, timestamp: lastServerUpdate });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // High-Frequency Lightweight Heartbeat Polling (<40 bytes, <2ms)
  app.get("/api/restaurant/pulse", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-LiteSpeed-Cache-Control", "no-cache");

    const since = Number(req.query.since) || 0;
    if (since >= lastServerUpdate) {
      return res.json({ changed: false, timestamp: lastServerUpdate });
    }

    const isOnKotMode = cachedState?.restaurantProfile?.tableHoldSyncMode === 'on_kot';
    return res.json({
      changed: true,
      timestamp: lastServerUpdate,
      fullUpdateTimestamp: lastFullStateUpdate,
      tables: sanitizeTables(cachedState?.tables || [], cachedState?.sales || [], isOnKotMode),
      salesCount: cachedState?.sales?.length || 0,
      serialConfig: cachedState?.serialConfig
    });
  });

  // REST API endpoints for full POS state synchronization
  let lastMongoSyncCheck = 0;

  app.get("/api/restaurant/state", async (req, res) => {
    try {
      const now = Date.now();
      if (!cachedState || (now - lastMongoSyncCheck > 1000)) {
        if (!isDbConnected()) {
          await connectToDatabase();
        }
        if (isDbConnected()) {
          const doc = await RestaurantStateModel.findOne({ stateKey: STATE_KEY }).lean() as any;
          if (doc && doc.data) {
            if (!cachedState || (doc.timestamp && doc.timestamp > lastServerUpdate)) {
              cachedState = doc.data;
              lastServerUpdate = doc.timestamp || now;
              isLoadedFromMongo = true;
              normalizeLogo(cachedState);
              if (cachedState && cachedState.tables) {
                cachedState.tables = sanitizeTables(cachedState.tables, cachedState.sales);
              }
            }
          }
        }
        lastMongoSyncCheck = now;
      }

      res.setHeader("X-LiteSpeed-Cache-Control", "no-cache");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json({
        success: true,
        data: cachedState,
        timestamp: lastServerUpdate,
        isLoadedFromMongo,
        storage: isDbConnected() ? "mongodb" : "json_file"
      });
    } catch (err: any) {
      res.json({
        success: true,
        data: cachedState,
        timestamp: lastServerUpdate,
        isLoadedFromMongo: false,
        storage: "fallback_cache"
      });
    }
  });

  app.post("/api/restaurant/state", async (req, res) => {
    try {
      const { data: clientData, sender } = req.body;

      if (!isDbConnected()) {
        await connectToDatabase();
      }

      if (clientData) {
        normalizeLogo(clientData);

        // 1. Merge sales safely so no sales can ever be lost or overwritten by an older client
        const serverSales = Array.isArray(cachedState?.sales) ? cachedState.sales : [];
        const clientSales = Array.isArray(clientData?.sales) ? clientData.sales : [];
        const salesMap = new Map();
        serverSales.forEach((s: any) => {
          const key = s.invoiceNo || String(s.id);
          salesMap.set(key, s);
        });
        clientSales.forEach((s: any) => {
          const key = s.invoiceNo || String(s.id);
          if (!salesMap.has(key)) {
            salesMap.set(key, s);
          }
        });
        const mergedSales = Array.from(salesMap.values());

        // 2. Merge tables safely: if table structure (count or IDs) was changed in config, use TABLES_CONFIG_UPDATE
        const serverIds = (cachedState?.tables || []).map((t: any) => t.id).join(',');
        const clientIds = (clientData.tables || []).map((t: any) => t.id).join(',');
        const isTableStructureChanged = serverIds !== clientIds;

        const mergedTables = mergeTablesSafely(
          cachedState?.tables || [], 
          clientData.tables || [], 
          mergedSales,
          isTableStructureChanged ? 'TABLES_CONFIG_UPDATE' : 'TABLES_UPDATE'
        );

        cachedState = {
          ...cachedState,
          ...clientData,
          sales: mergedSales,
          tables: mergedTables
        };

        lastServerUpdate = Date.now();
        lastFullStateUpdate = lastServerUpdate;
        lastMongoSyncCheck = lastServerUpdate;

        // Persist to MongoDB asynchronously in background without blocking HTTP response
        if (isDbConnected()) {
          RestaurantStateModel.findOneAndUpdate(
            { stateKey: STATE_KEY },
            { stateKey: STATE_KEY, data: cachedState, timestamp: lastServerUpdate },
            { upsert: true, returnDocument: 'after' }
          ).then(() => {
            isLoadedFromMongo = true;
          }).catch((err: any) => {
            console.error("MongoDB async update error:", err);
          });
        }

        // Always write file backup to disk asynchronously
        fs.writeFile(STATE_FILE, JSON.stringify({ data: cachedState, timestamp: lastServerUpdate }, null, 2), (err) => {
          if (err) console.error("Error writing restaurant state file:", err);
        });

        const isOnKotMode = cachedState?.restaurantProfile?.tableHoldSyncMode === 'on_kot';
        const broadcastState = isOnKotMode ? {
          ...cachedState,
          tables: sanitizeTables(cachedState.tables || [], cachedState.sales || [], true)
        } : cachedState;

        // Broadcast to all other terminals instantly via SSE stream
        broadcastRealtimeState({
          type: 'FULL_STATE_UPDATED',
          sender: sender || null,
          timestamp: lastServerUpdate,
          data: broadcastState
        });
      }

      res.setHeader("X-LiteSpeed-Cache-Control", "no-cache");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json({
        success: true,
        timestamp: lastServerUpdate,
        data: cachedState,
        isLoadedFromMongo,
        storage: isDbConnected() ? "mongodb" : "json_file"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to sync server state" });
    }
  });

  // AI Recipe & Menu Costing Assistant (Suggests raw ingredients, portions, cost estimation & pricing)
  app.post("/api/ai/recipe-advisor", async (req, res) => {
    try {
      const { dishName, department, category, targetSellingPrice, existingRawItems, language } = req.body;
      const client = getAIClient();

      if (!client) {
        // High quality fallback
        const fallback = {
          suggestedPrice: targetSellingPrice || 450,
          estimatedCost: 160,
          profitMarginPercent: 64.4,
          chefTips: "Use high-heat searing for locking in moisture, marinate for minimum 2 hours.",
          suggestedIngredients: [
            { rawName: "Chicken Boneless", qty: 0.35, uom: "Kg", estimatedRate: 320, cost: 112 },
            { rawName: "Soybean Oil", qty: 0.05, uom: "Ltr", estimatedRate: 190, cost: 9.5 },
            { rawName: "Special BBQ Sauce", qty: 0.08, uom: "Kg", estimatedRate: 450, cost: 36 }
          ]
        };
        return res.json({ success: true, data: fallback, source: "template" });
      }

      const prompt = `You are an executive restaurant chef and F&B food cost controller for 'Eatery Rooftop Lounge'.
Analyze this dish concept and generate a precise Bill of Materials (BOM) recipe with raw material quantities and costing advice in JSON.
Dish Name: ${dishName}
Department: ${department || "Main Kitchen"}
Category: ${category || "Main Course"}
Target Selling Price (BDT): ${targetSellingPrice || "Not specified"}
Existing Available Raw Materials in Inventory: ${JSON.stringify(existingRawItems || [])}
Language: English

Return ONLY a JSON object with this schema:
{
  "suggestedPrice": number,
  "estimatedCost": number,
  "profitMarginPercent": number,
  "chefTips": "string with cooking tips and portion control advice",
  "suggestedIngredients": [
    {
      "rawName": "string name of ingredient",
      "qty": number,
      "uom": "Kg / Ltr / Pcs / Gm / Ml",
      "estimatedRate": number,
      "cost": number
    }
  ]
}`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Empty AI response");
      const parsed = JSON.parse(responseText);
      return res.json({ success: true, data: parsed, source: "gemini" });
    } catch (err: any) {
      console.error("Recipe AI error:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to analyze recipe" });
    }
  });

  // AI Product Listing Generator
  app.post("/api/ai/generate-product-content", async (req, res) => {
    try {
      const { title, category, keywords, price, targetAudience, language } = req.body;
      const client = getAIClient();

      if (!client) {
        // High quality fallback template generator if key is not present
        const generated = {
          title: title || "Premium Quality Product",
          shortDescription: `Crafted with premium materials, ${title || "this product"} combines elegance, durability, and top-tier functionality for an elevated experience.`,
          fullDescription: `Discover the perfect blend of quality and modern craftsmanship with the ${title || "all-new collection"}. Engineered to deliver outstanding performance and aesthetic appeal, this item exceeds expectations for daily use or thoughtful gifting.\n\nKey Highlights:\n• High-grade durable build with meticulous finishing\n• Contemporary ergonomic design suitable for versatile use\n• Rigorously inspected for optimal satisfaction\n• Fast and secure doorstep delivery`,
          features: [
            "Premium grade materials & sleek finish",
            "Highly durable & easy maintenance",
            "Cash on delivery & fast reliable shipping",
            "100% satisfaction and quality assurance"
          ],
          suggestedTags: [category, "BestSeller", "Trending", "SpecialOffer", "NewArrival"].filter(Boolean),
          seoKeywords: `${title}, ${category}, buy ${title} online, best price ${title}`
        };
        return res.json({ success: true, data: generated, source: "template" });
      }

      const prompt = `You are an expert e-commerce copywriter. Generate compelling, high-converting product marketing content in JSON format for an online store.
Product details:
- Product Title/Concept: ${title}
- Category: ${category || "General"}
- Key Features / Notes: ${keywords || "High quality, durable"}
- Price: ${price || "Competitive"}
- Target Audience: ${targetAudience || "Modern shoppers"}
- Language: English

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "A catchy, polished product title",
  "shortDescription": "A concise 1-2 sentence hook for product cards",
  "fullDescription": "A detailed 2-3 paragraph product description with key selling points",
  "features": ["Bullet point 1", "Bullet point 2", "Bullet point 3", "Bullet point 4"],
  "suggestedTags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "seoKeywords": "comma separated SEO search keywords"
}`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from AI model");
      }

      const parsed = JSON.parse(responseText);
      return res.json({ success: true, data: parsed, source: "gemini" });
    } catch (error: any) {
      console.error("AI Generation error:", error);
      res.status(500).json({ 
        success: false, 
        error: error?.message || "Failed to generate AI product content" 
      });
    }
  });

  // Auto-detect production mode (bundled dist/server.cjs) vs development mode (server.ts)
  const isProduction = process.env.NODE_ENV === "production" || 
    (!process.argv.some(arg => arg.includes("server.ts")) && fs.existsSync(path.join(process.cwd(), "dist", "index.html")));

  // Vite middleware in dev or static files in prod
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/restaurant_data.json', '**/.env*'],
          usePolling: true,
          interval: 500
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (typeof PORT === "string" && isNaN(Number(PORT))) {
    app.listen(PORT, () => {
      console.log(`E-Commerce Platform Server running on socket ${PORT}`);
    });
  } else {
    app.listen(Number(PORT) || 3000, "0.0.0.0", () => {
      console.log(`E-Commerce Platform Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
