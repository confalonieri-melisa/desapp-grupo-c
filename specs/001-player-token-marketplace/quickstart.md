# Quickstart & Verification Guide: Entrega 1

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-09-12  

---

## 1. Requisitos Previos

- **Node.js**: v20.x o superior
- **npm**
- **PostgreSQL** corriendo localmente o en contenedor (ej. `postgresql://postgres:postgres@localhost:5432/desapp_db`)

---

## 2. Configuración de Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/desapp_db"
JWT_SECRET="secret-jwt-key-desapp-grupo-c-min-32-chars"
NODE_ENV="development"
PORT=3000
```

---

## 3. Instalación y Base de Datos

```bash
# 1. Instalar dependencias
npm install

# 2. Generar y aplicar migraciones Drizzle
npm run db:generate
npm run db:migrate

# 3. Cargar dataset inicial (15 jugadores en 5 ligas + superusuario en t0)
npm run db:seed
```

---

## 4. Ejecución del Servidor

```bash
npm run dev
```

- Documentación interactiva Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Endpoint Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 5. Testing Automático

```bash
# Ejecutar tests unitarios de dominio y casos de uso con Vitest
npm run test

# Reporte de cobertura de código
npm run test:coverage

# Chequeo de linter y compilación TypeScript
npm run lint
npm run build
```

---

## 6. Verificación Manual con Postman

Se incluye la colección lista para importar en Postman: [`specs/001-player-token-marketplace/contracts/postman_collection.json`](./contracts/postman_collection.json).

### Flujo paso a paso en Postman:
1. **Importar Colección**: Abrir Postman -> *Import* -> Seleccionar `postman_collection.json`.
2. **Health Check**: Ejecutar `System -> Health Check` (debe responder `200 OK` con estado de la BD).
3. **Registrar Usuario**: Ejecutar `Auth -> 1. Registrar Usuario Inversor` (crea usuario con 1.000 créditos).
4. **Login**: Ejecutar `Auth -> 2. Iniciar Sesión` (guarda automáticamente el token JWT en las variables de la colección).
5. **Catálogo sin Token**: Ejecutar `Players -> 1. Listar Jugadores (Sin Token)` (verifica que responde `401 Unauthorized`).
6. **Catálogo con Token**: Ejecutar `Players -> 2. Listar Todos los Jugadores` (recibe jugadores paginados y guarda el primer `playerId`).
7. **Filtros de Catálogo**: Ejecutar `Players -> 3. Filtrar Jugadores` (filtra por `LA_LIGA` y `FORWARD`).
8. **Detalle de Jugador**: Ejecutar `Players -> 4. Obtener Detalle de Jugador` (obtiene la ficha completa con estadísticas).
