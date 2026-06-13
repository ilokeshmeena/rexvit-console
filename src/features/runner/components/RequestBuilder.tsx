import {
  Code2,
  Copy,
  Download,
  KeyRound,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Tabs } from "../../../components/ui/tabs";
import { UserAgentSettings } from "./UserAgentSettings";
import { ServerSelector } from "./ServerSelector";
import type {
  ApiRequest,
  HeaderPair,
  HttpMethod,
  QueryPair,
} from "../../../shared/types/http";
import type {
  AuthProfile,
  AuthType,
  EnvironmentVariable,
  RequestTemplate,
} from "../../../shared/types/persistence";
import { resolveVariables, useAppDataStore } from "../../app-data/appDataStore";
import type { OpenApiParameter } from "../../openapi/types";
import { useOpenApiStore } from "../../openapi/openapiStore";
import { useServerStore } from "../../openapi/serverStore";
import {
  buildRequestUrl,
  getDefaultServerVariables,
  getEffectiveServerUrl,
  findServer,
  type ServerSelection,
} from "../../openapi/serverResolver";
import { applyAuthProfile } from "../auth";
import { generateCode, type CodeLanguage } from "../codegen";
import { exportCurl, importCurl } from "../curl";
import { executeRequest } from "../api";
import { useRunnerStore } from "../runnerStore";
import { buildLiveRequestUrl } from "../requestUrl";
import { useRequestWorkspaceStore } from "../requestWorkspaceStore";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const AUTH_TYPES: AuthType[] = ["bearer", "apiKey", "basic", "customHeaders"];
const CODE_LANGUAGES: CodeLanguage[] = [
  "curl",
  "python",
  "node",
  "go",
  "java",
  "kotlin",
];
type RequestTab = "params" | "authorization" | "headers" | "body";
type BodyMode = "json" | "xml" | "formData" | "multipart" | "raw";

export function RequestBuilder() {
  const selectedEndpoint = useOpenApiStore((state) => state.selectedEndpoint());
  const selectedVersion = useOpenApiStore((state) => state.selectedVersion());
  const selectedService = useOpenApiStore((state) => {
    const endpoint = state.selectedEndpoint();
    return state.services.find((s) => s.id === endpoint?.serviceId) ?? null;
  });
  const selectedEnvironmentId = useRunnerStore(
    (state) => state.selectedEnvironmentId,
  );
  const {
    request,
    patchRequest,
    isRunning,
    setIsRunning,
    setResponse,
    updateHeader,
    addHeader,
    removeHeader,
    updateQueryParam,
    addQueryParam,
    removeQueryParam,
  } = useRunnerStore();
  const loadServerSelections = useServerStore((state) => state.loadSelections);
  const getServerSelection = useServerStore((state) => state.getSelection);
  const saveServerSelection = useServerStore((state) => state.saveSelection);
  const allVariables = useAppDataStore((state) => state.variables);
  const upsertVariable = useAppDataStore((state) => state.upsertVariable);
  const removeVariable = useAppDataStore((state) => state.removeVariable);
  const recordHistory = useAppDataStore((state) => state.recordHistory);
  const authProfiles = useAppDataStore((state) => state.authProfiles);
  const selectedAuthProfileId = useAppDataStore(
    (state) => state.selectedAuthProfileId,
  );
  const setSelectedAuthProfile = useAppDataStore(
    (state) => state.setSelectedAuthProfile,
  );
  const upsertAuthProfile = useAppDataStore((state) => state.upsertAuthProfile);
  const removeAuthProfile = useAppDataStore((state) => state.removeAuthProfile);
  const getAuthSecret = useAppDataStore((state) => state.getAuthSecret);
  const requestTemplates = useAppDataStore((state) => state.requestTemplates);
  const upsertRequestTemplate = useAppDataStore(
    (state) => state.upsertRequestTemplate,
  );
  const removeRequestTemplate = useAppDataStore(
    (state) => state.removeRequestTemplate,
  );
  const openTabs = useRequestWorkspaceStore((state) => state.openTabs);
  const requests = useRequestWorkspaceStore((state) => state.requests);
  const activeRequestId = useRequestWorkspaceStore(
    (state) => state.activeRequestId,
  );
  const activeRequest = useRequestWorkspaceStore((state) =>
    state.activeRequest(),
  );
  const focusTab = useRequestWorkspaceStore((state) => state.focusTab);
  const closeTab = useRequestWorkspaceStore((state) => state.closeTab);
  const duplicateActiveRequest = useRequestWorkspaceStore(
    (state) => state.duplicateActiveRequest,
  );
  const renameActiveRequest = useRequestWorkspaceStore(
    (state) => state.renameActiveRequest,
  );
  const updateActiveRequest = useRequestWorkspaceStore(
    (state) => state.updateActiveRequest,
  );
  const openAdHocRequest = useRequestWorkspaceStore(
    (state) => state.openAdHocRequest,
  );
  const [curlInput, setCurlInput] = useState("");
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("curl");
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState<RequestTab>("params");
  const [bodyMode, setBodyMode] = useState<BodyMode>("json");
  const [paramSearch, setParamSearch] = useState("");
  const [headerSearch, setHeaderSearch] = useState("");
  const [pathParamValues, setPathParamValues] = useState<
    Record<string, string>
  >({});

  // Server selection state
  const [serverSelection, setServerSelection] = useState<ServerSelection>({
    serviceId: selectedService?.id ?? "",
    versionId: selectedVersion?.id ?? "",
  });
  const selectedAuthProfile =
    authProfiles.find((profile) => profile.id === selectedAuthProfileId) ??
    null;

  const selectedServer = useMemo(
    () =>
      serverSelection.selectedServerUrl
        ? findServer(
            selectedVersion?.servers,
            serverSelection.selectedServerUrl,
          )
        : selectedVersion?.servers?.[0],
    [selectedVersion?.servers, serverSelection.selectedServerUrl],
  );

  const effectiveServerUrl = useMemo(
    () =>
      getEffectiveServerUrl(
        selectedServer,
        serverSelection.serverVariables || {},
        serverSelection.customOverride,
      ),
    [
      selectedServer,
      serverSelection.serverVariables,
      serverSelection.customOverride,
    ],
  );
  const finalUrl = useMemo(() => {
    return buildLiveRequestUrl({
      baseUrl:
        selectedEndpoint && effectiveServerUrl
          ? effectiveServerUrl
          : request.url,
      path: selectedEndpoint?.path,
      pathParams: pathParamValues,
      queryParams: request.queryParams,
    });
  }, [
    effectiveServerUrl,
    pathParamValues,
    request.queryParams,
    request.url,
    selectedEndpoint,
  ]);
  const endpointParameters = selectedEndpoint?.parameters ?? [];
  const pathParameters = endpointParameters.filter(
    (parameter) => parameter.in === "path",
  );
  const authStatus = selectedAuthProfile ? "Configured" : "No auth";
  const isOpenApiMode = Boolean(selectedEndpoint);
  const requiredQueryParams = endpointParameters.filter(
    (parameter) => parameter.in === "query" && parameter.required,
  );
  const headerParameters = endpointParameters.filter(
    (parameter) => parameter.in === "header",
  );
  const requiredHeaderParams = headerParameters.filter(
    (parameter) => parameter.required,
  );

  const variables = useMemo(
    () =>
      allVariables.filter(
        (variable) =>
          variable.environmentId === selectedEnvironmentId &&
          variable.enabled &&
          variable.key.trim(),
      ),
    [allVariables, selectedEnvironmentId],
  );
  const environmentVariables = useMemo(
    () =>
      allVariables.filter(
        (variable) => variable.environmentId === selectedEnvironmentId,
      ),
    [allVariables, selectedEnvironmentId],
  );

  const run = useCallback(async () => {
    setIsRunning(true);
    try {
      // Build final URL from server selection and endpoint
      const finalUrl = buildLiveRequestUrl({
        baseUrl:
          selectedEndpoint && effectiveServerUrl
            ? effectiveServerUrl
            : request.url,
        path: selectedEndpoint?.path,
        pathParams: pathParamValues,
        queryParams: request.queryParams,
      });

      const requestWithUrl = { ...request, url: finalUrl, queryParams: [] };
      const resolvedRequest = resolveRequestVariables(
        requestWithUrl,
        variables,
      );
      const authenticatedRequest = await applyAuthProfile(
        resolvedRequest,
        selectedAuthProfile,
        getAuthSecret,
      );
      const response = await executeRequest(authenticatedRequest);
      setResponse(response);
      const snapshot =
        useRequestWorkspaceStore.getState().activeRequest() ?? undefined;
      await recordHistory({
        endpointId: selectedEndpoint?.id,
        request: authenticatedRequest,
        response,
        snapshot,
      });
      if (snapshot) updateActiveRequest({ dirty: false });
    } catch (error) {
      const body = error instanceof Error ? error.message : "Request failed";
      setResponse({
        status: 0,
        statusText: "Runner error",
        headers: {},
        contentType: "text/plain",
        body,
        bodyEncoding: "text",
        sizeBytes: body.length,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [
    getAuthSecret,
    recordHistory,
    request,
    selectedAuthProfile,
    selectedEndpoint,
    effectiveServerUrl,
    pathParamValues,
    variables,
    setIsRunning,
    setResponse,
  ]);
  useEffect(() => {
    window.addEventListener("rexvit:run-request", run);
    return () => window.removeEventListener("rexvit:run-request", run);
  }, [run]);

  useEffect(() => {
    if (!selectedEndpoint) return;
    const savedTab = window.localStorage.getItem(
      `rexvit.requestTab.${selectedEndpoint.id}`,
    ) as RequestTab | null;
    setActiveTab(
      savedTab &&
        ["params", "authorization", "headers", "body"].includes(savedTab)
        ? savedTab
        : "params",
    );
    setPathParamValues(
      Object.fromEntries(
        (selectedEndpoint.parameters ?? [])
          .filter((parameter) => parameter.in === "path")
          .map((parameter) => [parameter.name, ""]),
      ),
    );
    const requiredQueries = (selectedEndpoint.parameters ?? [])
      .filter((parameter) => parameter.in === "query" && parameter.required)
      .map(parameterToRow);
    const requiredHeaders = (selectedEndpoint.parameters ?? [])
      .filter((parameter) => parameter.in === "header" && parameter.required)
      .map(parameterToRow);
    patchRequest({
      queryParams: mergeRequiredRows(
        useRunnerStore.getState().request.queryParams,
        requiredQueries,
      ),
      headers: mergeRequiredRows(
        useRunnerStore.getState().request.headers,
        requiredHeaders,
      ),
      body: selectedEndpoint.requestBodyRequiredProperties
        ? JSON.stringify(
            selectedEndpoint.requestBodyRequiredProperties,
            null,
            2,
          )
        : (selectedEndpoint.requestBodyExample ??
          useRunnerStore.getState().request.body),
    });
  }, [selectedEndpoint]);

  useEffect(() => {
    if (selectedEndpoint) {
      window.localStorage.setItem(
        `rexvit.requestTab.${selectedEndpoint.id}`,
        activeTab,
      );
    }
  }, [activeTab, selectedEndpoint]);

  // Load server selections on mount
  useEffect(() => {
    loadServerSelections();
  }, [loadServerSelections]);

  // Sync server selection when endpoint changes
  useEffect(() => {
    if (!selectedVersion || !selectedService) return;

    const stored = getServerSelection(selectedService.id, selectedVersion.id);
    const newSelection: ServerSelection = stored ?? {
      serviceId: selectedService.id,
      versionId: selectedVersion.id,
      selectedServerUrl: selectedVersion.servers?.[0]?.url,
      serverVariables: getDefaultServerVariables(selectedVersion.servers?.[0]),
    };

    setServerSelection(newSelection);
    const nextServer = newSelection.selectedServerUrl
      ? findServer(selectedVersion.servers, newSelection.selectedServerUrl)
      : selectedVersion.servers?.[0];
    const nextBaseUrl = getEffectiveServerUrl(
      nextServer,
      newSelection.serverVariables,
      newSelection.customOverride,
    );
    if (selectedEndpoint && nextBaseUrl) {
      patchRequest({
        url: buildRequestUrl(nextBaseUrl, selectedEndpoint.path),
      });
    }
  }, [
    selectedEndpoint,
    selectedService?.id,
    selectedVersion,
    getServerSelection,
    patchRequest,
  ]);

  useEffect(() => {
    patchRequest({ url: finalUrl });
  }, [finalUrl, patchRequest]);

  useEffect(() => {
    if (!activeRequest) return;
    patchRequest(activeRequest.request);
    setSelectedAuthProfile(activeRequest.authProfileId ?? null);
    setPathParamValues(activeRequest.params.path);
  }, [activeRequestId]);

  useEffect(() => {
    if (!activeRequest) return;
    updateActiveRequest({
      method: request.method,
      path: selectedEndpoint?.path ?? request.url,
      server: effectiveServerUrl,
      authProfileId: selectedAuthProfileId,
      params: {
        path: pathParamValues,
        query: request.queryParams,
        headers: request.headers,
      },
      headers: request.headers,
      body: request.body,
      request,
    });
  }, [
    activeRequest?.requestId,
    effectiveServerUrl,
    pathParamValues,
    request,
    selectedAuthProfileId,
    selectedEndpoint?.path,
    updateActiveRequest,
  ]);

  // Persist server selection when it changes
  useEffect(() => {
    if (serverSelection.serviceId && serverSelection.versionId) {
      saveServerSelection(serverSelection);
    }
  }, [serverSelection, saveServerSelection]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2">
        {openTabs.map((tab) => {
          const draft = requests.find(
            (item) => item.requestId === tab.requestId,
          );
          return (
            <button
              key={tab.requestId}
              type="button"
              className={[
                "focus-ring flex h-7 max-w-56 shrink-0 items-center gap-1 rounded px-2 text-xs transition-colors",
                activeRequestId === tab.requestId
                  ? "bg-panel text-foreground"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              ].join(" ")}
              onClick={() => focusTab(tab.requestId)}
              title={draft?.name ?? tab.title}
            >
              {draft?.dirty && <span className="text-warning">●</span>}
              <span className="truncate">{draft?.name ?? tab.title}</span>
              <span
                role="button"
                tabIndex={0}
                className="ml-1 rounded p-0.5 hover:bg-white/10"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.requestId);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    closeTab(tab.requestId);
                }}
                aria-label="Close tab"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openAdHocRequest(request)}
        >
          <Plus className="h-3.5 w-3.5" />
          Request
        </Button>
      </div>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="min-w-0">
          <h2 className="font-mono text-sm font-semibold">
            {selectedEndpoint
              ? `${selectedEndpoint.method} ${selectedEndpoint.path}`
              : "Ad-Hoc Request"}
          </h2>
          <p className="truncate text-xs text-muted">
            {selectedEndpoint
              ? `${selectedService?.name ?? "Service"} > ${selectedVersion?.label ?? "version"} > ${selectedEndpoint.method} ${selectedEndpoint.path}`
              : "Ad-Hoc Request"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            className="h-8 w-52"
            value={activeRequest?.name ?? ""}
            placeholder="Request name"
            onChange={(event) => renameActiveRequest(event.target.value)}
          />
          <Button variant="ghost" size="sm" onClick={duplicateActiveRequest}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 pb-24">
        <div
          className={
            isOpenApiMode
              ? "grid grid-cols-[108px_minmax(160px,240px)_1fr] gap-2"
              : "grid grid-cols-[108px_1fr] gap-2"
          }
        >
          <Select
            aria-label="HTTP method"
            value={request.method}
            onChange={(event) =>
              patchRequest({ method: event.target.value as HttpMethod })
            }
          >
            {METHODS.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </Select>
          {isOpenApiMode && (
            <ServerSelector
              servers={selectedVersion?.servers}
              selection={serverSelection}
              onServerChange={(updates) =>
                setServerSelection({ ...serverSelection, ...updates })
              }
            />
          )}
          <Input
            value={request.url}
            onChange={(event) => patchRequest({ url: event.target.value })}
            aria-label="Request URL"
            placeholder="Request URL"
            readOnly={isOpenApiMode}
          />
        </div>

        <section className="mt-3 rounded-md border border-border bg-surface">
          <div className="overflow-x-auto border-b border-border p-2">
            <Tabs<RequestTab>
              value={activeTab}
              onValueChange={setActiveTab}
              className="min-w-max"
              items={[
                { value: "params", label: "Params" },
                { value: "authorization", label: "Authorization" },
                { value: "headers", label: "Headers" },
                { value: "body", label: "Body" },
              ]}
            />
          </div>
          <div className="p-3">
            {activeTab === "params" && (
              <ParamsPanel
                pathParameters={pathParameters}
                pathParamValues={pathParamValues}
                queryParams={request.queryParams}
                requiredQueryParams={requiredQueryParams}
                search={paramSearch}
                onSearch={setParamSearch}
                onPathParamChange={(name, value) =>
                  setPathParamValues((current) => ({
                    ...current,
                    [name]: value,
                  }))
                }
                onAddQuery={addQueryParam}
                onUpdateQuery={updateQueryParam}
                onRemoveQuery={removeQueryParam}
              />
            )}
            {activeTab === "authorization" && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-xs">
                  <span className="text-muted">Authorization status</span>
                  <span
                    className={
                      selectedAuthProfile ? "text-success" : "text-muted"
                    }
                  >
                    {authStatus}
                  </span>
                </div>
                {selectedVersion?.securitySchemes &&
                  selectedVersion.securitySchemes.length > 0 && (
                    <div className="rounded-md border border-border bg-background/50 p-3 text-xs">
                      <p className="mb-2 font-medium text-muted">
                        Detected OpenAPI schemes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVersion.securitySchemes.map((scheme) => (
                          <span
                            key={scheme.id}
                            className="rounded bg-panel px-2 py-1 font-mono text-muted"
                          >
                            {scheme.id}: {scheme.scheme ?? scheme.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <AuthManager
                  environmentId={selectedEnvironmentId}
                  profiles={authProfiles.filter(
                    (profile) =>
                      profile.environmentId === selectedEnvironmentId,
                  )}
                  selectedAuthProfileId={selectedAuthProfileId}
                  onSelect={setSelectedAuthProfile}
                  onSave={upsertAuthProfile}
                  onDelete={removeAuthProfile}
                />
              </div>
            )}
            {activeTab === "headers" && (
              <EditorPanel
                title="Headers"
                onAdd={addHeader}
                search={headerSearch}
                onSearch={setHeaderSearch}
              >
                <PairRows
                  items={request.headers.filter((header) =>
                    matchesRow(header, headerSearch),
                  )}
                  keyPlaceholder="Header"
                  valuePlaceholder="Value"
                  requiredKeys={
                    new Set(
                      requiredHeaderParams.map((parameter) => parameter.name),
                    )
                  }
                  onUpdate={(visibleIndex, header) =>
                    updateHeader(
                      resolveVisibleIndex(
                        request.headers,
                        headerSearch,
                        visibleIndex,
                      ),
                      header,
                    )
                  }
                  onRemove={(visibleIndex) =>
                    removeHeader(
                      resolveVisibleIndex(
                        request.headers,
                        headerSearch,
                        visibleIndex,
                      ),
                    )
                  }
                />
              </EditorPanel>
            )}
            {activeTab === "body" && (
              <BodyPanel
                mode={bodyMode}
                value={request.body ?? ""}
                method={request.method}
                onModeChange={setBodyMode}
                onChange={(body) => patchRequest({ body })}
              />
            )}
          </div>
        </section>
      </div>
      <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 p-3 backdrop-blur">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-background px-2 py-1 font-mono text-accent">
                {request.method}
              </span>
              <span className="text-muted">Server:</span>
              <span className="truncate text-foreground">
                {isOpenApiMode
                  ? selectedServer?.description ||
                    selectedServer?.url ||
                    "OpenAPI"
                  : "Ad-Hoc"}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 gap-2">
              <span className="shrink-0 text-muted">Resolved URL:</span>
              <span className="truncate font-mono text-foreground">
                {finalUrl}
              </span>
            </div>
          </div>
          <Button size="md" onClick={run} disabled={isRunning}>
            <Play className="h-4 w-4" />
            {isRunning ? "Sending" : "Send"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function resolveRequestVariables(
  request: ApiRequest,
  variables: EnvironmentVariable[],
): ApiRequest {
  return {
    ...request,
    url: resolveVariables(request.url, variables),
    body: request.body
      ? resolveVariables(request.body, variables)
      : request.body,
    headers: request.headers.map((header) => ({
      ...header,
      key: resolveVariables(header.key, variables),
      value: resolveVariables(header.value, variables),
    })),
    queryParams: request.queryParams.map((param) => ({
      ...param,
      key: resolveVariables(param.key, variables),
      value: resolveVariables(param.value, variables),
    })),
  };
}

function mergeRequiredRows(
  existing: QueryPair[],
  requiredRows: QueryPair[],
): QueryPair[] {
  const existingByKey = new Map(existing.map((row) => [row.key, row]));
  const mergedRequired = requiredRows.map((requiredRow) => ({
    ...requiredRow,
    ...existingByKey.get(requiredRow.key),
    required: true,
    enabled: existingByKey.get(requiredRow.key)?.enabled ?? true,
  }));
  const requiredKeys = new Set(requiredRows.map((row) => row.key));
  return [
    ...mergedRequired,
    ...existing.filter((row) => !requiredKeys.has(row.key)),
  ];
}

function parameterToRow(parameter: OpenApiParameter): QueryPair {
  return {
    id: `required:${parameter.in}:${parameter.name}`,
    key: parameter.name,
    value: String(parameter.default ?? ""),
    enabled: true,
    required: true,
    type: parameter.type,
    description: parameter.description,
    example: parameter.example,
    enum: parameter.enum,
  };
}

function ParamsPanel({
  pathParameters,
  pathParamValues,
  queryParams,
  requiredQueryParams,
  search,
  onSearch,
  onPathParamChange,
  onAddQuery,
  onUpdateQuery,
  onRemoveQuery,
}: {
  pathParameters: OpenApiParameter[];
  pathParamValues: Record<string, string>;
  queryParams: QueryPair[];
  requiredQueryParams: OpenApiParameter[];
  search: string;
  onSearch: (search: string) => void;
  onPathParamChange: (name: string, value: string) => void;
  onAddQuery: () => void;
  onUpdateQuery: (index: number, queryParam: Partial<QueryPair>) => void;
  onRemoveQuery: (index: number) => void;
}) {
  const visiblePathParams = pathParameters.filter((parameter) =>
    matchesParam(parameter, search),
  );
  const visibleQueryParams = queryParams.filter((param) =>
    matchesRow(param, search),
  );

  return (
    <div className="grid gap-4">
      <Input
        className="h-8"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search params"
      />
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted">Path Parameters</h3>
          <span className="text-xs text-muted">{pathParameters.length}</span>
        </div>
        <div className="space-y-2">
          {visiblePathParams.length === 0 && (
            <p className="rounded-md border border-border bg-background/50 p-3 text-xs text-muted">
              No path parameters.
            </p>
          )}
          {visiblePathParams.map((parameter) => (
            <div
              key={parameter.name}
              className="grid grid-cols-[minmax(120px,180px)_1fr] gap-2 rounded-md border border-border bg-background/50 p-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate font-mono text-xs text-foreground"
                    title={parameter.description}
                  >
                    {parameter.name}
                  </span>
                  {parameter.required && (
                    <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger">
                      Required
                    </span>
                  )}
                </div>
                <p
                  className="mt-1 truncate text-[11px] text-muted"
                  title={parameter.description}
                >
                  {parameter.type ?? "string"}
                </p>
              </div>
              <Input
                className="h-8"
                value={pathParamValues[parameter.name] ?? ""}
                onChange={(event) =>
                  onPathParamChange(parameter.name, event.target.value)
                }
                placeholder={parameter.description ?? parameter.name}
              />
            </div>
          ))}
        </div>
      </section>
      <EditorPanel title="Query Parameters" onAdd={onAddQuery}>
        <PairRows
          items={visibleQueryParams}
          keyPlaceholder="name"
          valuePlaceholder="value"
          requiredKeys={
            new Set(requiredQueryParams.map((parameter) => parameter.name))
          }
          onUpdate={(visibleIndex, queryParam) =>
            onUpdateQuery(
              resolveVisibleIndex(queryParams, search, visibleIndex),
              queryParam,
            )
          }
          onRemove={(visibleIndex) =>
            onRemoveQuery(
              resolveVisibleIndex(queryParams, search, visibleIndex),
            )
          }
        />
      </EditorPanel>
    </div>
  );
}

function BodyPanel({
  mode,
  value,
  method,
  onModeChange,
  onChange,
}: {
  mode: BodyMode;
  value: string;
  method: HttpMethod;
  onModeChange: (mode: BodyMode) => void;
  onChange: (value: string) => void;
}) {
  const [validation, setValidation] = useState<string>("Valid");

  function prettyPrint() {
    if (mode !== "json") return;
    try {
      const formatted = JSON.stringify(JSON.parse(value || "{}"), null, 2);
      onChange(formatted);
      setValidation("Valid");
    } catch (error) {
      setValidation(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  function validate() {
    if (mode !== "json") {
      setValidation("Validation available for JSON");
      return;
    }
    try {
      JSON.parse(value || "{}");
      setValidation("Valid");
    } catch (error) {
      setValidation(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs<BodyMode>
          value={mode}
          onValueChange={onModeChange}
          items={[
            { value: "json", label: "JSON" },
            { value: "xml", label: "XML" },
            { value: "formData", label: "FormData" },
            { value: "multipart", label: "Multipart" },
            { value: "raw", label: "Raw" },
          ]}
        />
        <Button
          className="ml-auto"
          variant="ghost"
          size="sm"
          onClick={prettyPrint}
        >
          Pretty Print
        </Button>
        <Button variant="ghost" size="sm" onClick={validate}>
          Validate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(value)}
        >
          Copy
        </Button>
      </div>
      <textarea
        className="focus-ring h-[360px] w-full resize-none rounded-md border border-border bg-background/70 p-3 font-mono text-xs leading-5 text-foreground placeholder:text-muted"
        placeholder={
          method === "GET" || method === "DELETE"
            ? "No body required for this method"
            : bodyPlaceholder(mode)
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
      <div
        className={`mt-2 text-xs ${validation === "Valid" ? "text-success" : "text-warning"}`}
      >
        {validation}
      </div>
    </section>
  );
}

function EditorPanel({
  title,
  onAdd,
  search,
  onSearch,
  children,
}: {
  title: string;
  onAdd: () => void;
  search?: string;
  onSearch?: (search: string) => void;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <h3 className="text-xs font-medium text-muted">{title}</h3>
        <div className="flex items-center gap-2">
          {onSearch && (
            <Input
              className="h-7 w-48"
              value={search ?? ""}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Add ${title}`}
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

function matchesRow(row: HeaderPair | QueryPair, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return `${row.key} ${row.value}`.toLowerCase().includes(query);
}

function resolveVisibleIndex(
  rows: Array<HeaderPair | QueryPair>,
  search: string,
  visibleIndex: number,
) {
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => matchesRow(row, search));
  return visible[visibleIndex]?.index ?? visibleIndex;
}

function matchesParam(
  parameter: { name: string; type?: string; description?: string },
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return `${parameter.name} ${parameter.type ?? ""} ${parameter.description ?? ""}`
    .toLowerCase()
    .includes(query);
}

function bodyPlaceholder(mode: BodyMode) {
  if (mode === "json") return "{\n  \n}";
  if (mode === "xml") return "<request></request>";
  if (mode === "formData") return "key=value";
  if (mode === "multipart") return "field=@file";
  return "Raw request body";
}

function PairRows<T extends HeaderPair | QueryPair>({
  items,
  keyPlaceholder,
  valuePlaceholder,
  requiredKeys,
  onUpdate,
  onRemove,
}: {
  items: T[];
  keyPlaceholder: string;
  valuePlaceholder: string;
  requiredKeys?: Set<string>;
  onUpdate: (index: number, item: Partial<T>) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) {
    return <p className="px-1 py-2 text-xs text-muted">No rows configured.</p>;
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className="grid grid-cols-[24px_1fr_1fr_32px] gap-2"
        >
          <input
            className="focus-ring h-8 rounded border border-border bg-background accent-accent"
            aria-label="Enabled"
            type="checkbox"
            checked={item.enabled}
            disabled={item.required || requiredKeys?.has(item.key)}
            onChange={(event) =>
              onUpdate(index, { enabled: event.target.checked } as Partial<T>)
            }
          />
          <div className="relative min-w-0">
            <Input
              value={item.key}
              placeholder={keyPlaceholder}
              onChange={(event) =>
                onUpdate(index, { key: event.target.value } as Partial<T>)
              }
            />
            {(item.required || requiredKeys?.has(item.key)) && (
              <span className="pointer-events-none absolute right-2 top-1.5 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] text-danger">
                Required
              </span>
            )}
          </div>
          <ParameterValueInput
            item={item}
            placeholder={valuePlaceholder}
            onChange={(value) => onUpdate(index, { value } as Partial<T>)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove row"
            disabled={item.required || requiredKeys?.has(item.key)}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </>
  );
}

function ParameterValueInput({
  item,
  placeholder,
  onChange,
}: {
  item: HeaderPair | QueryPair;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  if (item.enum && item.enum.length > 0) {
    return (
      <Select
        value={item.value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{String(item.example ?? placeholder)}</option>
        {item.enum.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </Select>
    );
  }

  if (item.type === "boolean") {
    return (
      <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2 text-xs text-muted">
        <input
          className="accent-accent"
          type="checkbox"
          checked={item.value === "true"}
          onChange={(event) => onChange(String(event.target.checked))}
        />
        {item.value === "true" ? "true" : "false"}
      </label>
    );
  }

  return (
    <Input
      type={
        item.type === "integer" || item.type === "number" ? "number" : "text"
      }
      value={item.value}
      title={item.description}
      placeholder={
        item.example !== undefined ? String(item.example) : placeholder
      }
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function VariableEditor({
  environmentId,
  variables,
  onSave,
  onDelete,
}: {
  environmentId: string;
  variables: EnvironmentVariable[];
  onSave: (variable: EnvironmentVariable) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  function addVariable() {
    onSave({
      id: crypto.randomUUID(),
      environmentId,
      key: "",
      value: "",
      enabled: true,
    });
  }

  return (
    <section className="mt-3 rounded-md border border-border bg-surface">
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <div>
          <h3 className="text-xs font-medium text-muted">Variables</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add variable"
          onClick={addVariable}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2 p-2">
        {variables.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted">
            Use variables like {"{{userId}}"}, {"{{tenantId}}"}, {"{{token}}"}.
          </p>
        )}
        {variables.map((variable) => (
          <div
            key={variable.id}
            className="grid grid-cols-[24px_1fr_1fr_32px] gap-2"
          >
            <input
              className="focus-ring h-8 rounded border border-border bg-background accent-accent"
              aria-label="Variable enabled"
              type="checkbox"
              checked={variable.enabled}
              onChange={(event) =>
                onSave({ ...variable, enabled: event.target.checked })
              }
            />
            <Input
              value={variable.key}
              placeholder="userId"
              onChange={(event) =>
                onSave({ ...variable, key: event.target.value })
              }
            />
            <Input
              value={variable.value}
              placeholder="value"
              onChange={(event) =>
                onSave({ ...variable, value: event.target.value })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete variable"
              onClick={() => onDelete(variable.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuthManager({
  environmentId,
  profiles,
  selectedAuthProfileId,
  onSelect,
  onSave,
  onDelete,
}: {
  environmentId: string;
  profiles: AuthProfile[];
  selectedAuthProfileId: string | null;
  onSelect: (id: string | null) => void;
  onSave: (profile: AuthProfile, secret?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const selected =
    profiles.find((profile) => profile.id === selectedAuthProfileId) ?? null;
  const [secret, setSecret] = useState("");

  function createProfile(type: AuthType) {
    const profile: AuthProfile = {
      id: crypto.randomUUID(),
      name: `${type} auth`,
      type,
      environmentId,
      secretRef: crypto.randomUUID(),
      enabled: true,
      config: {
        headerName: type === "apiKey" ? "X-API-Key" : undefined,
        apiKeyLocation: "header",
        username: type === "basic" ? "username" : undefined,
        customHeaders:
          type === "customHeaders"
            ? [
                {
                  key: "X-Custom-Auth",
                  secretRef: crypto.randomUUID(),
                  enabled: true,
                },
              ]
            : undefined,
      },
    };
    onSave(profile, "");
    onSelect(profile.id);
  }

  return (
    <section className="mt-3 rounded-md border border-border bg-surface">
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <h3 className="flex items-center gap-2 text-xs font-medium text-muted">
          <KeyRound className="h-3.5 w-3.5" />
          Authentication
        </h3>
        <Select
          className="h-7 w-36"
          aria-label="Add auth profile"
          onChange={(event) =>
            event.target.value && createProfile(event.target.value as AuthType)
          }
          value=""
        >
          <option value="">Add auth</option>
          {AUTH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2 p-2">
        <Select
          value={selectedAuthProfileId ?? ""}
          onChange={(event) => onSelect(event.target.value || null)}
          aria-label="Auth profile"
        >
          <option value="">No auth</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </Select>
        {selected && (
          <div className="grid gap-2">
            <div className="grid grid-cols-[1fr_120px_32px] gap-2">
              <Input
                value={selected.name}
                onChange={(event) =>
                  onSave({ ...selected, name: event.target.value })
                }
              />
              <Select
                value={selected.type}
                onChange={(event) =>
                  onSave({ ...selected, type: event.target.value as AuthType })
                }
              >
                {AUTH_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete auth profile"
                onClick={() => onDelete(selected.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {selected.type === "apiKey" && (
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Input
                  value={selected.config.headerName ?? ""}
                  placeholder="X-API-Key"
                  onChange={(event) =>
                    onSave({
                      ...selected,
                      config: {
                        ...selected.config,
                        headerName: event.target.value,
                      },
                    })
                  }
                />
                <Select
                  value={selected.config.apiKeyLocation ?? "header"}
                  onChange={(event) =>
                    onSave({
                      ...selected,
                      config: {
                        ...selected.config,
                        apiKeyLocation: event.target.value as
                          | "header"
                          | "query",
                      },
                    })
                  }
                >
                  <option value="header">header</option>
                  <option value="query">query</option>
                </Select>
              </div>
            )}
            {selected.type === "basic" && (
              <Input
                value={selected.config.username ?? ""}
                placeholder="Username"
                onChange={(event) =>
                  onSave({
                    ...selected,
                    config: {
                      ...selected.config,
                      username: event.target.value,
                    },
                  })
                }
              />
            )}
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <Input
                type="password"
                value={secret}
                placeholder="Credential secret"
                onChange={(event) => setSecret(event.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSave(selected, secret)}
              >
                Store
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateManager({
  request,
  selectedAuthProfileId,
  templates,
  onSave,
  onDelete,
  onApply,
}: {
  request: ApiRequest;
  selectedAuthProfileId: string | null;
  templates: RequestTemplate[];
  onSave: (template: RequestTemplate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onApply: (template: RequestTemplate) => void;
}) {
  const [name, setName] = useState("");

  function saveTemplate() {
    const now = new Date().toISOString();
    onSave({
      id: crypto.randomUUID(),
      name: name || `${request.method} ${new URL(request.url).pathname}`,
      request,
      authProfileId: selectedAuthProfileId ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
    setName("");
  }

  return (
    <section className="mt-3 rounded-md border border-border bg-surface">
      <div className="flex h-9 items-center justify-between border-b border-border px-3">
        <h3 className="text-xs font-medium text-muted">Request Templates</h3>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Save template"
          onClick={saveTemplate}
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2 p-2">
        <Input
          value={name}
          placeholder="Template name"
          onChange={(event) => setName(event.target.value)}
        />
        {templates.slice(0, 6).map((template) => (
          <div key={template.id} className="grid grid-cols-[1fr_32px] gap-2">
            <button
              type="button"
              className="focus-ring min-w-0 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/5"
              onClick={() => onApply(template)}
            >
              <span className="block truncate font-medium text-foreground">
                {template.name}
              </span>
              <span className="block truncate font-mono text-muted">
                {template.request.method} {template.request.url}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete template"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CurlCodeTools({
  request,
  curlInput,
  codeLanguage,
  generatedCode,
  onCurlInputChange,
  onImportCurl,
  onExportCurl,
  onLanguageChange,
  onGenerate,
}: {
  request: ApiRequest;
  curlInput: string;
  codeLanguage: CodeLanguage;
  generatedCode: string;
  onCurlInputChange: (value: string) => void;
  onImportCurl: () => void;
  onExportCurl: () => void;
  onLanguageChange: (language: CodeLanguage) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="mt-3 rounded-md border border-border bg-surface">
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <Code2 className="h-3.5 w-3.5 text-muted" />
        <h3 className="text-xs font-medium text-muted">cURL & Code</h3>
        <Button
          className="ml-auto"
          variant="ghost"
          size="sm"
          onClick={onExportCurl}
        >
          <Download className="h-3.5 w-3.5" />
          cURL
        </Button>
      </div>
      <div className="space-y-2 p-2">
        <textarea
          className="focus-ring h-20 w-full resize-none rounded-md border border-border bg-background/60 p-2 font-mono text-xs"
          value={curlInput}
          onChange={(event) => onCurlInputChange(event.target.value)}
          placeholder="Paste cURL command"
        />
        <div className="grid grid-cols-[1fr_100px_100px] gap-2">
          <Select
            value={codeLanguage}
            onChange={(event) =>
              onLanguageChange(event.target.value as CodeLanguage)
            }
          >
            {CODE_LANGUAGES.map((language) => (
              <option key={language}>{language}</option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={onImportCurl}>
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={onGenerate}>
            Generate
          </Button>
        </div>
        <pre className="max-h-56 overflow-auto rounded-md bg-background/70 p-3 font-mono text-xs leading-5 text-foreground">
          {generatedCode || generateCode(request, codeLanguage)}
        </pre>
      </div>
    </section>
  );
}
