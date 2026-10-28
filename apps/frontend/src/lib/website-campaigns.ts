export interface WebsiteCampaign {
  id: string;
  group: "consultation" | "pets" | "care";
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  note: string;
  badge: string;
  position: string;
  tone: "sage" | "peach" | "mint";
}

/** Seven compositions grouped under the existing published category IDs. */
export const websiteCampaigns: readonly WebsiteCampaign[] = [
  { id: "care-together", group: "consultation", image: "/images/porvenir/campaign/6234633.jpg", alt: "Fotografía ilustrativa de un veterinario acompañando a un perro en consulta.", eyebrow: "SU BIENESTAR EMPIEZA CONTIGO", title: "Más cerca de ti.", accent: "Más cerca de ellos.", description: "Personas que cuidan. Compañeros que nos inspiran. Una nueva forma de conectar su atención.", note: "Un espacio para cuidar", badge: "Cada visita cuenta", position: "50% 45%", tone: "sage" },
  { id: "family-bond", group: "pets", image: "/images/porvenir/campaign/9929613.jpg", alt: "Fotografía ilustrativa de una mujer sosteniendo con cariño a su gato negro.", eyebrow: "MUCHO MÁS QUE UNA MASCOTA", title: "Son familia.", accent: "Y se nota.", description: "Por sus juegos, su compañía y todo lo que comparten contigo. Dale un lugar a su bienestar.", note: "Pequeñas huellas, gran amor", badge: "Un vínculo para cuidar", position: "50% 62%", tone: "peach" },
  { id: "next-visit", group: "consultation", image: "/images/porvenir/campaign/6235049.jpg", alt: "Fotografía ilustrativa de una tutora con su perro conversando con un veterinario.", eyebrow: "EL PRIMER PASO ES ENCONTRARNOS", title: "Hazle espacio", accent: "a su cuidado.", description: "Revisa la agenda y prepara su próxima visita. El cuidado comienza mucho antes de la consulta.", note: "Su próxima visita, más cerca", badge: "Tu agenda, conectada", position: "50% 48%", tone: "mint" },
  { id: "connected-home", group: "care", image: "/images/porvenir/campaign/6001366.jpg", alt: "Fotografía ilustrativa de una persona usando un computador junto a su gato.", eyebrow: "TECNOLOGÍA CON UN LADO MUY HUMANO", title: "Tú a su lado.", accent: "Todo más conectado.", description: "Una agenda, una historia y un equipo. Pawly conecta la información que acompaña cada atención.", note: "Conectados por su bienestar", badge: "Su historia, a mano", position: "50% 55%", tone: "sage" },
  { id: "team-care", group: "consultation", image: "/images/porvenir/campaign/7469231.jpg", alt: "Fotografía ilustrativa de dos personas de un equipo veterinario atendiendo a un perro.", eyebrow: "EL CUIDADO ES UN TRABAJO EN EQUIPO", title: "Buenas manos.", accent: "Grandes compañeros.", description: "Escuchar, acompañar y organizar cada atención. Porque detrás de cada paciente hay toda una historia.", note: "Cuidar nos conecta", badge: "Personas que acompañan", position: "50% 43%", tone: "mint" },
  { id: "daily-care", group: "pets", image: "/images/porvenir/campaign/6865177.jpg", alt: "Fotografía ilustrativa de una mujer cepillando a su gato en casa.", eyebrow: "EL CARIÑO ESTÁ EN LOS DETALLES", title: "Pequeños cuidados.", accent: "Grandes momentos.", description: "El bienestar también vive en lo cotidiano: una caricia, un cepillado y tiempo para estar juntos.", note: "Cada día a su lado", badge: "Bienestar cotidiano", position: "42% 45%", tone: "peach" },
  { id: "life-together", group: "care", image: "/images/porvenir/campaign/16597601.jpg", alt: "Fotografía ilustrativa de una mujer alimentando a su gato en un hogar luminoso.", eyebrow: "POR TODAS LAS HISTORIAS QUE VIENEN", title: "Más vida juntos.", accent: "Más motivos para cuidar.", description: "Acompaña cada etapa de tu compañero con atención, cercanía y una historia que sigue creciendo.", note: "Que lo bueno siga creciendo", badge: "Juntos en cada etapa", position: "50% 45%", tone: "sage" },
];
