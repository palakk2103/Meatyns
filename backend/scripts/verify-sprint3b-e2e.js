import dotenv from "dotenv";
dotenv.config();

const API_BASE = "http://localhost:7000/api";

async function run() {
  console.log("============================================================");
  console.log("STARTING SPRINT 3B LIVE END-TO-END VERIFICATION");
  console.log("============================================================\n");

  const results = [];
  const record = (name, passed, details = "") => {
    results.push({ name, passed, details });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
  };

  let adminToken = null;
  let testZone1Id = null;
  let testZone2Id = null;
  let testZone3Id = null;

  try {
    // 0. Admin Login
    console.log("--- 0. Authenticating as Admin ---");
    const loginRes = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ankit1@gmail.com", password: "Admin!@#123" }),
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.result?.token) {
      throw new Error(`Admin login failed: ${loginData.message}`);
    }
    adminToken = loginData.result.token;
    record("Admin Authentication", true, "Obtained valid JWT token");

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    };

    // 1. Scenario 1: Admin creates a polygon zone and persists it
    console.log("\n--- Scenario 1: Admin Creates & Persists Polygon Zone ---");
    const zone1Payload = {
      name: "VERIF_ZONE_PATNA_CENTRAL_" + Date.now(),
      description: "Verification Zone for Central Patna",
      priority: 5,
      deliveryFee: 35,
      surcharge: 5,
      expressAvailable: true,
      isActive: true,
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [85.10, 25.58],
            [85.16, 25.58],
            [85.13, 25.64],
            [85.10, 25.58],
          ],
        ],
      },
    };

    const createRes = await fetch(`${API_BASE}/admin/delivery-zones`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(zone1Payload),
    });
    const createData = await createRes.json();
    testZone1Id = createData.result?._id;
    record(
      "Admin Zone Creation (POST /api/admin/delivery-zones)",
      createData.success && !!testZone1Id,
      `Zone ID: ${testZone1Id}`
    );

    // Verify persistence via GET /api/admin/delivery-zones/:id
    const getRes = await fetch(`${API_BASE}/admin/delivery-zones/${testZone1Id}`, {
      headers: authHeaders,
    });
    const getData = await getRes.json();
    const persisted = getData.result;
    const isPersistedValid =
      persisted &&
      persisted.name === zone1Payload.name &&
      persisted.priority === 5 &&
      persisted.deliveryFee === 35 &&
      persisted.polygon?.coordinates?.[0]?.length === 4;
    record(
      "Zone Persistence Verification (GET /api/admin/delivery-zones/:id)",
      isPersistedValid,
      `Priority: ${persisted?.priority}, Fee: ${persisted?.deliveryFee}, Points: ${persisted?.polygon?.coordinates?.[0]?.length}`
    );

    // 2. Scenario 2: Inside vs Outside Coordinates
    console.log("\n--- Scenario 2: Inside vs Outside Polygon Serviceability ---");
    const insideCoords = { lat: 25.60, lng: 85.13 };
    const outsideCoords = { lat: 25.60, lng: 85.30 }; // East of zone

    // Check inside coords via check endpoint
    const checkInsideRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insideCoords),
    });
    const checkInsideData = await checkInsideRes.json();
    const isInsideValid =
      checkInsideData.result?.isServiceable === true &&
      checkInsideData.result?.zone?._id === testZone1Id;
    record(
      "Coordinates Inside Active Polygon (25.60, 85.13)",
      isInsideValid,
      `Serviceable: ${checkInsideData.result?.isServiceable}, Zone: ${checkInsideData.result?.zone?.name}`
    );

    // Check outside coords via check endpoint
    const checkOutsideRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outsideCoords),
    });
    const checkOutsideData = await checkOutsideRes.json();
    const isOutsideValid = checkOutsideData.result?.isServiceable === false;
    record(
      "Coordinates Outside Active Polygon (25.60, 85.30)",
      isOutsideValid,
      `Serviceable: ${checkOutsideData.result?.isServiceable}, Reason: "${checkOutsideData.result?.reason}"`
    );

    // Delivery slot serviceability for inside vs outside
    const slotInsideRes = await fetch(`${API_BASE}/orders/delivery/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerLocation: insideCoords,
        items: [],
      }),
    });
    const slotInsideData = await slotInsideRes.json();
    record(
      "Delivery Slot Endpoint Inside Active Zone",
      slotInsideData.result?.isServiceable === true,
      `Zone ID: ${slotInsideData.result?.matchedZone?.id}`
    );

    const slotOutsideRes = await fetch(`${API_BASE}/orders/delivery/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerLocation: outsideCoords,
        items: [],
      }),
    });
    const slotOutsideData = await slotOutsideRes.json();
    record(
      "Delivery Slot Endpoint Outside Active Zone (Disabled)",
      slotOutsideData.result?.isServiceable === false,
      `Reason: "${slotOutsideData.result?.unserviceableReason}"`
    );

    // 3. Scenario 3: Overlapping Zones & Precedence Rules
    console.log("\n--- Scenario 3: Overlapping Zones & Precedence Rules ---");
    // Create zone 2 overlapping same area with higher priority: priority 15, fee 20
    const zone2Payload = {
      name: "VERIF_ZONE_OVERLAP_HIGH_PRIORITY_" + Date.now(),
      priority: 15,
      deliveryFee: 20,
      isActive: true,
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [85.10, 25.58],
            [85.16, 25.58],
            [85.13, 25.64],
            [85.10, 25.58],
          ],
        ],
      },
    };
    const createZone2Res = await fetch(`${API_BASE}/admin/delivery-zones`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(zone2Payload),
    });
    const createZone2Data = await createZone2Res.json();
    testZone2Id = createZone2Data.result?._id;

    // Check precedence: Zone 2 has priority 15 > Zone 1 priority 5
    const overlapCheckRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insideCoords),
    });
    const overlapCheckData = await overlapCheckRes.json();
    const isPriorityRespected = overlapCheckData.result?.zone?._id === testZone2Id;
    record(
      "Overlapping Zones Priority Precedence (P15 vs P5)",
      isPriorityRespected,
      `Selected Zone: ${overlapCheckData.result?.zone?.name} (Priority ${overlapCheckData.result?.zone?.priority})`
    );

    // Create zone 3 with equal priority (15) but lower delivery fee (15 vs 20)
    const zone3Payload = {
      name: "VERIF_ZONE_OVERLAP_TIE_BREAKER_" + Date.now(),
      priority: 15,
      deliveryFee: 15, // lower than 20
      isActive: true,
      polygon: {
        type: "Polygon",
        coordinates: [
          [
            [85.10, 25.58],
            [85.16, 25.58],
            [85.13, 25.64],
            [85.10, 25.58],
          ],
        ],
      },
    };
    const createZone3Res = await fetch(`${API_BASE}/admin/delivery-zones`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(zone3Payload),
    });
    const createZone3Data = await createZone3Res.json();
    testZone3Id = createZone3Data.result?._id;

    const tieBreakCheckRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insideCoords),
    });
    const tieBreakCheckData = await tieBreakCheckRes.json();
    const isTieBreakerRespected = tieBreakCheckData.result?.zone?._id === testZone3Id;
    record(
      "Overlapping Zones Tie-Breaker (Lowest Fee ₹15 vs ₹20)",
      isTieBreakerRespected,
      `Selected Zone: ${tieBreakCheckData.result?.zone?.name} (Fee: ₹${tieBreakCheckData.result?.zone?.deliveryFee})`
    );

    // 4. Scenario 4: Inactive Zones & Fallback
    console.log("\n--- Scenario 4: Inactive Zones & Zero-Active Fallback ---");
    // Deactivate Zone 3
    await fetch(`${API_BASE}/admin/delivery-zones/${testZone3Id}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });
    // Now Zone 2 (active, priority 15) should be selected
    const inactiveZoneCheckRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insideCoords),
    });
    const inactiveZoneCheckData = await inactiveZoneCheckRes.json();
    record(
      "Inactive Zone Ignored (Falls back to next active zone)",
      inactiveZoneCheckData.result?.zone?._id === testZone2Id,
      `Selected Zone: ${inactiveZoneCheckData.result?.zone?.name}`
    );

    // Deactivate Zone 2 and Zone 1 as well
    await fetch(`${API_BASE}/admin/delivery-zones/${testZone2Id}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });
    await fetch(`${API_BASE}/admin/delivery-zones/${testZone1Id}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });

    // With 0 active zones, fallbackToRadius should be true
    const fallbackCheckRes = await fetch(`${API_BASE}/delivery-zones/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insideCoords),
    });
    const fallbackCheckData = await fallbackCheckRes.json();
    record(
      "Zero Active Zones Fallback to Store Radius",
      fallbackCheckData.result?.fallbackToRadius === true && fallbackCheckData.result?.isServiceable === true,
      `fallbackToRadius: ${fallbackCheckData.result?.fallbackToRadius}`
    );

    // Reactivate Zone 1 for Scenario 5 checkout test
    await fetch(`${API_BASE}/admin/delivery-zones/${testZone1Id}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ isActive: true }),
    });

    // 5. Scenario 5: Server-side Checkout Validation Block
    console.log("\n--- Scenario 5: Checkout Blocks Unserviceable Address ---");
    // Attempt checkout preview with address outside active zone
    const unserviceablePreviewRes = await fetch(`${API_BASE}/orders/checkout/preview`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ product: "6abcd49385e22d15ef2b3e6b", quantity: 1 }],
        address: {
          address: "Outside Zone Area, Bihar",
          location: outsideCoords,
        },
      }),
    });
    const unserviceablePreviewData = await unserviceablePreviewRes.json();
    const isBlockedByServer =
      unserviceablePreviewRes.status === 400 &&
      unserviceablePreviewData.message?.includes("outside our serviceable delivery zones");
    record(
      "Server-Side Checkout Blocks Unserviceable Address",
      isBlockedByServer,
      `HTTP Status: ${unserviceablePreviewRes.status}, Message: "${unserviceablePreviewData.message}"`
    );

  } catch (err) {
    console.error("FATAL VERIFICATION ERROR:", err);
    record("Script Execution", false, err.message);
  } finally {
    // Cleanup created test delivery zones
    console.log("\n--- Cleanup Test Delivery Zones ---");
    if (adminToken) {
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      };
      for (const id of [testZone1Id, testZone2Id, testZone3Id]) {
        if (id) {
          try {
            await fetch(`${API_BASE}/admin/delivery-zones/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            });
            console.log(`Cleaned up test zone ${id}`);
          } catch {
            // ignore cleanup error
          }
        }
      }
    }
  }

  console.log("\n============================================================");
  console.log("VERIFICATION EXECUTION SUMMARY");
  console.log("============================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Total Scenarios Checked: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
