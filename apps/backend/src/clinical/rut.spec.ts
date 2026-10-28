import { isValidRut, normalizeRut } from "./rut";
describe("Chilean RUT", () => {
  it.each(["12.345.678-5", "123456785", "6.000.000-k"])(
    "accepts correct check digit: %s",
    (value) => expect(isValidRut(value)).toBe(true),
  );
  it.each([
    "",
    "12.345.678-9",
    "hello123456785",
    "11.111.111-1",
    "0-0",
    "12345678--5",
  ])("rejects invalid input: %s", (value) =>
    expect(isValidRut(value)).toBe(false),
  );
  it("normalizes separators and check digit case", () =>
    expect(normalizeRut("6.000.000-k")).toBe("6000000-K"));
});
