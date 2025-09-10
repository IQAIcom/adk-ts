/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface AgentListItemDto {
  path: string;
  name: string;
  directory: string;
  relativePath: string;
}

export interface AgentsListResponseDto {
  agents: AgentListItemDto[];
}

export interface MessageItemDto {
  /** @example 1 */
  id: number;
  /** @example "user" */
  type: "user" | "assistant";
  /** @example "Hello" */
  content: string;
  /** @example "2025-09-05T06:41:53.630Z" */
  timestamp: string;
}

export interface MessagesResponseDto {
  messages: MessageItemDto[];
}

export interface MessageResponseDto {
  /** @example "Hi there!" */
  response: string;
}

export interface SessionResponseDto {
  id: string;
  appName: string;
  userId: string;
  state: object;
  /** @example 3 */
  eventCount: number;
  /** @example 1757054513630 */
  lastUpdateTime: number;
  /** @example 1757054513630 */
  createdAt: number;
}

export interface SessionsResponseDto {
  sessions: SessionResponseDto[];
}

export interface SuccessResponseDto {
  /** @example true */
  success: boolean;
}

export interface EventItemDto {
  id: string;
  author: string;
  /** @example 1757054513630 */
  timestamp: number;
  /** Raw event content */
  content: object;
  actions: object | null;
  functionCalls: object[];
  functionResponses: object[];
  branch?: string | null;
  /** @example false */
  isFinalResponse: boolean;
}

export interface EventsResponseDto {
  events: EventItemDto[];
  /** @example 1 */
  totalCount: number;
}

export interface StateMetadataDto {
  /** @example 1757054513630 */
  lastUpdated: number;
  /** @example 0 */
  changeCount: number;
  /** @example 5 */
  totalKeys: number;
  /** @example 120 */
  sizeBytes: number;
}

export interface StateResponseDto {
  agentState: object;
  userState: object;
  sessionState: object;
  metadata: StateMetadataDto;
}

export interface HealthResponseDto {
  /** @example "ok" */
  status: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title ADK HTTP API
 * @version 1.0.0
 * @contact
 *
 * REST endpoints for managing and interacting with ADK agents
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description Returns all agent entries found by scanning the agents directory. Each agent includes name, absolute, and relative paths.
     *
     * @tags agents
     * @name AgentsControllerListAgents
     * @summary List discovered agents
     * @request GET:/api/agents
     */
    agentsControllerListAgents: (params: RequestParams = {}) =>
      this.request<AgentsListResponseDto, any>({
        path: `/api/agents`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Triggers a fresh scan of the agents directory and returns the updated agent list.
     *
     * @tags agents
     * @name AgentsControllerRefreshAgents
     * @summary Rescan and list agents
     * @request POST:/api/agents/refresh
     */
    agentsControllerRefreshAgents: (params: RequestParams = {}) =>
      this.request<AgentsListResponseDto, any>({
        path: `/api/agents/refresh`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns ordered chat transcript for the agent, including user and assistant messages.
     *
     * @tags messaging
     * @name MessagingControllerGetAgentMessages
     * @summary Get message history
     * @request GET:/api/agents/{id}/messages
     */
    messagingControllerGetAgentMessages: (
      id: string,
      params: RequestParams = {},
    ) =>
      this.request<MessagesResponseDto, any>({
        path: `/api/agents/${id}/messages`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Adds a user message (with optional base64 attachments) and returns the assistant response.
     *
     * @tags messaging
     * @name MessagingControllerPostAgentMessage
     * @summary Send a message to the agent
     * @request POST:/api/agents/{id}/message
     */
    messagingControllerPostAgentMessage: (
      id: string,
      data: any,
      params: RequestParams = {},
    ) =>
      this.request<MessageResponseDto, any>({
        path: `/api/agents/${id}/message`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns all active sessions for the specified agent including metadata.
     *
     * @tags sessions
     * @name SessionsControllerListSessions
     * @summary List sessions for an agent
     * @request GET:/api/agents/{id}/sessions
     */
    sessionsControllerListSessions: (id: string, params: RequestParams = {}) =>
      this.request<SessionsResponseDto, any>({
        path: `/api/agents/${id}/sessions`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Creates a session for the agent. Optional state and custom sessionId may be provided.
     *
     * @tags sessions
     * @name SessionsControllerCreateSession
     * @summary Create a new session
     * @request POST:/api/agents/{id}/sessions
     */
    sessionsControllerCreateSession: (
      id: string,
      data: any,
      params: RequestParams = {},
    ) =>
      this.request<SessionResponseDto, any>({
        path: `/api/agents/${id}/sessions`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Stops and removes the session if it exists.
     *
     * @tags sessions
     * @name SessionsControllerDeleteSession
     * @summary Delete a session
     * @request DELETE:/api/agents/{id}/sessions/{sessionId}
     */
    sessionsControllerDeleteSession: (
      id: string,
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseDto, any>({
        path: `/api/agents/${id}/sessions/${sessionId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Marks the specified session as active (implementation specific).
     *
     * @tags sessions
     * @name SessionsControllerSwitchSession
     * @summary Switch active session
     * @request POST:/api/agents/{id}/sessions/{sessionId}/switch
     */
    sessionsControllerSwitchSession: (
      id: string,
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseDto, any>({
        path: `/api/agents/${id}/sessions/${sessionId}/switch`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Returns chronological events for a specific agent session including actions, function calls, and responses.
     *
     * @tags events
     * @name EventsControllerGetEvents
     * @summary Get session events
     * @request GET:/api/agents/{id}/sessions/{sessionId}/events
     */
    eventsControllerGetEvents: (
      id: string,
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<EventsResponseDto, any>({
        path: `/api/agents/${id}/sessions/${sessionId}/events`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieves combined agent, user, and session state along with metadata such as last update time and size metrics.
     *
     * @tags state
     * @name StateControllerGetState
     * @summary Get current session state
     * @request GET:/api/agents/{id}/sessions/{sessionId}/state
     */
    stateControllerGetState: (
      id: string,
      sessionId: string,
      params: RequestParams = {},
    ) =>
      this.request<StateResponseDto, any>({
        path: `/api/agents/${id}/sessions/${sessionId}/state`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Updates a nested state value for the session given a dot/JSON path and value payload.
     *
     * @tags state
     * @name StateControllerUpdateState
     * @summary Update a state path
     * @request PUT:/api/agents/{id}/sessions/{sessionId}/state
     */
    stateControllerUpdateState: (
      id: string,
      sessionId: string,
      data: any,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseDto, any>({
        path: `/api/agents/${id}/sessions/${sessionId}/state`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  reload = {
    /**
     * No description
     *
     * @name ReloadControllerStream
     * @request GET:/reload/stream
     */
    reloadControllerStream: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/reload/stream`,
        method: "GET",
        ...params,
      }),
  };
  health = {
    /**
     * @description Basic liveness probe returning status: ok when the service is up.
     *
     * @tags health
     * @name HealthControllerHealth
     * @summary Health check
     * @request GET:/health
     */
    healthControllerHealth: (params: RequestParams = {}) =>
      this.request<HealthResponseDto, any>({
        path: `/health`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
