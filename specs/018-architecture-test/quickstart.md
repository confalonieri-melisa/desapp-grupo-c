# Quickstart: Test de arquitectura por capas

## Prerrequisitos

- Node.js `>=22.12.0`.
- Dependencias del proyecto instaladas.

## Ejecutar el test

Desde la raíz del proyecto:

```bash
npm test -- tests/unit/architecture/dependencies.spec.ts
```

También puede ejecutarse junto con toda la suite:

```bash
npm test
```

## Resultado esperado

- La prueba pasa cuando los controllers no importan directamente repositories ni `src/backend/db`.
- La prueba pasa cuando los models no importan controllers, services, repositories, `src/backend/db` ni adapters.
- La prueba falla si se agrega uno de esos imports a un controller y muestra el archivo que incumple la regla.
- La prueba falla si un model se acopla a una capa de aplicación o infraestructura.
- No es necesario levantar PostgreSQL ni iniciar la aplicación.
