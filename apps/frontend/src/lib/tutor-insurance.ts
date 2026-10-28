export function tutorInsurance(tutor: { insuranceType?: string | null; insuranceProvider?: string | null; fonasaGroup?: string | null }) {
  if (tutor.insuranceType === "FONASA") return `Fonasa${tutor.fonasaGroup ? ` · Tramo ${tutor.fonasaGroup}` : ""}`;
  if (tutor.insuranceType === "ISAPRE") return `Isapre${tutor.insuranceProvider ? ` · ${tutor.insuranceProvider}` : ""}`;
  if (tutor.insuranceType === "OTHER") return tutor.insuranceProvider || "Otra previsión";
  return tutor.insuranceType === "NONE" ? "Sin previsión" : "Sin informar";
}
