import { ImageResponse } from "next/og";

export const alt =
  "Pawly · Menos gestión. Más cuidado. Plataforma de gestión veterinaria en desarrollo.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#102B35",
        color: "#F7F9F7",
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
        <span style={{ fontSize: 50, fontWeight: 700, color: "#C8F2E5" }}>
          pawly.
        </span>
        <span style={{ fontSize: 17, color: "#C8F2E5" }}>
          VETERINARY MANAGEMENT PLATFORM
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
        <span>Menos gestión.</span>
        <span style={{ color: "#C8F2E5" }}>Más cuidado.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          borderTop: "1px solid #37565E",
          paddingTop: 24,
          fontSize: 20,
        }}
      >
        <span>Una visión conectada para tu clínica veterinaria.</span>
        <span style={{ color: "#F0B77A", fontSize: 17 }}>En desarrollo</span>
      </div>
    </div>,
    size,
  );
}
