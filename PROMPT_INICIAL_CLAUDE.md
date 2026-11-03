# Prompt inicial para Claude

Lee completo el archivo `CLAUDE.md`. Ese documento es la especificación rectora del proyecto MenuPulse AI y contiene los requisitos funcionales, visuales, técnicos, de IA, datos, seguridad y evaluación.

Necesito que trabajes como arquitecto de software y desarrollador full-stack senior. Antes de programar, inspecciona el repositorio actual: revisa su estructura, `package.json`, framework, dependencias, configuración de Supabase, archivos existentes y estado de Git. No sobrescribas ni reinicies nada sin entenderlo.

Después realiza lo siguiente:

1. Resume la arquitectura que ya existe y compárala con la arquitectura solicitada en `CLAUDE.md`.
2. Identifica qué está hecho, qué falta y qué riesgos técnicos hay.
3. Propón un plan de implementación dividido en fases pequeñas, con los archivos concretos que vas a tocar.
4. Comienza por la primera fase funcional y avanza implementando, no te limites a generar un plan o mockups.
5. Mantén el código tipado, modular y listo para Supabase/Vercel. No uses datos inventados como si fueran información oficial.
6. Implementa el motor de aprendizaje contextual especificado y demuestra que actualiza su estado con eventos simulados y que el aprendizaje persiste.
7. Prueba cada fase y corrige los errores de build antes de continuar.

Prioriza que el flujo completo funcione: elegir marca → consultar menú → personalizar producto → agregar al carrito → completar orden simulada → registrar interacción → ver cómo el contexto modifica el menú → entrenar el modelo → comprobar que las recomendaciones mejoran o cambian con el historial.

Cuando termines cada fase, informa qué quedó funcionando, qué archivos modificaste, qué pruebas ejecutaste y qué queda pendiente. No afirmes que algo funciona si no lo ejecutaste o verificaste.
