import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

// Configuración del servidor MCP
const server = new Server({
    name: "postman-mcp-server",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    }
});

// Configuración de Postman API
const POSTMAN_API_BASE = "https://api.getpostman.com";
let postmanApiKey = "";

// Función auxiliar para hacer requests a Postman API
async function makePostmanRequest(endpoint: string, method: string = "GET", data?: any) {
    if (!postmanApiKey) {
        throw new Error("API Key de Postman no configurada. Usa 'set_postman_api_key' primero.");
    }

    try {
        const response = await axios({
            method,
            url: `${POSTMAN_API_BASE}${endpoint}`,
            headers: {
                "X-API-Key": postmanApiKey,
                "Content-Type": "application/json"
            },
            data
        });
        return response.data;
    } catch (error: any) {
        throw new Error(`Error en Postman API: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Herramientas del servidor MCP
server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === "set_postman_api_key") {
        const { apiKey } = args as { apiKey: string };
        if (!apiKey) {
            throw new Error("API Key es requerida");
        }
        postmanApiKey = apiKey;
        
        return {
            content: [{
                type: "text",
                text: "✅ API Key de Postman configurada correctamente"
            }]
        };
    }

    // Crear endpoint/request
    if (name === "create_endpoint") {
        const endpointData = args as any;
        
        if (!endpointData.name || !endpointData.method || !endpointData.url) {
            throw new Error("name, method y url son requeridos");
        }
        
        const requestData = {
            name: endpointData.name,
            request: {
                method: endpointData.method,
                url: endpointData.url,
                header: endpointData.headers ? Object.entries(endpointData.headers).map(([key, value]) => ({
                    key,
                    value,
                    type: "text"
                })) : [],
                body: endpointData.body ? {
                    mode: endpointData.body.mode || "raw",
                    raw: endpointData.body.raw || "",
                    urlencoded: endpointData.body.urlencoded || [],
                    formdata: endpointData.body.formdata || []
                } : undefined,
                auth: endpointData.auth ? {
                    type: endpointData.auth.type,
                    ...(endpointData.auth.apikey && { apikey: endpointData.auth.apikey }),
                    ...(endpointData.auth.basic && { basic: endpointData.auth.basic }),
                    ...(endpointData.auth.bearer && { bearer: endpointData.auth.bearer })
                } : undefined
            },
            event: [
                ...(endpointData.prerequest ? [{
                    listen: "prerequest",
                    script: {
                        type: "text/javascript",
                        exec: endpointData.prerequest
                    }
                }] : []),
                ...(endpointData.tests ? [{
                    listen: "test",
                    script: {
                        type: "text/javascript",
                        exec: endpointData.tests
                    }
                }] : [])
            ]
        };

        const result = await makePostmanRequest("/collections", "POST", {
            collection: requestData
        });

        return {
            content: [{
                type: "text",
                text: `✅ Endpoint creado exitosamente:\n${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    // Crear workspace
    if (name === "create_workspace") {
        const workspaceData = args as any;
        
        if (!workspaceData.name) {
            throw new Error("name es requerido");
        }
        
        const result = await makePostmanRequest("/workspaces", "POST", {
            workspace: {
                name: workspaceData.name,
                type: workspaceData.type || "personal",
                description: workspaceData.description || ""
            }
        });

        return {
            content: [{
                type: "text",
                text: `✅ Workspace creado exitosamente:\n${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    // Crear environment
    if (name === "create_environment") {
        const envData = args as any;
        
        if (!envData.name) {
            throw new Error("name es requerido");
        }
        
        const result = await makePostmanRequest("/environments", "POST", {
            environment: {
                name: envData.name,
                values: envData.values || []
            }
        });

        return {
            content: [{
                type: "text",
                text: `✅ Environment creado exitosamente:\n${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    // Crear mock server
    if (name === "create_mock_server") {
        const mockData = args as any;
        
        if (!mockData.name || !mockData.collectionId) {
            throw new Error("name y collectionId son requeridos");
        }
        
        const result = await makePostmanRequest("/mocks", "POST", {
            mock: {
                name: mockData.name,
                collection: mockData.collectionId,
                environment: mockData.environmentId
            }
        });

        return {
            content: [{
                type: "text",
                text: `✅ Mock server creado exitosamente:\n${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    // Crear documentación
    if (name === "create_documentation") {
        const docData = args as any;
        
        if (!docData.name || !docData.collectionId) {
            throw new Error("name y collectionId son requeridos");
        }
        
        const result = await makePostmanRequest("/collections", "POST", {
            collection: {
                name: docData.name,
                info: {
                    name: docData.name,
                    description: docData.content || "",
                    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
                }
            }
        });

        return {
            content: [{
                type: "text",
                text: `✅ Documentación creada exitosamente:\n${JSON.stringify(result, null, 2)}`
            }]
        };
    }

    // Listar collections
    if (name === "list_collections") {
        const result = await makePostmanRequest("/collections");
        
        return {
            content: [{
                type: "text",
                text: `📋 Collections disponibles:\n${JSON.stringify(result.collections, null, 2)}`
            }]
        };
    }

    // Listar workspaces
    if (name === "list_workspaces") {
        const result = await makePostmanRequest("/workspaces");
        
        return {
            content: [{
                type: "text",
                text: `🏢 Workspaces disponibles:\n${JSON.stringify(result.workspaces, null, 2)}`
            }]
        };
    }

    // Listar environments
    if (name === "list_environments") {
        const result = await makePostmanRequest("/environments");
        
        return {
            content: [{
                type: "text",
                text: `🌍 Environments disponibles:\n${JSON.stringify(result.environments, null, 2)}`
            }]
        };
    }

    // Obtener detalles de una collection
    if (name === "get_collection_details") {
        const { collectionId } = args as { collectionId: string };
        
        if (!collectionId) {
            throw new Error("collectionId es requerido");
        }
        
        const result = await makePostmanRequest(`/collections/${collectionId}`);
        
        return {
            content: [{
                type: "text",
                text: `📄 Detalles de la collection:\n${JSON.stringify(result.collection, null, 2)}`
            }]
        };
    }

    throw new Error(`Herramienta no encontrada: ${name}`);
});

// Registrar las herramientas disponibles
server.setRequestHandler("tools/list", async () => {
    return {
        tools: [
            {
                name: "set_postman_api_key",
                description: "Configurar la API Key de Postman para autenticación",
                inputSchema: {
                    type: "object",
                    properties: {
                        apiKey: {
                            type: "string",
                            description: "API Key de Postman obtenida desde https://web.postman.co/settings/me/api-keys"
                        }
                    },
                    required: ["apiKey"]
                }
            },
            {
                name: "create_endpoint",
                description: "Crear un nuevo endpoint/request en Postman con todos los métodos HTTP",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nombre del endpoint" },
                        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] },
                        url: { type: "string", description: "URL del endpoint" },
                        headers: { type: "object", description: "Headers del request" },
                        body: { type: "object", description: "Cuerpo del request" },
                        auth: { type: "object", description: "Configuración de autenticación" },
                        tests: { type: "array", items: { type: "string" }, description: "Scripts de test" },
                        prerequest: { type: "array", items: { type: "string" }, description: "Scripts de pre-request" }
                    },
                    required: ["name", "method", "url"]
                }
            },
            {
                name: "create_workspace",
                description: "Crear un nuevo workspace en Postman",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nombre del workspace" },
                        type: { type: "string", enum: ["personal", "team"], description: "Tipo de workspace" },
                        description: { type: "string", description: "Descripción del workspace" }
                    },
                    required: ["name"]
                }
            },
            {
                name: "create_environment",
                description: "Crear un nuevo environment en Postman",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nombre del environment" },
                        values: { 
                            type: "array", 
                            items: {
                                type: "object",
                                properties: {
                                    key: { type: "string" },
                                    value: { type: "string" },
                                    enabled: { type: "boolean" }
                                }
                            },
                            description: "Variables del environment"
                        }
                    },
                    required: ["name"]
                }
            },
            {
                name: "create_mock_server",
                description: "Crear un mock server en Postman",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nombre del mock server" },
                        collectionId: { type: "string", description: "ID de la collection" },
                        environmentId: { type: "string", description: "ID del environment (opcional)" }
                    },
                    required: ["name", "collectionId"]
                }
            },
            {
                name: "create_documentation",
                description: "Crear documentación para una collection",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nombre de la documentación" },
                        collectionId: { type: "string", description: "ID de la collection" },
                        content: { type: "string", description: "Contenido de la documentación" }
                    },
                    required: ["name", "collectionId"]
                }
            },
            {
                name: "list_collections",
                description: "Listar todas las collections disponibles",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "list_workspaces",
                description: "Listar todos los workspaces disponibles",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "list_environments",
                description: "Listar todos los environments disponibles",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "get_collection_details",
                description: "Obtener detalles de una collection específica",
                inputSchema: {
                    type: "object",
                    properties: {
                        collectionId: { type: "string", description: "ID de la collection" }
                    },
                    required: ["collectionId"]
                }
            }
        ]
    };
});

// Iniciar el servidor
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Postman MCP Server iniciado correctamente");
}

main().catch(console.error);
