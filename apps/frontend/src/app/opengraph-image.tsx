import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Clínica Veterinaria Porvenir · Un espacio para cuidar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/images/brand/porvenir-logo.png"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#173E37",
        color: "#FAF9F5",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", background: "white", borderRadius: 16, padding: "12px 20px" }}>
          {/* ImageResponse renders embedded assets, independently of next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="Clínica Veterinaria Porvenir" width={360} height={120} />
        </div>
        <span style={{ fontSize: 17, color: "#D7E4BE" }}>
          CLÍNICA VETERINARIA
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 38,
          fontSize: 76,
          fontWeight: 600,
          lineHeight: 1.12,
          letterSpacing: "-3px",
        }}
      >
        <span>Cerca de ti.</span>
        <span style={{ color: "#D7E4BE" }}>Cerca de quienes quieres.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          borderTop: "1px solid #47654F",
          paddingTop: 24,
          fontSize: 20,
        }}
      >
        <span>Clínica Veterinaria Porvenir</span>
        <span style={{ color: "#D7E4BE", fontSize: 17 }}>
          Un espacio para cuidar.
        </span>
      </div>
    </div>,
    size,
  );
}
