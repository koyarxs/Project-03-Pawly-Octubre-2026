import { randomUUID } from "node:crypto";
import {
  canBook,
  civil,
  daySlots,
  defaultBookingPolicy,
  validateBookingPolicy,
  type BookingPolicy,
} from "./booking-policy";
describe("Booking availability domain", () => {
  const professionalId = randomUUID();
  const hours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    opens: "09:00",
    closes: "18:00",
  }));
  const policy = (): BookingPolicy => ({
    ...defaultBookingPolicy,
    publicEnabled: true,
    hours,
    professionals: [{ membershipId: professionalId, hours }],
    blocks: [],
  });
  const input = () => ({
    professionalId,
    timezone: "America/Santiago",
    startsAt: new Date("2026-10-26T12:00:00Z"),
    now: new Date("2026-10-25T12:00:00Z"),
    policy: policy(),
    service: {
      durationMinutes: 30,
      bufferMinutes: 15,
      resourceKey: "consulta-1",
    },
    occupied: [],
  });
  it("starts closed with no fake working hours or professionals", () => {
    expect(defaultBookingPolicy.publicEnabled).toBe(false);
    expect(defaultBookingPolicy.hours).toEqual([]);
    expect(defaultBookingPolicy.professionals).toEqual([]);
  });
  it("requires overlapping clinic and professional working hours", () => {
    expect(canBook(input())).toBe(true);
    expect(
      canBook({ ...input(), startsAt: new Date("2026-10-26T11:00:00Z") }),
    ).toBe(false);
    expect(canBook({ ...input(), professionalId: randomUUID() })).toBe(false);
    const p = policy();
    p.hours = [];
    expect(canBook({ ...input(), policy: p })).toBe(false);
  });
  it("enforces preparation time, notice and maximum advance", () => {
    expect(
      canBook({ ...input(), startsAt: new Date("2026-10-26T20:30:00Z") }),
    ).toBe(false);
    expect(canBook({ ...input(), now: new Date("2026-10-26T11:30:00Z") })).toBe(
      false,
    );
    expect(canBook({ ...input(), now: new Date("2026-01-01T00:00:00Z") })).toBe(
      false,
    );
  });
  it.each(["BLOCK", "HOLIDAY", "VACATION", "ABSENCE"] as const)(
    "rejects %s exceptions",
    (kind) => {
      const p = policy();
      p.blocks = [
        {
          id: randomUUID(),
          professionalId: kind === "HOLIDAY" ? null : professionalId,
          resourceKey: null,
          startsAt: "2026-10-26T00:00:00.000Z",
          endsAt: "2026-10-27T00:00:00.000Z",
          reason: "Excepción de prueba",
          kind,
        },
      ];
      expect(canBook({ ...input(), policy: p })).toBe(false);
    },
  );
  it("blocks an occupied shared room even for another professional, but allows adjacency", () => {
    const occupied = [
      {
        startsAt: new Date("2026-10-26T11:30:00Z"),
        blockedUntil: new Date("2026-10-26T12:15:00Z"),
        professionalId: randomUUID(),
        resourceKey: "consulta-1",
      },
    ];
    expect(canBook({ ...input(), occupied })).toBe(false);
    occupied[0]!.blockedUntil = new Date("2026-10-26T12:00:00Z");
    expect(canBook({ ...input(), occupied })).toBe(true);
  });
  it("rejects overlapping shifts, malformed exceptions, foreign properties and prototype keys", () => {
    expect(validateBookingPolicy(policy())).toBeDefined();
    for (const p of [
      { ...policy(), hours: [hours[0], hours[0]] },
      { ...policy(), stepMinutes: 0 },
      { ...policy(), arbitrary: true },
      { ...policy(), blocks: [{ id: randomUUID() }] },
      JSON.parse('{"__proto__":{}}'),
    ])
      expect(() => validateBookingPolicy(p)).toThrow();
  });
  it("walks real UTC instants over Chilean DST without inventing midnight", () => {
    const p = policy();
    p.minNoticeMinutes = 0;
    p.hours = [{ weekday: 0, opens: "00:00", closes: "03:00" }];
    p.professionals = [{ membershipId: professionalId, hours: p.hours }];
    const slots = daySlots("2026-09-06", {
      ...input(),
      policy: p,
      now: new Date("2026-09-05T00:00:00Z"),
      service: { durationMinutes: 30, bufferMinutes: 0, resourceKey: null },
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.every((s) => civil(new Date(s), "America/Santiago").minute >= 60),
    ).toBe(true);
  });
  it("preserves both distinct instants when an autumn local time repeats", () => {
    const p = policy();
    p.minNoticeMinutes = 0;
    p.hours = [{ weekday: 6, opens: "22:00", closes: "23:59" }];
    p.professionals = [{ membershipId: professionalId, hours: p.hours }];
    const slots = daySlots("2026-04-04", {
      ...input(),
      policy: p,
      now: new Date("2026-04-03T00:00:00Z"),
      service: { durationMinutes: 15, bufferMinutes: 0, resourceKey: null },
    });
    const repeated = slots.filter(
      (s) => civil(new Date(s), "America/Santiago").minute === 23 * 60 + 15,
    );
    expect(repeated).toHaveLength(2);
    expect(new Set(repeated).size).toBe(2);
  });
  it("rejects invalid calendar dates and empty availability", () => {
    expect(() => daySlots("2026-02-30", input())).toThrow();
    expect(
      daySlots("2026-10-26", {
        ...input(),
        policy: { ...policy(), professionals: [] },
      }),
    ).toEqual([]);
  });
});
