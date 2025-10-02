import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// newman será importado dinámicamente para evitar problemas de tipos en TS
type NewmanModule = typeof import("newman");
let newmanModulePromise: Promise<NewmanModule> | null = null;
async function getNewman(): Promise<NewmanModule> {
  if (!newmanModulePromise) {
    newmanModulePromise = import("newman") as unknown as Promise<NewmanModule>;
  }
  return newmanModulePromise;
}

// =====================
// Config del servidor
// =====================
const server = new Server(
  { name: "postman-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// =====================
// Postman API
// =====================
const POSTMAN_API_BASE = "https://api.getpostman.com";
let postmanApiKey: string = process.env.POSTMAN_API_KEY ?? "";

// Cache simple en memoria de resultados de ejecuciones
const lastRunSummaries: Map<string, any> = new Map();

async function makePostmanRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  data?: any
) {
  if (!postmanApiKey) {
    throw new Error("API Key de Postman no configurada. Usa 'set_postman_api_key' primero.");
  }
  try {
    const resp = await axios({
      method,
      url: `${POSTMAN_API_BASE}${endpoint}`,
      headers: {
        "X-Api-Key": postmanApiKey, // <- correcto
        "Content-Type": "application/json",
      },
      data,
    });
    return resp.data;
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || "Error desconocido";
    throw new Error(`Error en Postman API: ${msg}`);
  }
}

// =====================
// tools/list
// =====================
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
              description: "API Key de Postman (https://web.postman.co/settings/me/api-keys)",
            },
          },
          required: ["apiKey"],
        },
      },
      {
        name: "run_collection",
        description: "Ejecuta una collection de Postman con Newman y devuelve resultados y métricas",
        inputSchema: {
          type: "object",
          properties: {
            collectionId: { type: "string" },
            environmentId: { type: "string" },
            folder: { type: "string", description: "Nombre de carpeta o item a ejecutar" },
            timeout: { type: "number" },
            iterationCount: { type: "number" }
          },
          required: ["collectionId"],
        },
      },
      {
        name: "run_request",
        description: "Ejecuta un request individual dentro de una collection (por nombre) usando Newman",
        inputSchema: {
          type: "object",
          properties: {
            collectionId: { type: "string" },
            itemName: { type: "string", description: "Nombre exacto del request a ejecutar" },
            environmentId: { type: "string" },
            timeout: { type: "number" }
          },
          required: ["collectionId", "itemName"],
        },
      },
      {
        name: "get_last_run_results",
        description: "Obtiene los resultados crudos (summary) de la última ejecución de una collection/opción",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "Clave de ejecución (auto-generada por run_collection/run_request)" }
          },
          required: ["key"],
        },
      },
      {
        name: "get_last_run_metrics",
        description: "Obtiene métricas resumidas de la última ejecución (totales, fallos, tiempos)",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" }
          },
          required: ["key"],
        },
      },
      {
        name: "create_endpoint",
        description: "Crear un nuevo endpoint/request (crea una collection mínima con un item)",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] },
            url: { type: "string" },
            headers: { type: "object", additionalProperties: { type: "string" } },
            body: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["raw", "urlencoded", "formdata"] },
                raw: { type: "string" },
                urlencoded: { type: "array", items: { type: "object" } },
                formdata: { type: "array", items: { type: "object" } },
              },
            },
            auth: { type: "object" },
            tests: { type: "array", items: { type: "string" } },
            prerequest: { type: "array", items: { type: "string" } },
          },
          required: ["name", "method", "url"],
        },
      },
      {
        name: "create_workspace",
        description: "Crear un workspace",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["personal", "team"] },
            description: { type: "string" },
          },
          required: ["name"],
        },
      },
      {
        name: "create_environment",
        description: "Crear un environment",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            values: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  value: { type: "string" },
                  enabled: { type: "boolean" },
                },
                required: ["key", "value"],
              },
            },
          },
          required: ["name"],
        },
      },
      {
        name: "create_mock_server",
        description: "Crear un mock server",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            collectionId: { type: "string" },
            environmentId: { type: "string" },
          },
          required: ["name", "collectionId"],
        },
      },
      {
        name: "create_documentation",
        description: "Crear una collection vacía con descripción (modo documentación rápida)",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            collectionId: { type: "string" }, // lo mantenemos aunque en esta versión no lo usemos
            content: { type: "string" },
          },
          required: ["name", "collectionId"],
        },
      },
      {
        name: "list_collections",
        description: "Listar colecciones",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_workspaces",
        description: "Listar workspaces",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_environments",
        description: "Listar environments",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_collection_details",
        description: "Obtener detalles de una collection",
        inputSchema: {
          type: "object",
          properties: { collectionId: { type: "string" } },
          required: ["collectionId"],
        },
      },
      {
        name: "update_collection",
        description: "Actualizar metadata o items de una collection existente (PUT /collections/:id)",
        inputSchema: {
          type: "object",
          properties: {
            collectionId: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
          },
          required: ["collectionId"],
        },
      },
      {
        name: "delete_collection",
        description: "Eliminar una collection por ID (DELETE /collections/:id)",
        inputSchema: {
          type: "object",
          properties: { collectionId: { type: "string" } },
          required: ["collectionId"],
        },
      },
      {
        name: "add_request_to_collection",
        description: "Agregar un request (item) a una collection existente",
        inputSchema: {
          type: "object",
          properties: {
            collectionId: { type: "string" },
            name: { type: "string" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] },
            url: { type: "string" },
            headers: { type: "object", additionalProperties: { type: "string" } },
            body: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["raw", "urlencoded", "formdata"] },
                raw: { type: "string" },
                urlencoded: { type: "array", items: { type: "object" } },
                formdata: { type: "array", items: { type: "object" } },
              },
            },
            auth: { type: "object" },
            tests: { type: "array", items: { type: "string" } },
            prerequest: { type: "array", items: { type: "string" } },
          },
          required: ["collectionId", "name", "method", "url"],
        },
      },
    ],
  };
});

// =====================
// tools/call
// =====================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Set API key
  if (name === "set_postman_api_key") {
    const { apiKey } = (args ?? {}) as { apiKey?: string };
    if (!apiKey) throw new Error("API Key es requerida");
    postmanApiKey = apiKey;
    return { content: [{ type: "text", text: "✅ API Key de Postman configurada correctamente" }] };
  }

  // Helpers para ejecuciones con Newman
  async function fetchCollection(collectionId: string) {
    const result = await makePostmanRequest(`/collections/${collectionId}`, "GET");
    return result.collection;
  }
  async function fetchEnvironment(environmentId?: string) {
    if (!environmentId) return undefined;
    const result = await makePostmanRequest(`/environments/${environmentId}`, "GET");
    return result.environment;
  }
  function buildRunKey(input: Record<string, any>): string {
    const base = JSON.stringify(input);
    // clave corta y estable
    let hash = 0;
    for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) | 0;
    return `run_${Math.abs(hash)}`;
  }

  if (name === "run_collection") {
    const { collectionId, environmentId, folder, timeout = 60000, iterationCount = 1 } = (args ?? {}) as {
      collectionId?: string; environmentId?: string; folder?: string; timeout?: number; iterationCount?: number;
    };
    if (!collectionId) throw new Error("collectionId es requerido");

    const [collection, environment] = await Promise.all([
      fetchCollection(collectionId),
      fetchEnvironment(environmentId),
    ]);

    const newman = await getNewman();
    const runKey = buildRunKey({ collectionId, environmentId, folder, iterationCount });

    const summary: any = await new Promise((resolve, reject) => {
      newman.run(
        {
          collection,
          environment,
          folder,
          timeout,
          iterationCount,
          reporters: [],
          reporter: {},
          color: false,
          insecure: true,
        },
        (err: any, sum: any) => {
          if (err) return reject(err);
          resolve(sum);
        }
      );
    });

    lastRunSummaries.set(runKey, summary);

    const stats = summary.run?.stats ?? {};
    const timings = summary.run?.timings ?? {};
    const failures = summary.run?.failures ?? [];
    const metrics = {
      assertions: stats.assertions ?? {},
      iterations: stats.iterations ?? {},
      requests: stats.requests ?? {},
      testScripts: stats.tests ?? stats.testScripts ?? {},
      transfers: stats.transfers ?? {},
      timings: {
        started: timings.started,
        completed: timings.completed,
        responseAverage: summary.run?.timings?.responseAverage,
      },
      failuresCount: Array.isArray(failures) ? failures.length : 0,
    };

    return {
      content: [
        {
          type: "text",
          text: `✅ Ejecución completada (key=${runKey})\n` +
            `Requests: ${metrics.requests?.total ?? 0}, Assertions: ${metrics.assertions?.total ?? 0}, Fallos: ${metrics.failuresCount}`,
        },
        { type: "text", text: JSON.stringify({ key: runKey, metrics }, null, 2) },
      ],
    };
  }

  if (name === "run_request") {
    const { collectionId, itemName, environmentId, timeout = 60000 } = (args ?? {}) as {
      collectionId?: string; itemName?: string; environmentId?: string; timeout?: number;
    };
    if (!collectionId || !itemName) throw new Error("collectionId y itemName son requeridos");

    const [collection, environment] = await Promise.all([
      fetchCollection(collectionId),
      fetchEnvironment(environmentId),
    ]);

    const newman = await getNewman();
    const runKey = buildRunKey({ collectionId, environmentId, itemName });

    const summary: any = await new Promise((resolve, reject) => {
      newman.run(
        {
          collection,
          environment,
          folder: itemName, // Ejecuta solo el item/carpeta con este nombre
          timeout,
          reporters: [],
          reporter: {},
          color: false,
          insecure: true,
        },
        (err: any, sum: any) => {
          if (err) return reject(err);
          resolve(sum);
        }
      );
    });

    lastRunSummaries.set(runKey, summary);
    const failures = summary.run?.failures ?? [];
    const firstItem = summary.run?.executions?.[0]?.item?.name ?? itemName;
    return {
      content: [
        { type: "text", text: `✅ Request ejecutado: ${firstItem} (key=${runKey})` },
        { type: "text", text: `Fallos: ${Array.isArray(failures) ? failures.length : 0}` },
      ],
    };
  }

  if (name === "get_last_run_results") {
    const { key } = (args ?? {}) as { key?: string };
    if (!key) throw new Error("key es requerido");
    if (!lastRunSummaries.has(key)) throw new Error("No hay resultados para la clave indicada");
    const summary = lastRunSummaries.get(key);
    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }

  if (name === "get_last_run_metrics") {
    const { key } = (args ?? {}) as { key?: string };
    if (!key) throw new Error("key es requerido");
    if (!lastRunSummaries.has(key)) throw new Error("No hay resultados para la clave indicada");
    const summary = lastRunSummaries.get(key);
    const stats = summary.run?.stats ?? {};
    const timings = summary.run?.timings ?? {};
    const failures = summary.run?.failures ?? [];
    const metrics = {
      assertions: stats.assertions ?? {},
      iterations: stats.iterations ?? {},
      requests: stats.requests ?? {},
      testScripts: stats.tests ?? stats.testScripts ?? {},
      transfers: stats.transfers ?? {},
      timings: {
        started: timings.started,
        completed: timings.completed,
        responseAverage: summary.run?.timings?.responseAverage,
      },
      failuresCount: Array.isArray(failures) ? failures.length : 0,
    };
    return { content: [{ type: "text", text: JSON.stringify(metrics, null, 2) }] };
  }

  // Crear endpoint (collection mínima con un item)
  if (name === "create_endpoint") {
    const endpointData = (args ?? {}) as any;
    if (!endpointData.name || !endpointData.method || !endpointData.url) {
      throw new Error("name, method y url son requeridos");
    }

    const payload = {
      collection: {
        info: {
          name: endpointData.name,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: endpointData.name,
            request: {
              method: endpointData.method,
              url: endpointData.url,
              header: endpointData.headers
                ? Object.entries(endpointData.headers).map(([key, value]) => ({
                    key,
                    value,
                    type: "text",
                  }))
                : [],
              body: endpointData.body
                ? {
                    mode: endpointData.body.mode || "raw",
                    raw: endpointData.body.raw ?? "",
                    urlencoded: endpointData.body.urlencoded ?? [],
                    formdata: endpointData.body.formdata ?? [],
                  }
                : undefined,
              auth: endpointData.auth
                ? {
                    type: endpointData.auth.type,
                    ...(endpointData.auth.apikey && { apikey: endpointData.auth.apikey }),
                    ...(endpointData.auth.basic && { basic: endpointData.auth.basic }),
                    ...(endpointData.auth.bearer && { bearer: endpointData.auth.bearer }),
                  }
                : undefined,
            },
            event: [
              ...(endpointData.prerequest
                ? [{ listen: "prerequest", script: { type: "text/javascript", exec: endpointData.prerequest } }]
                : []),
              ...(endpointData.tests
                ? [{ listen: "test", script: { type: "text/javascript", exec: endpointData.tests } }]
                : []),
            ],
          },
        ],
      },
    };

    const result = await makePostmanRequest("/collections", "POST", payload);
    return { content: [{ type: "text", text: `✅ Endpoint/Collection creada:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "create_workspace") {
    const { name: wname, type = "personal", description = "" } = (args ?? {}) as {
      name?: string;
      type?: "personal" | "team";
      description?: string;
    };
    if (!wname) throw new Error("name es requerido");
    const result = await makePostmanRequest("/workspaces", "POST", {
      workspace: { name: wname, type, description },
    });
    return { content: [{ type: "text", text: `✅ Workspace creado:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "create_environment") {
    const { name: ename, values = [] } = (args ?? {}) as { name?: string; values?: any[] };
    if (!ename) throw new Error("name es requerido");
    const result = await makePostmanRequest("/environments", "POST", {
      environment: { name: ename, values },
    });
    return { content: [{ type: "text", text: `✅ Environment creado:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "create_mock_server") {
    const { name: mname, collectionId, environmentId } = (args ?? {}) as {
      name?: string;
      collectionId?: string;
      environmentId?: string;
    };
    if (!mname || !collectionId) throw new Error("name y collectionId son requeridos");
    const result = await makePostmanRequest("/mocks", "POST", {
      mock: { name: mname, collection: collectionId, environment: environmentId },
    });
    return { content: [{ type: "text", text: `✅ Mock server creado:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "create_documentation") {
    const { name: dname, /* collectionId, */ content = "" } = (args ?? {}) as {
      name?: string;
      collectionId?: string;
      content?: string;
    };
    if (!dname) throw new Error("name es requerido");
    const payload = {
      collection: {
        info: {
          name: dname,
          description: content,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [],
      },
    };
    const result = await makePostmanRequest("/collections", "POST", payload);
    return { content: [{ type: "text", text: `✅ Documentación creada:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "list_collections") {
    const result = await makePostmanRequest("/collections", "GET");
    return {
      content: [{ type: "text", text: `📋 Collections:\n${JSON.stringify(result.collections ?? [], null, 2)}` }],
    };
  }

  if (name === "list_workspaces") {
    const result = await makePostmanRequest("/workspaces", "GET");
    return {
      content: [{ type: "text", text: `🏢 Workspaces:\n${JSON.stringify(result.workspaces ?? [], null, 2)}` }],
    };
  }

  if (name === "list_environments") {
    const result = await makePostmanRequest("/environments", "GET");
    return {
      content: [{ type: "text", text: `🌍 Environments:\n${JSON.stringify(result.environments ?? [], null, 2)}` }],
    };
  }

  if (name === "get_collection_details") {
    const { collectionId } = (args ?? {}) as { collectionId?: string };
    if (!collectionId) throw new Error("collectionId es requerido");
    const result = await makePostmanRequest(`/collections/${collectionId}`, "GET");
    return {
      content: [{ type: "text", text: `📄 Collection:\n${JSON.stringify(result.collection ?? {}, null, 2)}` }],
    };
  }

  if (name === "update_collection") {
    const { collectionId, name: newName, description } = (args ?? {}) as {
      collectionId?: string; name?: string; description?: string;
    };
    if (!collectionId) throw new Error("collectionId es requerido");

    const current = await makePostmanRequest(`/collections/${collectionId}`, "GET");
    const collection = current.collection ?? {};
    if (newName) collection.info = { ...(collection.info ?? {}), name: newName };
    if (description !== undefined) {
      collection.info = { ...(collection.info ?? {}), description };
    }

    const payload = { collection };
    const result = await makePostmanRequest(`/collections/${collectionId}`, "PUT", payload);
    return { content: [{ type: "text", text: `✅ Collection actualizada:\n${JSON.stringify(result, null, 2)}` }] };
  }

  if (name === "delete_collection") {
    const { collectionId } = (args ?? {}) as { collectionId?: string };
    if (!collectionId) throw new Error("collectionId es requerido");
    await makePostmanRequest(`/collections/${collectionId}`, "DELETE");
    return { content: [{ type: "text", text: "🗑️ Collection eliminada correctamente" }] };
  }

  if (name === "add_request_to_collection") {
    const input = (args ?? {}) as any;
    const { collectionId } = input as { collectionId?: string };
    if (!collectionId) throw new Error("collectionId es requerido");

    const current = await makePostmanRequest(`/collections/${collectionId}`, "GET");
    const collection = current.collection ?? {};
    const items = Array.isArray(collection.item) ? collection.item : [];

    const newItem = {
      name: input.name,
      request: {
        method: input.method,
        url: input.url,
        header: input.headers
          ? Object.entries(input.headers).map(([key, value]) => ({ key, value, type: "text" }))
          : [],
        body: input.body
          ? {
              mode: input.body.mode || "raw",
              raw: input.body.raw ?? "",
              urlencoded: input.body.urlencoded ?? [],
              formdata: input.body.formdata ?? [],
            }
          : undefined,
        auth: input.auth
          ? {
              type: input.auth.type,
              ...(input.auth.apikey && { apikey: input.auth.apikey }),
              ...(input.auth.basic && { basic: input.auth.basic }),
              ...(input.auth.bearer && { bearer: input.auth.bearer }),
            }
          : undefined,
      },
      event: [
        ...(input.prerequest
          ? [{ listen: "prerequest", script: { type: "text/javascript", exec: input.prerequest } }]
          : []),
        ...(input.tests
          ? [{ listen: "test", script: { type: "text/javascript", exec: input.tests } }]
          : []),
      ],
    };

    const updated = {
      collection: {
        ...collection,
        item: [...items, newItem],
      },
    };

    const result = await makePostmanRequest(`/collections/${collectionId}`, "PUT", updated);
    return { content: [{ type: "text", text: `✅ Item agregado a collection:\n${JSON.stringify(result, null, 2)}` }] };
  }

  throw new Error(`Herramienta no encontrada: ${name}`);
});

// =====================
// Start (STDIO)
// =====================
await server.connect(new StdioServerTransport());
console.error("🚀 Postman MCP Server iniciado correctamente");