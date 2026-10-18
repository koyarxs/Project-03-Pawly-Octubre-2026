import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { AppointmentInput, AppointmentQueryDto } from "./appointments.dto";
import { assertTransition, utcDate } from "./appointments.service";
describe("appointment validation", () => {
  it.each([
    "2030-02-30T10:00:00Z",
    "2030-13-01T10:00:00Z",
    "2030-01-01T10:00:00",
    "2030-01-01T10:00:00-03:00",
    "not-a-date",
    "1900-01-01T00:00:00Z",
  ])("rejects invalid or non-UTC dates %s", (value) =>
    expect(() => utcDate(value)).toThrow(),
  );
  it("accepts canonical UTC instants including milliseconds", () => {
    expect(utcDate("2030-01-01T10:00:00Z").toISOString()).toBe(
      "2030-01-01T10:00:00.000Z",
    );
    expect(utcDate("2030-01-01T10:00:00.123Z").getUTCMilliseconds()).toBe(123);
  });
  it("keeps terminal states immutable and permits clinical progression", () => {
    expect(() => assertTransition("SCHEDULED", "CONFIRMED")).not.toThrow();
    expect(() => assertTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
    expect(() => assertTransition("CANCELLED", "SCHEDULED")).toThrow();
    expect(() => assertTransition("COMPLETED", "CONFIRMED")).toThrow();
    expect(() => assertTransition("SCHEDULED", "COMPLETED")).toThrow();
  });
  it("rejects missing relations, naive instants, invalid duration and injected scope", async () => {
    const valid = {
      patientId: randomUUID(),
      tutorId: randomUUID(),
      professionalMembershipId: null,
      startsAt: "2030-01-01T10:00:00Z",
      durationMinutes: 30,
      reason: "Control",
    };
    expect(
      await validate(plainToInstance(AppointmentInput, valid)),
    ).toHaveLength(0);
    for (const change of [
      { durationMinutes: 0 },
      { durationMinutes: 481 },
      { durationMinutes: 1.5 },
      { reason: " " },
      { professionalMembershipId: undefined },
      { startsAt: "2030-01-01T10:00" },
      { patientId: "bad" },
      { clinicId: randomUUID() },
    ])
      expect(
        (
          await validate(
            plainToInstance(AppointmentInput, { ...valid, ...change }),
            { whitelist: true, forbidNonWhitelisted: true },
          )
        ).length,
      ).toBeGreaterThan(0);
  });
  it("bounds query pagination and validates filters", async () => {
    expect(
      (
        await validate(
          plainToInstance(AppointmentQueryDto, {
            from: "2030-01-01T00:00:00Z",
            to: "2030-01-08T00:00:00Z",
            page: 0,
            status: "FAKE",
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
