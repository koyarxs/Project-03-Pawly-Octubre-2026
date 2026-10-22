import { ImageResponse } from "next/og";

export const alt = "Clínica Veterinaria Porvenir · Un espacio para cuidar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <span style={{ fontSize: 50, fontWeight: 700, color: "#D7E4BE" }}>
          Porvenir.
        </span>
        <span style={{ fontSize: 17, color: "#D7E4BE" }}>
          CLÍNICA VETERINARIA
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 68,
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
