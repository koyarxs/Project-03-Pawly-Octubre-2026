# Asistente retirado

El 23 de octubre de 2026 el usuario pidió retirar el chatbot y cancelar la integración de IA.

- No hay widget público, panel de asistente, bandeja del chatbot ni endpoints Concierge registrados.
- Se retiraron el código del asistente, el SDK de OpenAI y sus variables locales, incluida la clave de API del archivo backend `.env`.
- Ollama fue detenido y se eliminaron exclusivamente su motor y modelo descargados para esta prueba dentro de `tmp/ollama`.
- La migración pendiente `20261023030000_local_concierge` no fue aplicada y se retiró.
- Se conservan los modelos Prisma y la migración ya aplicada `20261023020000_porvenir_concierge`, así como las filas existentes. No se borran tablas ni historiales y no funciona el anterior proceso de retención.
- La llamada mínima previa a OpenAI fue rechazada por saldo insuficiente. No se configuraron pagos, suscripciones ni recargas; no se harán más llamadas desde el sistema retirado.

El sitio y la gestión veterinaria continúan funcionando sin chatbot. Conservar estos datos de base no activa proveedores ni implica cobros.
