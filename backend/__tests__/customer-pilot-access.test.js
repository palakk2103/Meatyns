import { afterEach, describe, expect, it } from "@jest/globals";

const pilot = await import("../app/utils/customerPilotAccess.js");

const ORIGINAL = {
  mode: process.env.CUSTOMER_PILOT_MODE,
  phones: process.env.CUSTOMER_PILOT_PHONES,
};

afterEach(() => {
  if (ORIGINAL.mode === undefined) delete process.env.CUSTOMER_PILOT_MODE;
  else process.env.CUSTOMER_PILOT_MODE = ORIGINAL.mode;
  if (ORIGINAL.phones === undefined) delete process.env.CUSTOMER_PILOT_PHONES;
  else process.env.CUSTOMER_PILOT_PHONES = ORIGINAL.phones;
});

describe("customer pilot access", () => {
  it("is off under NODE_ENV=test unless explicitly enabled", () => {
    delete process.env.CUSTOMER_PILOT_MODE;
    expect(pilot.isCustomerPilotModeOn()).toBe(false);
    expect(pilot.isPilotAllowedPhone("9000000001")).toBe(true);
  });

  it("allows only listed numbers when on, in any phone format", () => {
    process.env.CUSTOMER_PILOT_MODE = "on";
    process.env.CUSTOMER_PILOT_PHONES = "9000000001";
    expect(pilot.isPilotAllowedPhone("8770620342")).toBe(true);
    expect(pilot.isPilotAllowedPhone("+918770620342")).toBe(true);
    expect(pilot.isPilotAllowedPhone("+91 90000 00001")).toBe(true);
    expect(pilot.isPilotAllowedPhone("9000000002")).toBe(false);
    expect(pilot.isPilotAllowedPhone("")).toBe(false);
  });

  it("throws a 403 with the pilot code for blocked numbers", () => {
    process.env.CUSTOMER_PILOT_MODE = "on";
    expect(() => pilot.assertPilotAllowedPhone("9000000002")).toThrow(
      expect.objectContaining({ statusCode: 403, code: pilot.PILOT_ACCESS_CODE }),
    );
  });

  it("blocks unknown accounts but lets non-customers through when asked", async () => {
    process.env.CUSTOMER_PILOT_MODE = "on";
    await expect(pilot.assertPilotAllowedCustomer(null)).rejects.toMatchObject({ statusCode: 403 });
    await expect(pilot.assertPilotAllowedCustomer({ phone: "+919000000002" })).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(pilot.assertPilotAllowedCustomer({ phone: "+918770620342" })).resolves.toBeUndefined();
  });

  it("CUSTOMER_PILOT_MODE=off opens the app to everyone", () => {
    process.env.CUSTOMER_PILOT_MODE = "off";
    expect(pilot.isPilotAllowedPhone("9000000002")).toBe(true);
  });
});
