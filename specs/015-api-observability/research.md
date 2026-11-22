# Research: Observabilidad operativa del marketplace

## Decision: Instrumentación mediante un wrapper común de rutas

**Rationale**: El proyecto utiliza Route Handlers de Next.js y no tiene un
middleware posterior a la respuesta que permita medir fácilmente status y
duración. Un wrapper pequeño alrededor de cada handler permite centralizar
correlation ID, medición, logging y conteo sin mover reglas de negocio a las
rutas.

**Alternatives considered**:

- Instrumentar cada ruta manualmente: rechazado por duplicar lógica y hacer
  más probable que alguna ruta quede sin auditar.
- Incorporar un agente de observabilidad externo: rechazado por alcance y
  complejidad innecesarios para el MVP.

## Decision: Métricas volátiles en memoria y formato Prometheus generado localmente

**Rationale**: La especificación no exige persistencia histórica ni un servidor
Prometheus. Un registro en memoria permite cumplir el contrato de métricas sin
Redis, migraciones ni nuevas dependencias. El endpoint expone sólo contadores y
duraciones agregadas.

**Alternatives considered**:

- Redis: diferido hasta que exista la necesidad de cache distribuida.
- Tabla PostgreSQL: rechazado porque las métricas no son datos funcionales y
  agregaría migraciones y mantenimiento.
- Librería adicional de métricas: diferida; el conjunto mínimo de métricas se
  puede serializar directamente al formato requerido.

## Decision: Logging estructurado en el logger existente del runtime

**Rationale**: Emitir un objeto JSON por evento permite cumplir la auditoría
solicitada sin incorporar Log4j, Logback, ELK ni un proveedor externo. La
sanitización se concentra en un único helper antes de emitir el evento.

**Alternatives considered**:

- Persistir auditoría HTTP en PostgreSQL: rechazado; la auditoría financiera
  existente mantiene sus propias reglas y no debe mezclarse con logs de
  infraestructura.
- Agregar un sistema de logging externo: fuera del MVP.

## Decision: Health readiness con la base de datos como dependencia mínima

**Rationale**: La aplicación ya depende de PostgreSQL para sus servicios
funcionales. Liveness sólo verifica que el proceso responde; readiness realiza
una consulta mínima a la base y devuelve un estado no saludable si no puede
utilizarla.

**Alternatives considered**:

- Verificar también proveedores externos: rechazado para evitar que una caída
  de un proveedor bloquee la disponibilidad básica del marketplace.
- Incorporar Redis al readiness: diferido hasta que Redis sea una dependencia
  real.

## Decision: Métricas avanzadas calculadas con datos existentes

**Rationale**: El endpoint devolverá estrategia activa, cantidad de jugadores y
el último resultado de recálculo disponible, reutilizando servicios y
repositorios existentes. No se agrega una tabla ni un modelo de métricas de
negocio.

**Alternatives considered**:

- Crear un modelo histórico de métricas: fuera del alcance MVP.
- Construir un dashboard frontend: fuera del alcance de esta feature.
