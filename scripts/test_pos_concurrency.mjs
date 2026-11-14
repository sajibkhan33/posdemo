// Concurrency & Multi-Device / Multi-Role Test Suite for POS
// Simulates concurrent actions from multiple devices, browsers, tabs, and roles

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('========================================================================');
  console.log('🚀 STARTING POS MULTI-DEVICE / MULTI-BROWSER / MULTI-ROLE CONCURRENCY TESTS');
  console.log('========================================================================\n');

  // Helper to fetch server state
  async function getState() {
    const res = await fetch(`${BASE_URL}/api/restaurant/state`);
    const json = await res.json();
    return json.data;
  }

  // Helper to push POS tables
  async function pushPosSync(payload) {
    const res = await fetch(`${BASE_URL}/api/restaurant/pos-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  const state = await getState();
  console.log(`Initial status: ${state.tables.length} tables, ${state.sales.length} sales in DB\n`);

  let passed = 0;
  let failed = 0;

  function report(name, isPass, detail) {
    if (isPass) {
      passed++;
      console.log(`✅ [PASS] ${name}`);
    } else {
      failed++;
      console.log(`❌ [FAIL] ${name}`);
    }
    if (detail) console.log(`   👉 ${detail}\n`);
  }

  const sampleItem = state.menuItems?.[0] || { id: 9999, name: 'Burger', price: 150 };

  // =========================================================================
  // TEST 1: Simultaneous Submit KOT & Print Bill on Same Table
  // Device 1 (Waiter): Submit KOT
  // Device 2 (Cashier): Print Bill
  // Triggered at the EXACT SAME MILLISECOND via Promise.all
  // =========================================================================
  console.log('--- TEST 1: Simultaneous Submit KOT (Waiter) & Print Bill (Cashier) ---');
  try {
    const testTableId = 'T-01';
    const now = Date.now();
    const orderRef = `ORD-T1-${now}`;

    // Base table with items
    const tableWithItems = {
      ...state.tables.find(t => t.id === testTableId),
      status: 'hold',
      waiter: 'Floor Waiter (Rahim)',
      customer: 'Walk-in Customer',
      orderRef,
      cart: [
        {
          id: sampleItem.id,
          cartItemId: `item-1-${now}`,
          name: sampleItem.name,
          price: sampleItem.price,
          qty: 2,
          department: sampleItem.department || 'Kitchen',
          kotPrinted: false,
          kotPrintedQty: 0
        }
      ]
    };

    // Client 1 (Waiter Device / Mobile): Submit KOT
    const client1Tables = state.tables.map(t => {
      if (t.id !== testTableId) return t;
      return {
        ...tableWithItems,
        kotCount: 1,
        cart: tableWithItems.cart.map(i => ({ ...i, kotPrinted: true, kotPrintedQty: i.qty }))
      };
    });

    // Client 2 (Cashier Desktop): Print Bill
    const client2Tables = state.tables.map(t => {
      if (t.id !== testTableId) return t;
      return {
        ...tableWithItems,
        status: 'billed',
        billCount: 1,
        linkedInvoiceNo: `POS-TEST-${now}`
      };
    });

    // Fire concurrently
    const [res1, res2] = await Promise.all([
      pushPosSync({
        action: 'KOT_SUBMIT',
        sender: 'device-waiter-mobile-01',
        tables: client1Tables,
        modifiedTableId: testTableId
      }),
      pushPosSync({
        action: 'BILL_PRINT',
        sender: 'device-cashier-desktop-01',
        tables: client2Tables,
        modifiedTableId: testTableId
      })
    ]);

    // Check resulting server state
    const postState = await getState();
    const resultTable = postState.tables.find(t => t.id === testTableId);

    const isBilledOrHeld = resultTable.status === 'billed' || resultTable.status === 'hold';
    const hasItems = resultTable.cart && resultTable.cart.length > 0;
    const isSuccess = res1.success && res2.success && isBilledOrHeld && hasItems;

    report(
      'Simultaneous KOT Submit & Bill Print (Same Table, Two Devices)',
      isSuccess,
      `Table Final Status: '${resultTable.status}', Items: ${resultTable.cart.length}, KOT Printed: ${resultTable.cart[0]?.kotPrinted}, Linked Invoice: ${resultTable.linkedInvoiceNo || 'N/A'}`
    );
  } catch (err) {
    report('Simultaneous KOT Submit & Bill Print', false, err.message);
  }

  // =========================================================================
  // TEST 2: Simultaneous Bill Print (Cashier) & Settle & Pay (Admin)
  // Device 2 (Cashier Browser): Print Bill
  // Device 3 (Admin Browser): Settle & Pay
  // =========================================================================
  console.log('--- TEST 2: Simultaneous Bill Print & Settle & Pay on Same Table ---');
  try {
    const testTableId = 'T-01';
    const now = Date.now();
    const invoiceNo = `POS-INV-CONCUR-${now}`;

    // Table billed
    const currentTable = (await getState()).tables.find(t => t.id === testTableId);
    
    // Cashier sends BILL_PRINT
    const cashierTables = (await getState()).tables.map(t => t.id === testTableId ? { ...t, status: 'billed', billCount: 2 } : t);

    // Admin sends TABLE_SETTLE with SaleRecord
    const adminTables = (await getState()).tables.map(t => t.id === testTableId ? {
      ...t,
      status: 'free',
      cart: [],
      waiter: '',
      customer: 'Walk-in Customer'
    } : t);

    const saleRecord = {
      id: now,
      date: new Date().toISOString().split('T')[0],
      invoiceNo,
      orderRef: currentTable.orderRef || `ORD-${now}`,
      details: `${currentTable.name}: ${sampleItem.name} (2)`,
      items: currentTable.cart || [],
      cash: 100,
      card: 0,
      bkash: 0,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 100,
      sessionId: 'SES-TEST-CONCUR',
      createdAt: now
    };

    const [resCashier, resAdmin] = await Promise.all([
      pushPosSync({
        action: 'BILL_PRINT',
        sender: 'browser-cashier-tab-1',
        tables: cashierTables,
        modifiedTableId: testTableId
      }),
      pushPosSync({
        action: 'TABLE_SETTLE',
        sender: 'browser-admin-window-2',
        tables: adminTables,
        newSale: saleRecord,
        modifiedTableId: testTableId
      })
    ]);

    const postState = await getState();
    const finalTable = postState.tables.find(t => t.id === testTableId);
    const saleExists = postState.sales.some(s => s.invoiceNo === invoiceNo);

    // After settle, the table should safely be free and sale recorded
    const isPass = resCashier.success && resAdmin.success && finalTable.status === 'free' && saleExists;

    report(
      'Simultaneous Bill Print & Settle & Pay (Cashier vs Admin)',
      isPass,
      `Table Status: '${finalTable.status}', Cart Length: ${finalTable.cart.length}, Sale Recorded in DB: ${saleExists}`
    );
  } catch (err) {
    report('Simultaneous Bill Print & Settle & Pay', false, err.message);
  }

  // =========================================================================
  // TEST 3: Stale Pulse / Delayed Request Protection (Zombie Table Resurrection Prevention)
  // Network lag scenario: Table was already settled and is 'free'.
  // Device 1's delayed packet (with old cart and old orderRef) arrives after settle!
  // =========================================================================
  console.log('--- TEST 3: Stale Delayed Packet after Settle (Resurrection Prevention) ---');
  try {
    const testTableId = 'T-01';
    const currentState = await getState();
    const table = currentState.tables.find(t => t.id === testTableId);

    // Stale payload with older timestamp and old cart
    const staleTables = currentState.tables.map(t => {
      if (t.id !== testTableId) return t;
      return {
        ...t,
        status: 'hold',
        orderCreatedAt: (table.settledAt || Date.now()) - 5000,
        orderRef: table.lastSettledOrderRef || 'ORD-OLD',
        cart: [{ id: 999, name: 'Ghost Burger', qty: 5, price: 100 }]
      };
    });

    const staleRes = await pushPosSync({
      action: 'TABLES_UPDATE',
      sender: 'delayed-lagged-device',
      tables: staleTables,
      modifiedTableId: testTableId
    });

    const checkState = await getState();
    const protectedTable = checkState.tables.find(t => t.id === testTableId);

    // Table MUST remain 'free' and not resurrected!
    const isProtected = protectedTable.status === 'free' && (!protectedTable.cart || protectedTable.cart.length === 0);

    report(
      'Stale Packet Protection (Zombie Resurrection Prevention)',
      isProtected,
      `Table Status: '${protectedTable.status}', Cart items: ${protectedTable.cart?.length || 0} (Stale order rejected: ${isProtected})`
    );
  } catch (err) {
    report('Stale Packet Protection', false, err.message);
  }

  // =========================================================================
  // TEST 4: Multi-Device High-Concurrency Across 5 Different Tables Simultaneously
  // Device 1: Waiter 1 -> Submit KOT Table T-02
  // Device 2: Waiter 2 -> Submit KOT Table T-03
  // Device 3: Cashier 1 -> Print Bill Table T-04
  // Device 4: Cashier 2 -> Settle Table T-05
  // Device 5: Admin -> Hold order Table T-06
  // All 5 fired concurrently at the EXACT same timestamp!
  // =========================================================================
  console.log('--- TEST 4: 5 Concurrent Terminals Acting on 5 Tables Simultaneously ---');
  try {
    const s = await getState();
    const now = Date.now();

    const saleT5 = {
      id: now + 50,
      date: new Date().toISOString().split('T')[0],
      invoiceNo: `POS-INV-MULTI-T5-${now}`,
      orderRef: `ORD-T5-${now}`,
      details: 'T 5: Concurrency Settle',
      items: [{ id: sampleItem.id, name: sampleItem.name, price: 200, qty: 1 }],
      cash: 200,
      card: 0,
      bkash: 0,
      nagad: 0,
      dueGiven: 0,
      dueCollected: 0,
      change: 0,
      total: 200,
      sessionId: 'SES-MULTI',
      createdAt: now
    };

    const promise1 = pushPosSync({
      action: 'KOT_SUBMIT',
      sender: 'device-waiter-1',
      modifiedTableId: 'T-02',
      tables: s.tables.map(t => t.id === 'T-02' ? {
        ...t,
        status: 'hold',
        waiter: 'Rahim',
        kotCount: 1,
        cart: [{ id: sampleItem.id, name: sampleItem.name, price: 50, qty: 1, kotPrinted: true }]
      } : t)
    });

    const promise2 = pushPosSync({
      action: 'KOT_SUBMIT',
      sender: 'device-waiter-2',
      modifiedTableId: 'T-03',
      tables: s.tables.map(t => t.id === 'T-03' ? {
        ...t,
        status: 'hold',
        waiter: 'Karim',
        kotCount: 1,
        cart: [{ id: sampleItem.id, name: sampleItem.name, price: 75, qty: 2, kotPrinted: true }]
      } : t)
    });

    const promise3 = pushPosSync({
      action: 'BILL_PRINT',
      sender: 'device-cashier-1',
      modifiedTableId: 'T-04',
      tables: s.tables.map(t => t.id === 'T-04' ? {
        ...t,
        status: 'billed',
        billCount: 1,
        linkedInvoiceNo: `POS-T4-${now}`,
        cart: [{ id: sampleItem.id, name: sampleItem.name, price: 120, qty: 1 }]
      } : t)
    });

    const promise4 = pushPosSync({
      action: 'TABLE_SETTLE',
      sender: 'device-cashier-2',
      modifiedTableId: 'T-05',
      newSale: saleT5,
      tables: s.tables.map(t => t.id === 'T-05' ? {
        ...t,
        status: 'free',
        cart: []
      } : t)
    });

    const promise5 = pushPosSync({
      action: 'TABLES_UPDATE',
      sender: 'device-admin',
      modifiedTableId: 'T-06',
      tables: s.tables.map(t => t.id === 'T-06' ? {
        ...t,
        status: 'hold',
        waiter: 'Admin Assigned',
        cart: [{ id: sampleItem.id, name: sampleItem.name, price: 300, qty: 3 }]
      } : t)
    });

    const results = await Promise.all([promise1, promise2, promise3, promise4, promise5]);
    const allSuccessful = results.every(r => r.success);

    // Verify each table in post-state
    const finalState = await getState();
    const t2 = finalState.tables.find(t => t.id === 'T-02');
    const t3 = finalState.tables.find(t => t.id === 'T-03');
    const t4 = finalState.tables.find(t => t.id === 'T-04');
    const t5 = finalState.tables.find(t => t.id === 'T-05');
    const t6 = finalState.tables.find(t => t.id === 'T-06');

    const t2Ok = t2.status === 'hold' && t2.cart?.length === 1;
    const t3Ok = t3.status === 'hold' && t3.cart?.length === 1;
    const t4Ok = t4.status === 'billed' && t4.billCount === 1;
    const t5Ok = t5.status === 'free' && t5.cart?.length === 0;
    const t6Ok = t6.status === 'hold' && t6.cart?.length === 1;

    const allConsistent = t2Ok && t3Ok && t4Ok && t5Ok && t6Ok;

    report(
      '5 Simultaneous Multi-Device / Multi-Role Operations (KOT, Bill, Settle, Hold)',
      allSuccessful && allConsistent,
      `T2 (Waiter 1): ${t2.status}, T3 (Waiter 2): ${t3.status}, T4 (Cashier 1 Bill): ${t4.status}, T5 (Cashier 2 Settle): ${t5.status}, T6 (Admin): ${t6.status}`
    );

    // Clean up test tables back to free
    const cleanupTables = finalState.tables.map(t => ['T-01','T-02','T-03','T-04','T-05','T-06'].includes(t.id) ? {
      ...t,
      status: 'free',
      cart: [],
      waiter: '',
      customer: 'Walk-in Customer',
      kotCount: 0,
      billCount: 0,
      orderRef: undefined,
      linkedInvoiceNo: undefined
    } : t);

    await pushPosSync({
      action: 'TABLE_RELEASE',
      sender: 'test-cleanup',
      tables: cleanupTables
    });
    console.log('🧹 Test tables cleaned and released.\n');

  } catch (err) {
    report('5 Simultaneous Multi-Device Operations', false, err.message);
  }

  // =========================================================================
  // TEST 5: SSE (Server-Sent Events) Real-Time Broadcast Latency Check
  // =========================================================================
  console.log('--- TEST 5: Real-Time SSE Stream Latency & Broadcast Delivery ---');
  try {
    let sseReceived = false;
    let sseEventData = null;
    const controller = new AbortController();

    const ssePromise = new Promise(async (resolve) => {
      try {
        const sseRes = await fetch(`${BASE_URL}/api/restaurant/stream`, {
          signal: controller.signal
        });
        const reader = sseRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          if (chunk.includes('POS_TABLES_UPDATE')) {
            sseReceived = true;
            sseEventData = chunk;
            resolve(true);
            break;
          }
        }
      } catch (e) {
        // aborted or error
      }
    });

    // Wait 100ms for SSE connection to establish
    await new Promise(r => setTimeout(r, 200));

    // Send a trigger POS sync
    const triggerStart = Date.now();
    await pushPosSync({
      action: 'TABLES_UPDATE',
      sender: 'latency-tester',
      tables: (await getState()).tables
    });

    // Wait up to 1000ms for SSE event
    const sseTimeout = new Promise(resolve => setTimeout(() => resolve(false), 1200));
    const result = await Promise.race([ssePromise, sseTimeout]);
    controller.abort();

    report(
      'SSE Stream Broadcast Latency',
      sseReceived,
      sseReceived ? `Received POS_TABLES_UPDATE event over SSE in <${Date.now() - triggerStart}ms` : 'SSE event timed out'
    );
  } catch (err) {
    report('SSE Stream Broadcast Latency', false, err.message);
  }

  console.log('========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');
}

runTests().catch(console.error);
