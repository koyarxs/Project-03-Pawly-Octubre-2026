import { documentMime } from "./patient-documents";
describe("document signature validation", () => {
  it("recognizes PDF, PNG and JPEG signatures", () => {
    expect(documentMime(Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
    expect(documentMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      "image/png",
    );
    expect(documentMime(Buffer.from([255, 216, 255, 224]))).toBe("image/jpeg");
  });
  it("rejects executable markup and empty content regardless of filename", () => {
    expect(
      documentMime(Buffer.from("<html><script>alert(1)</script>")),
    ).toBeNull();
    expect(documentMime(Buffer.alloc(0))).toBeNull();
  });
});
