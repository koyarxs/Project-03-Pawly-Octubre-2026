import { ImageResponse } from "next/og";

export const alt =
  "Pawly · Tu clínica conectada. Más tiempo para cuidar. Software veterinario en desarrollo para Chile.";
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
          pawly.
        </span>
        <span style={{ fontSize: 17, color: "#D7E4BE" }}>
          GESTIÓN VETERINARIA PARA CHILE
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
        <span>Tu clínica, conectada.</span>
        <span style={{ color: "#D7E4BE" }}>Más tiempo para cuidar.</span>
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
        <span>Pacientes, agenda e historia clínica.</span>
        <span style={{ color: "#D7E4BE", fontSize: 17 }}>En desarrollo</span>
      </div>
    </div>,
    size,
  );
}
