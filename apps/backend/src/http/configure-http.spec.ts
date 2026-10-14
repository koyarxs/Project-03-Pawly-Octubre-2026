import { ArgumentsHost, HttpException, Logger } from "@nestjs/common";
import { SafeExceptionFilter } from "./configure-http";

describe("SafeExceptionFilter", () => {
  const secret = "CANARY_PASSWORD_TOKEN_COOKIE";
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  const filter = new SafeExceptionFilter();

  beforeEach(() => jest.clearAllMocks());

  it.each([400, 401, 403, 404, 409, 413, 415, 418, 422, 429])(
    "keeps HTTP %i without reflecting exception payloads or messages",
    (code) => {
      filter.catch(
        new HttpException(
          {
            message: [`Unexpected token in ${secret}`, { password: secret }],
            password: secret,
            token: secret,
            cookie: secret,
          },
          code,
        ),
        host,
      );
      expect(status).toHaveBeenCalledWith(code);
      const body = json.mock.calls[0]![0];
      expect(body).toEqual({ statusCode: code, message: expect.any(String) });
      expect(JSON.stringify(body)).not.toContain("CANARY");
    },
  );

  it("keeps unexpected server errors generic in both the response and logs", () => {
    const log = jest.spyOn(Logger, "error").mockImplementation(() => undefined);
    try {
      filter.catch(new Error(secret), host);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        statusCode: 500,
        message: "Error interno del servidor.",
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain("CANARY");
    } finally {
      log.mockRestore();
    }
  });

  it.each([
    ["entity.parse.failed", 400],
    ["entity.too.large", 413],
    ["charset.unsupported", 415],
    ["encoding.unsupported", 415],
  ])(
    "keeps the parser status for %s without serializing its body",
    (type, code) => {
      filter.catch(
        Object.assign(new Error(secret), { type, body: secret }),
        host,
      );
      expect(status).toHaveBeenCalledWith(code);
      expect(JSON.stringify(json.mock.calls)).not.toContain("CANARY");
    },
  );
});
