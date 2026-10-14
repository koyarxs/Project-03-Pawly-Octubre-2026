import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ClinicAuthorizationService,
  ClinicGuard,
} from "./authorization.module";

describe("ClinicGuard", () => {
  const authorize = jest.fn().mockResolvedValue({ id: "authorized-clinic" });
  const metadata = jest.fn();
  const guard = new ClinicGuard(
    { authorize } as unknown as ClinicAuthorizationService,
    { getAllAndOverride: metadata } as unknown as Reflector,
  );
  const context = (request: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it("fails closed without an authenticated principal", async () => {
    await expect(guard.canActivate(context({}))).rejects.toThrow();
    expect(authorize).not.toHaveBeenCalled();
  });

  it("fails closed without declared permissions", async () => {
    metadata.mockReturnValue(undefined);
    await expect(
      guard.canActivate(context({ principal: { userId: "user" } })),
    ).rejects.toThrow();
    expect(authorize).not.toHaveBeenCalled();
  });

  it("uses authenticated identity and checks the route clinic instead of body claims", async () => {
    metadata.mockReturnValue(["clinic:read"]);
    const req = {
      principal: { userId: "real-user" },
      params: { clinicId: "requested-clinic" },
      body: { userId: "forged-user", clinicId: "forged-clinic", role: "OWNER" },
    };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(authorize).toHaveBeenCalledWith("real-user", "requested-clinic", [
      "clinic:read",
    ]);
  });
});
