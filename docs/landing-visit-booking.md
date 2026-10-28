# Visit section

The `#tu-visita` section is a static presentation, as requested. It retains the three step cards, pets, reception background and illustrated agenda. The upper-left eyebrow, introductory paragraph and the vertical line and dots beside the cards have been removed.

The pets occupy a dedicated grid column with breathing room between the cards and the illustrated calendar. Tablet and mobile layouts place content on separate rows without overlap.

The calendar, times, service choices, professional summary and step cards have no controls or click handlers. No booking catalog or availability requests are made by this section. Its fixed calendar date belongs to the illustration and does not represent live availability.

The only action is **Agenda tu cita**, linking directly to `/agendar-cita`, where the actual booking process begins. The full booking page continues to support previously issued selection URLs; this section no longer creates them.

Imagery and original prompts are recorded in [the asset README](../apps/frontend/public/images/porvenir/visit/README.md).

The browser check verifies the single action, absence of interactive calendar controls and booking API requests, spacing around the pets, and responsive widths from 320 to 1920 pixels.
