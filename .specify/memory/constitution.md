<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Bump rationale: MINOR — materially expanded Principle V + added new Principle X.
- Modified principles:
  - V. Tests, Comportamiento Verificable y Ciclo de Vida de las Pruebas
    (updated tech references, added Prohibición de Tests Triviales,
     added Manejo de Cobertura en Fases de Configuración)
- Added sections:
  - X. Gestión de GitFlow y Fases Iterativas
- Removed sections: none
- Deferred TODOs: none
-->
# Constitución del Proyecto: Sistema de Valoración de Mercado de Jugadores de Fútbol

## Datos del Documento
- **Versión:** 1.1.0
- **Fecha de creación:** 2026-09-08
- **Última actualización:** 2026-09-13
- **Modelo de desarrollo:** Spec-Driven Development (SDD)

---
## Contexto Tecnológico (Tech Stack)

### Frontend
- **Framework:** Next.js (con TypeScript)
- **Estilos:** CSS

### Backend / Base de Datos
- **Lenguaje / Runtime:** TypeScript / Node.js
- **ORM / Query Builder:** Drizzle ORM
- **Base de Datos:** PostgreSQL

### Testing
- **Framework de Test:** Vitest

## Principios Fundamentales

### I. Requisitos, Alcance e Integridad del Dominio
- La implementación debe seguir los requisitos definidos por el enunciado del Trabajo Práctico y el alcance explícitamente aprobado para cada entrega.
- El agente no debe inventar funcionalidades, reglas de negocio ni ampliar el alcance de forma silenciosa.
- Los requisitos explícitamente indicados por el enunciado del Trabajo Práctico tienen precedencia sobre suposiciones, convenciones o preferencias de implementación.
- La implementación debe preservar el significado y la terminología del dominio del problema.
- Cuando los requisitos sean ambiguos, contradictorios o incompletos, la ambigüedad debe identificarse y plantearse antes de tomar una decisión de negocio o arquitectónica significativa.

### II. Especificación Primero (Specification First)
- Todo cambio no trivial que modifique comportamiento, reglas de negocio, contratos públicos o arquitectura debe contar con una especificación aprobada antes de su implementación.
- Las especificaciones deben describir el comportamiento observable, las reglas de negocio relevantes, las restricciones, los escenarios alternativos y los criterios de aceptación.
- El flujo de desarrollo debería seguir el siguiente orden: Contexto $\rightarrow$ Alcance de la Entrega $\rightarrow$ Specification $\rightarrow$ Plan $\rightarrow$ Implementación $\rightarrow$ Tests $\rightarrow$ Validación.

### III. Arquitectura en Capas y Modelo de Dominio Rico
- El sistema debe mantener una separación clara de responsabilidades entre Controladores, Servicios, Modelo de Dominio, Repositorios / Persistencia y Adaptadores para sistemas externos.
- Los controladores se comunican únicamente con los servicios.
- Los servicios orquestan las operaciones de aplicación y transaccionales entre el dominio y la persistencia.
- El Modelo de Dominio contiene las principales reglas de negocio y no debe depender de aspectos de infraestructura (frameworks, persistencia, APIs externas).
- Los repositorios y adaptadores encapsulan la persistencia y la comunicación externa, respectivamente.

### IV. Validación por Responsabilidad
- La validación debe realizarse estrictamente en el nivel adecuado sin duplicación innecesaria:
  - **Capa de Request / DTO:** estructura, tipos, formato, normalización de entradas (trimming) y sanitización.
  - **Capa de Servicio:** existencia de recursos, resolución de identificadores y viabilidad operacional en el contexto actual.
  - **Modelo de Dominio:** invariantes del dominio, reglas intrínsecas y excepciones específicas del dominio.

### V. Tests, Comportamiento Verificable y Ciclo de Vida de las Pruebas
- Todo requisito implementado debe contar con un camino de verificación claro que cubra escenarios positivos, negativos y límites en el nivel apropiado:
  - **Tests unitarios de dominio:** aislados y enfocados estrictamente en el comportamiento, reglas de negocio e invariantes del dominio.
  - **Tests de integración:** servicios y repositorios probados contra una instancia real de PostgreSQL.
- **Prohibición de Tests Triviales:** Queda terminantemente prohibido escribir tests unitarios o de integración para configuraciones triviales, variables de entorno, archivos de propiedades, o código estructural puramente declarativo (ej. `env.ts`, configuraciones de herramientas).
- **Manejo de Cobertura en Fases de Configuración:** Si una fase inicial de configuración o infraestructura provoca fallos en el pipeline de CI debido a umbrales de cobertura, se deben excluir explícitamente dichos archivos en `vitest.config.ts` o en las propiedades de SonarCloud, en lugar de crear tests vacíos, artificiales o innecesarios.
- **Regla de integridad de los tests:** Los tests existentes no deben eliminarse. Cualquier modificación a los tests existentes debe estar estrictamente justificada por la evolución de la especificación y los requisitos de la funcionalidad, nunca como un artificio para forzar que pasen en verde.

### VI. Calidad Operacional, Resiliencia y Auditabilidad
- El sistema debe satisfacer los requisitos operacionales transversales: registro estructurado (structured logging), identificadores de correlación (correlation IDs), health checks, métricas de aplicación, autenticación y autorización seguras, y resiliencia ante fallos de APIs externas (utilizando datos locales o caché).
- Las operaciones financieras deben preservar registros de auditoría inmutables que capturen quién realizó la operación, la marca de tiempo, los cambios realizados y los estados previo y resultante.

### VII. Desarrollo Incremental
- El sistema debe desarrollarse de forma incremental, construyéndose estrictamente sobre los estados previamente validados dentro del alcance aprobado de la entrega actual.
- El comportamiento validado existente no debe modificarse sin un requisito explícito o una decisión documentada, y los requisitos futuros no deben implementarse de forma anticipada.

### VIII. Simplicidad y Diseño Justificado
- El proyecto debe favorecer el diseño más simple que satisfaga los requisitos actuales.
- Toda nueva abstracción, patrón arquitectónico, tecnología o infraestructura requiere una justificación concreta.

### IX. Definición de Terminado (Definition of Done)
- Un requisito o funcionalidad se considera completo cuando:
  - La implementación satisface su Specification aprobada.
  - Se han implementado y superado exitosamente los tests automatizados aplicables que cubren escenarios positivos, negativos y de límite.
  - La aplicación compila y se inicia correctamente con la configuración local.
  - Los cambios que afecten el comportamiento público de la API mantienen sincronizada y actualizada la documentación OpenAPI/Swagger y las colecciones de Postman, verificando su correcta ejecución.
  - **La Project Owner ha revisado explícitamente y otorgado su aprobación formal para la entrega o funcionalidad.**

### X. Gestión de GitFlow y Fases Iterativas
- El desarrollo debe realizarse de forma estrictamente incremental por **Fases** y tareas independientes (según el desglose de `tasks.md`).
- **Aislamiento por Rama de Fase:** Cada Fase del plan debe desarrollarse y entregarse en su propia rama independiente creada desde `main` (ej. `feature/001-phase1-setup`, `feature/001-phase2-domain`). Queda prohibido acumular todo el desarrollo en una única rama gigante o mezclar múltiples fases.
- **Pull Request por Fase:** Al finalizar todas las tareas de una fase, se debe abrir un único Pull Request hacia `main` para esa fase específica, permitiendo revisiones acotadas e incrementales.
- **Principio YAGNI Estricto:** Se favorece el diseño más simple que satisfaga los requisitos actuales. Está prohibido escribir código defensivo, abstracciones anticipadas, patrones no solicitados o lógica que no esté explícitamente requerida por la tarea o especificación actual.
