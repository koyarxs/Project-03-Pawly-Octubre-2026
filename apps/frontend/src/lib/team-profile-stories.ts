/** Editorial examples only. Never merge these fictional histories into published staff records. */
export type TeamProfileStory = {
  hometown: string;
  introduction: string;
  history: string[];
  education: { title: string; location: string; description: string }[];
  approach: string;
  outside: string;
  gallery: { caption: string; detail: string }[];
};

export const teamProfileStories: Record<string, TeamProfileStory> = {
  "director-demo": {
    hometown: "Valparaíso, Chile",
    introduction: "Una vocación que creció junto a las familias del puerto.",
    history: [
      "En esta historia de ejemplo, Sebastián creció en Valparaíso entre cerros, vecinos y animales que eran parte de la vida del barrio. Ese vínculo cotidiano lo llevó a elegir la medicina veterinaria y a imaginar una atención donde las familias se sintieran escuchadas.",
      "Con el tiempo, su interés se amplió al trabajo en equipo. Hoy su personaje representa una dirección clínica cercana: organizar los cuidados, compartir decisiones y dar a cada integrante el espacio para aportar desde su experiencia.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Santiago, Chile", description: "Trayectoria universitaria ficticia enfocada en animales de compañía." },
      { title: "Gestión de equipos clínicos", location: "Valparaíso, Chile", description: "Formación de ejemplo en coordinación, comunicación y organización de la atención." },
      { title: "Aprendizaje continuo", location: "Región de Valparaíso", description: "Intercambio de casos y actualización del equipo como parte de su recorrido narrativo." },
    ],
    approach: "Escuchar primero, explicar con claridad y coordinar el cuidado de principio a fin. Para Sebastián, una buena experiencia empieza con un equipo que trabaja unido.",
    outside: "En sus ratos libres disfruta recorrer los cerros del puerto y detenerse a conversar con sus vecinos.",
    gallery: [
      { caption: "Cuidar también es coordinar", detail: "Una mañana de conversación con el equipo en una clínica ambientada en Valparaíso." },
      { caption: "Tiempo para cada familia", detail: "Una bienvenida tranquila a un perro mayor y su tutor." },
      { caption: "Su lugar en el mundo", detail: "Un paseo de tarde entre las calles y colores del puerto." },
    ],
  },
  "veterinarian-demo": {
    hometown: "Viña del Mar, Chile",
    introduction: "La prevención, explicada con cercanía y sin apuro.",
    history: [
      "Valentina es un personaje que descubre su vocación acompañando el cuidado de las mascotas de su familia en Viña del Mar. En su historia, estudiar medicina veterinaria fue una forma de unir la curiosidad científica con su interés por las personas y sus animales.",
      "Su recorrido de ejemplo pone el foco en la consulta cotidiana: entender los hábitos de cada paciente, conversar con sus tutores y transformar las indicaciones en cuidados que puedan llevar a casa con confianza.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Viña del Mar, Chile", description: "Formación universitaria ficticia orientada a la salud de animales de compañía." },
      { title: "Medicina preventiva", location: "Santiago, Chile", description: "Itinerario formativo de ejemplo sobre prevención y acompañamiento de las familias." },
      { title: "Comunicación en consulta", location: "Región de Valparaíso", description: "Aprendizaje narrativo centrado en explicar, escuchar y resolver dudas." },
    ],
    approach: "Conocer la rutina de cada animal ayuda a construir un cuidado más cercano. Su forma de atender parte de preguntas simples y explicaciones comprensibles.",
    outside: "Le gustan las caminatas junto al mar y los paseos tranquilos con perros mestizos.",
    gallery: [
      { caption: "Una consulta sin apuro", detail: "Una revisión ilustrativa de un gato en un ambiente tranquilo." },
      { caption: "Conversar es parte del cuidado", detail: "Un momento para orientar a una familia y escuchar sus preguntas." },
      { caption: "Un respiro junto al mar", detail: "Un paseo de ejemplo inspirado en la costa de Viña del Mar." },
    ],
  },
  "surgeon-demo": {
    hometown: "Quilpué, Chile",
    introduction: "Atención a los detalles, antes y después de cada procedimiento.",
    history: [
      "En su biografía ficticia, Matías creció en Quilpué y desde joven disfrutó comprender cómo funcionaban las cosas. Esa curiosidad lo acercó a la anatomía y, más adelante, al estudio de la medicina veterinaria en Santiago.",
      "Su historia se construye alrededor de la preparación y el acompañamiento: revisar cada caso con el equipo, explicar las etapas a la familia y estar presente durante la recuperación. La cirugía aparece como un proceso de cuidado compartido.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Santiago, Chile", description: "Estudios universitarios ficticios con interés en anatomía y clínica de pequeños animales." },
      { title: "Formación en cirugía de pequeños animales", location: "Santiago, Chile", description: "Recorrido de actualización de ejemplo; no representa una especialidad acreditada." },
      { title: "Cuidados de recuperación", location: "Valparaíso, Chile", description: "Aprendizaje narrativo sobre coordinación y seguimiento después de los procedimientos." },
    ],
    approach: "Preparar con calma, trabajar en equipo y explicar cada etapa. Su mirada pone tanto cuidado en la recuperación como en el procedimiento.",
    outside: "Disfruta los cafés de barrio, la fotografía cotidiana y descubrir rincones del puerto a pie.",
    gallery: [
      { caption: "Preparación y detalle", detail: "Una revisión de un modelo anatómico en un espacio de trabajo veterinario." },
      { caption: "Acompañar la recuperación", detail: "Una revisión ilustrativa y no invasiva de un perro tranquilo." },
      { caption: "Una pausa en el puerto", detail: "Un momento personal en un patio inspirado en Valparaíso." },
    ],
  },
  "internist-demo": {
    hometown: "Viña del Mar, Chile",
    introduction: "Escuchar la historia completa para entender a cada paciente.",
    history: [
      "La historia de Fernanda comienza en Viña del Mar, donde su interés por la biología y los animales la llevó a elegir medicina veterinaria. En este relato de ejemplo, encontró en la medicina interna un espacio para observar, hacer preguntas y conectar los detalles.",
      "Su personaje acompaña especialmente a familias que necesitan seguimiento. Valora ordenar la información, conversar los pasos del estudio de cada caso y mantener una comunicación cercana a lo largo del tiempo.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Santiago, Chile", description: "Trayectoria universitaria ficticia con interés en clínica y evaluación del paciente." },
      { title: "Profundización en medicina interna", location: "Viña del Mar, Chile", description: "Formación de ejemplo en razonamiento clínico; no acredita una especialidad real." },
      { title: "Seguimiento de pacientes", location: "Región de Valparaíso", description: "Recorrido narrativo dedicado a la continuidad del cuidado y la comunicación." },
    ],
    approach: "Dar tiempo a las preguntas y ordenar juntos los siguientes pasos. Su forma de cuidar se apoya en la observación y el seguimiento cercano.",
    outside: "Encuentra inspiración leyendo en el jardín y cuidando sus plantas en tardes tranquilas.",
    gallery: [
      { caption: "Escuchar antes de empezar", detail: "Una conversación con una tutora en un consultorio ambientado en Viña del Mar." },
      { caption: "Una mirada atenta", detail: "Una escena ilustrativa de evaluación junto a un equipo de diagnóstico." },
      { caption: "Historias entre hojas", detail: "Un momento de lectura en un jardín inspirado en la Región de Valparaíso." },
    ],
  },
  "trauma-demo": {
    hometown: "Quilpué, Chile",
    introduction: "Recuperar el movimiento es recuperar pequeños momentos felices.",
    history: [
      "Ignacio es un personaje vinculado a la vida al aire libre de la Región de Valparaíso. Su historia ficticia parte de los paseos con perros de su familia y del deseo de comprender cómo el movimiento influye en su bienestar.",
      "Tras estudiar medicina veterinaria en este relato, orienta su aprendizaje hacia el sistema musculoesquelético y la recuperación funcional. Su enfoque de ejemplo valora los progresos cotidianos y las posibilidades de cada familia para acompañarlos.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Santiago, Chile", description: "Formación universitaria ficticia con interés en anatomía y movilidad." },
      { title: "Cuidado musculoesquelético", location: "Santiago, Chile", description: "Actualización de ejemplo en evaluación funcional; sin acreditación de especialista." },
      { title: "Rehabilitación y seguimiento", location: "Región de Valparaíso", description: "Itinerario narrativo centrado en acompañar la movilidad y la vida cotidiana." },
    ],
    approach: "Observar cómo se mueve cada paciente, escuchar a su familia y acompañar los avances con paciencia. Cada pequeño logro cuenta.",
    outside: "Prefiere los senderos arbolados de los alrededores de Quilpué y las caminatas de fin de semana.",
    gallery: [
      { caption: "Volver a disfrutar el paseo", detail: "Observación ilustrativa de la marcha de un perro acompañado por su tutor." },
      { caption: "Paciencia en cada avance", detail: "Una evaluación suave de movilidad sobre una superficie antideslizante." },
      { caption: "Caminar para desconectarse", detail: "Un sendero inspirado en los paisajes costeros de la Región de Valparaíso." },
    ],
  },
  "technician-demo": {
    hometown: "Villa Alemana, Chile",
    introduction: "La tranquilidad también se construye con pequeños cuidados.",
    history: [
      "En su historia de demostración, Camila creció en Villa Alemana y descubrió que se sentía especialmente cómoda acompañando a animales que necesitaban paciencia y calma. Por eso eligió estudiar una carrera técnica vinculada al cuidado veterinario.",
      "Su personaje representa el trabajo atento que ocurre entre consultas: preparar los espacios, observar a los pacientes y colaborar con las indicaciones del equipo médico. Su vocación se expresa en los detalles cotidianos.",
    ],
    education: [
      { title: "Técnico en Enfermería Veterinaria", location: "Viña del Mar, Chile", description: "Formación técnica ficticia, distinta del título de médico veterinario." },
      { title: "Cuidados y hospitalización", location: "Valparaíso, Chile", description: "Aprendizaje de ejemplo en acompañamiento y asistencia al equipo clínico." },
      { title: "Bienestar y manejo amable", location: "Región de Valparaíso", description: "Actualización narrativa sobre ambientes tranquilos y cuidado cotidiano." },
    ],
    approach: "Preparar un espacio cómodo, observar con atención y acompañar con respeto. Su trabajo se plantea siempre en colaboración con el equipo médico.",
    outside: "Disfruta las tardes de jardín y compartir momentos tranquilos con animales de compañía.",
    gallery: [
      { caption: "Compañía que tranquiliza", detail: "Acompañamiento ilustrativo de un gato despierto sobre una cama limpia." },
      { caption: "Todo listo para cuidar", detail: "Preparación de textiles e insumos cerrados en un área clínica ordenada." },
      { caption: "Calma fuera de la clínica", detail: "Una tarde de ejemplo en un patio de Villa Alemana." },
    ],
  },
  "reception-demo": {
    hometown: "Valparaíso, Chile",
    introduction: "La primera bienvenida también forma parte de la experiencia.",
    history: [
      "Nicolás es un personaje porteño que disfruta resolver problemas prácticos y conversar con las personas. En esta biografía ficticia, su formación en administración y atención al cliente encontró un lugar natural en el entorno de una clínica veterinaria.",
      "Su historia se centra en recibir, orientar y organizar. Busca que cada familia sepa dónde acudir, cómo preparar su visita y a quién dirigir sus dudas, derivando siempre las preguntas médicas al equipo clínico.",
    ],
    education: [
      { title: "Administración y atención al cliente", location: "Valparaíso, Chile", description: "Recorrido formativo ficticio de carácter administrativo, sin título sanitario." },
      { title: "Organización de agendas", location: "Viña del Mar, Chile", description: "Aprendizaje de ejemplo en coordinación de visitas y comunicación con familias." },
      { title: "Experiencia de atención", location: "Región de Valparaíso", description: "Formación narrativa enfocada en escucha, orientación y trabajo en equipo." },
    ],
    approach: "Una respuesta clara y una bienvenida amable ayudan a llegar con más tranquilidad. Su labor conecta a las familias con el equipo que las atenderá.",
    outside: "Le gusta caminar por los parques de Viña del Mar y descubrir cafeterías con amigos.",
    gallery: [
      { caption: "Bienvenidos desde el primer momento", detail: "Recepción ilustrativa de una familia y su perro en una clínica del puerto." },
      { caption: "Una visita bien organizada", detail: "Coordinación de agenda en un espacio de recepción; sin datos de pacientes reales." },
      { caption: "Una pausa entre árboles", detail: "Un paseo personal inspirado en un parque de Viña del Mar." },
    ],
  },
  "groomer-demo": {
    hometown: "Valparaíso, Chile",
    introduction: "Bienestar y paciencia, de principio a fin.",
    history: [
      "La historia ficticia de Daniela nace en Valparaíso, entre el gusto por los trabajos manuales y una relación cercana con los perros de su familia. En este relato, decidió formarse en peluquería canina para unir el cuidado cotidiano con su sensibilidad estética.",
      "Su personaje pone el acento en conocer a cada mascota y respetar sus tiempos. Su trabajo de ejemplo se orienta a la higiene y el arreglo, sin presentar la peluquería como sustituto de la atención médica veterinaria.",
    ],
    education: [
      { title: "Peluquería y estética canina", location: "Viña del Mar, Chile", description: "Formación de oficio ficticia enfocada en higiene y arreglo del pelaje." },
      { title: "Manejo amable durante el grooming", location: "Valparaíso, Chile", description: "Aprendizaje de ejemplo sobre paciencia, adaptación y bienestar." },
      { title: "Cuidado de distintos mantos", location: "Región de Valparaíso", description: "Recorrido narrativo de actualización práctica; no corresponde a formación médica." },
    ],
    approach: "Conocer sus tiempos y hacer del arreglo una experiencia respetuosa. La comodidad del animal acompaña cada decisión de su trabajo.",
    outside: "Disfruta cuidar plantas en su patio porteño y hacer pequeñas mejoras en su casa.",
    gallery: [
      { caption: "Su ritmo, su cuidado", detail: "Cepillado ilustrativo y tranquilo de un perro pequeño." },
      { caption: "Un momento de bienestar", detail: "Secado suave con toalla en un espacio de peluquería canina." },
      { caption: "Un patio con vida", detail: "Un momento personal entre plantas en una casa inspirada en Valparaíso." },
    ],
  },
  "exotics-demo": {
    hometown: "Viña del Mar, Chile",
    introduction: "Cada especie tiene una historia y necesidades propias.",
    history: [
      "En esta historia de ejemplo, Constanza creció en Viña del Mar observando aves y aprendiendo sobre la diversidad de animales que comparten nuestros hogares. Esa curiosidad la llevó a estudiar medicina veterinaria y a interesarse por especies distintas de perros y gatos.",
      "Su personaje se enfoca en comprender el ambiente, las rutinas y las particularidades de cada paciente. El relato destaca la orientación a las familias y el respeto por los animales, sin atribuirle acreditaciones reales ni atención de fauna silvestre.",
    ],
    education: [
      { title: "Medicina Veterinaria", location: "Santiago, Chile", description: "Estudios universitarios ficticios con interés en diversidad y bienestar animal." },
      { title: "Cuidado de animales de compañía no tradicionales", location: "Santiago, Chile", description: "Formación de ejemplo sobre distintas especies; no acredita una especialidad real." },
      { title: "Ambiente y prevención", location: "Región de Valparaíso", description: "Aprendizaje narrativo sobre hábitos, recintos y orientación a tutores." },
    ],
    approach: "Antes de cuidar, conocer cómo vive cada especie. Su mirada presta atención al entorno y a las preguntas de quienes la acompañan.",
    outside: "Le gusta observar aves desde miradores y recorrer paisajes costeros sin intervenir la fauna.",
    gallery: [
      { caption: "Una atención a su medida", detail: "Consulta ilustrativa y no invasiva de un conejo doméstico tranquilo." },
      { caption: "El entorno también importa", detail: "Conversación sobre un hábitat de ejemplo y cuidados cotidianos." },
      { caption: "Mirar con respeto", detail: "Observación de aves desde un mirador inspirado en la costa de Chile central." },
    ],
  },
};
