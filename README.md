# Postman MCP Server

Un servidor MCP (Model Context Protocol) que permite gestionar completamente Postman desde tu aplicación, incluyendo la creación de endpoints, workspaces, documentación, scripts, mock servers y environments.

## 🚀 Características

- **Endpoints completos**: Crear requests con todos los métodos HTTP (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- **Workspaces**: Gestionar workspaces personales y de equipo
- **Environments**: Crear y gestionar variables de entorno
- **Mock Servers**: Crear servidores mock para testing
- **Documentación**: Generar documentación automática para collections
- **Scripts**: Agregar scripts de pre-request y test
- **Autenticación**: Soporte completo para todos los tipos de autenticación de Postman

## 📋 Requisitos

- Node.js 18+
- API Key de Postman (obtener desde https://web.postman.co/settings/me/api-keys)

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Compilar el proyecto:**
```bash
npm run build
```

3. **Ejecutar el servidor:**
```bash
npm start
```

## 🔧 Configuración

### 1. Obtener API Key de Postman

1. Ve a [Postman Settings](https://web.postman.co/settings/me/api-keys)
2. Genera una nueva API Key
3. Copia la key generada

### 2. Configurar el servidor

El servidor se configura automáticamente cuando usas la herramienta `set_postman_api_key`.

## 🛠️ Herramientas Disponibles

### Autenticación
- `set_postman_api_key`: Configurar la API Key de Postman

### Endpoints y Collections
- `create_endpoint`: Crear un nuevo endpoint/request
- `list_collections`: Listar todas las collections
- `get_collection_details`: Obtener detalles de una collection específica

### Workspaces
- `create_workspace`: Crear un nuevo workspace
- `list_workspaces`: Listar todos los workspaces

### Environments
- `create_environment`: Crear un nuevo environment
- `list_environments`: Listar todos los environments

### Mock Servers
- `create_mock_server`: Crear un mock server

### Documentación
- `create_documentation`: Crear documentación para una collection

## 📖 Ejemplos de Uso

### 1. Configurar API Key

```javascript
// Primero configura tu API Key
{
  "name": "set_postman_api_key",
  "arguments": {
    "apiKey": "tu-api-key-aqui"
  }
}
```

### 2. Crear un Endpoint GET

```javascript
{
  "name": "create_endpoint",
  "arguments": {
    "name": "Obtener Usuarios",
    "method": "GET",
    "url": "https://api.ejemplo.com/usuarios",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer {{token}}"
    },
    "tests": [
      "pm.test('Status code is 200', function () {",
      "    pm.response.to.have.status(200);",
      "});",
      "",
      "pm.test('Response has users array', function () {",
      "    const jsonData = pm.response.json();",
      "    pm.expect(jsonData).to.have.property('usuarios');",
      "    pm.expect(jsonData.usuarios).to.be.an('array');",
      "});"
    ]
  }
}
```

### 3. Crear un Endpoint POST con Body

```javascript
{
  "name": "create_endpoint",
  "arguments": {
    "name": "Crear Usuario",
    "method": "POST",
    "url": "https://api.ejemplo.com/usuarios",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "mode": "raw",
      "raw": "{\n  \"nombre\": \"Juan Pérez\",\n  \"email\": \"juan@ejemplo.com\",\n  \"edad\": 30\n}"
    },
    "auth": {
      "type": "bearer",
      "bearer": [
        {
          "key": "token",
          "value": "{{auth_token}}",
          "type": "string"
        }
      ]
    },
    "prerequest": [
      "// Generar token de autenticación",
      "const token = pm.environment.get('auth_token');",
      "if (!token) {",
      "    console.log('Token no encontrado en environment');",
      "}"
    ],
    "tests": [
      "pm.test('Status code is 201', function () {",
      "    pm.response.to.have.status(201);",
      "});",
      "",
      "pm.test('Response contains user data', function () {",
      "    const jsonData = pm.response.json();",
      "    pm.expect(jsonData).to.have.property('id');",
      "    pm.expect(jsonData).to.have.property('nombre');",
      "});"
    ]
  }
}
```

### 4. Crear un Workspace

```javascript
{
  "name": "create_workspace",
  "arguments": {
    "name": "Mi Proyecto API",
    "type": "personal",
    "description": "Workspace para el proyecto de API REST"
  }
}
```

### 5. Crear un Environment

```javascript
{
  "name": "create_environment",
  "arguments": {
    "name": "Desarrollo",
    "values": [
      {
        "key": "base_url",
        "value": "https://api-dev.ejemplo.com",
        "enabled": true
      },
      {
        "key": "auth_token",
        "value": "dev-token-123",
        "enabled": true
      },
      {
        "key": "api_version",
        "value": "v1",
        "enabled": true
      }
    ]
  }
}
```

### 6. Crear un Mock Server

```javascript
{
  "name": "create_mock_server",
  "arguments": {
    "name": "Mock API Usuarios",
    "collectionId": "collection-id-aqui",
    "environmentId": "environment-id-aqui"
  }
}
```

### 7. Crear Documentación

```javascript
{
  "name": "create_documentation",
  "arguments": {
    "name": "API Usuarios - Documentación",
    "collectionId": "collection-id-aqui",
    "content": "# API de Usuarios\n\nEsta API permite gestionar usuarios del sistema.\n\n## Endpoints Disponibles\n\n- GET /usuarios - Obtener lista de usuarios\n- POST /usuarios - Crear nuevo usuario\n- PUT /usuarios/{id} - Actualizar usuario\n- DELETE /usuarios/{id} - Eliminar usuario\n\n## Autenticación\n\nTodos los endpoints requieren autenticación Bearer Token."
  }
}
```

## 🔍 Listar Recursos

### Listar Collections
```javascript
{
  "name": "list_collections"
}
```

### Listar Workspaces
```javascript
{
  "name": "list_workspaces"
}
```

### Listar Environments
```javascript
{
  "name": "list_environments"
}
```

### Obtener Detalles de Collection
```javascript
{
  "name": "get_collection_details",
  "arguments": {
    "collectionId": "collection-id-aqui"
  }
}
```

## 🎯 Tipos de Autenticación Soportados

- **No Auth**: Sin autenticación
- **API Key**: Clave de API
- **AWS v4**: Autenticación AWS
- **Basic Auth**: Autenticación básica
- **Bearer Token**: Token Bearer
- **Digest Auth**: Autenticación Digest
- **OAuth 1.0**: OAuth 1.0
- **OAuth 2.0**: OAuth 2.0
- **NTLM**: Autenticación NTLM

## 📝 Tipos de Body Soportados

- **Raw**: JSON, XML, texto plano
- **URL Encoded**: Datos de formulario
- **Form Data**: Datos multipart
- **File**: Archivos
- **GraphQL**: Consultas GraphQL

## 🚨 Manejo de Errores

El servidor incluye validación completa con Zod y manejo de errores de la API de Postman. Los errores se devuelven con mensajes descriptivos para facilitar la depuración.

## 📚 Scripts de Test

Puedes agregar scripts de test en JavaScript que se ejecutarán después de cada request:

```javascript
"tests": [
  "pm.test('Status code is 200', function () {",
  "    pm.response.to.have.status(200);",
  "});",
  "",
  "pm.test('Response time is less than 2000ms', function () {",
  "    pm.expect(pm.response.responseTime).to.be.below(2000);",
  "});",
  "",
  "pm.test('Response has required fields', function () {",
  "    const jsonData = pm.response.json();",
  "    pm.expect(jsonData).to.have.property('data');",
  "    pm.expect(jsonData).to.have.property('status');",
  "});"
]
```

## 🔧 Scripts de Pre-request

Scripts que se ejecutan antes de cada request:

```javascript
"prerequest": [
  "// Generar timestamp",
  "const timestamp = new Date().toISOString();",
  "pm.environment.set('timestamp', timestamp);",
  "",
  "// Generar token de autenticación",
  "const token = pm.environment.get('auth_token');",
  "if (!token) {",
  "    console.log('Warning: No auth token found');",
  "}"
]
```

## 📄 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

## 📞 Soporte

Si tienes problemas o preguntas, por favor abre un issue en el repositorio.
