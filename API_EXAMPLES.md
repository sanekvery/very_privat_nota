# API Usage Examples

Практические примеры использования API для фронтенд разработчиков.

## Базовая настройка

### API Client (fetch wrapper)

```typescript
// utils/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

let sessionToken: string | null = null;

export function setSessionToken(token: string) {
  sessionToken = token;
  // Сохранить в localStorage для persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('sessionToken', token);
  }
}

export function getSessionToken(): string | null {
  if (sessionToken) return sessionToken;

  // Восстановить из localStorage
  if (typeof window !== 'undefined') {
    sessionToken = localStorage.getItem('sessionToken');
  }

  return sessionToken;
}

export function clearSessionToken() {
  sessionToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sessionToken');
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = true,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requireAuth) {
    const token = getSessionToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}
```

## AUTH Endpoints

### 1. Telegram Login

```typescript
// components/TelegramAuth.tsx
import { useEffect } from 'react';
import { apiRequest, setSessionToken } from '@/utils/api-client';

interface TelegramUser {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  isAdmin: boolean;
  referralCode: string;
}

export function TelegramAuth() {
  useEffect(() => {
    // Telegram WebApp SDK
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.error('Telegram WebApp SDK not loaded');
      return;
    }

    async function login() {
      try {
        // initData приходит от Telegram
        const initData = tg.initData;

        if (!initData) {
          console.error('No initData from Telegram');
          return;
        }

        // Извлечь startParam (для реферальных ссылок)
        const startParam = tg.initDataUnsafe?.start_param;

        const response = await apiRequest<{
          user: TelegramUser;
          sessionToken: string;
        }>('/auth/telegram', {
          method: 'POST',
          body: {
            initData,
            startParam,
          },
          requireAuth: false,
        });

        // Сохранить токен
        setSessionToken(response.sessionToken);

        console.log('Logged in:', response.user);

        // Редирект на главную
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Login failed:', error);
      }
    }

    login();
  }, []);

  return <div>Authenticating...</div>;
}
```

### 2. Get Current User

```typescript
// hooks/useCurrentUser.ts
import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api-client';

interface AuthUser {
  id: string;
  telegramId?: string;
  username?: string;
  firstName?: string;
  isAdmin: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiRequest<{ user: AuthUser }>('/auth/me');
        setUser(response.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading, error };
}

// Использование в компоненте
function Dashboard() {
  const { user, loading, error } = useCurrentUser();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      {user.isAdmin && <AdminPanel />}
    </div>
  );
}
```

### 3. Logout

```typescript
// components/LogoutButton.tsx
import { apiRequest, clearSessionToken } from '@/utils/api-client';

export function LogoutButton() {
  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });

      clearSessionToken();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return <button onClick={handleLogout}>Logout</button>;
}
```

## VPN Endpoints

### 1. Generate VPN Config

```typescript
// hooks/useVpnConfig.ts
import { useState } from 'react';
import { apiRequest } from '@/utils/api-client';

interface VpnConfig {
  subscriptionId: string;
  serverId: string;
  privateKey: string;
  publicKey: string;
  presharedKey?: string;
  ipAddress: string;
  serverPublicKey: string;
  serverEndpoint: string;
  allowedIPs: string;
  dns: string;
  configText: string;
}

export function useVpnConfig() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateConfig(
    subscriptionId: string,
    serverId?: string
  ): Promise<VpnConfig | null> {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ config: VpnConfig }>(
        '/vpn/generate',
        {
          method: 'POST',
          body: {
            subscriptionId,
            serverId,
          },
        }
      );

      return response.config;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate config';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generateConfig, loading, error };
}

// Использование
function CreateConfigButton({ subscriptionId }: { subscriptionId: string }) {
  const { generateConfig, loading, error } = useVpnConfig();
  const [config, setConfig] = useState<VpnConfig | null>(null);

  async function handleClick() {
    const newConfig = await generateConfig(subscriptionId);
    if (newConfig) {
      setConfig(newConfig);
    }
  }

  if (config) {
    return <ConfigDisplay config={config} />;
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'Generating...' : 'Create VPN Config'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### 2. Display Config with QR Code

```typescript
// components/ConfigDisplay.tsx
import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

interface ConfigDisplayProps {
  config: VpnConfig;
}

export function ConfigDisplay({ config }: ConfigDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Генерация QR кода для быстрого импорта на мобильном
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, config.configText, {
        width: 256,
        margin: 2,
      });
    }
  }, [config.configText]);

  function downloadConfig() {
    const blob = new Blob([config.configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wireguard-${config.ipAddress}.conf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(config.configText);
    alert('Config copied to clipboard!');
  }

  return (
    <div className="config-display">
      <h3>VPN Configuration Created</h3>

      <div className="config-info">
        <p><strong>IP Address:</strong> {config.ipAddress}</p>
        <p><strong>Server:</strong> {config.serverEndpoint}</p>
        <p><strong>DNS:</strong> {config.dns}</p>
      </div>

      <div className="qr-code">
        <h4>Scan with WireGuard app:</h4>
        <canvas ref={canvasRef} />
      </div>

      <div className="config-text">
        <h4>Or copy config manually:</h4>
        <pre>{config.configText}</pre>
      </div>

      <div className="actions">
        <button onClick={downloadConfig}>Download .conf</button>
        <button onClick={copyToClipboard}>Copy to Clipboard</button>
      </div>
    </div>
  );
}
```

### 3. List Subscription Configs

```typescript
// hooks/useSubscriptionConfigs.ts
import { useEffect, useState } from 'react';
import { apiRequest } from '@/utils/api-client';

export function useSubscriptionConfigs(subscriptionId: string) {
  const [configs, setConfigs] = useState<VpnConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchConfigs() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{
        configs: VpnConfig[];
        count: number;
      }>(`/vpn/subscription/${subscriptionId}`);

      setConfigs(response.configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch configs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfigs();
  }, [subscriptionId]);

  return { configs, loading, error, refetch: fetchConfigs };
}

// Использование
function SubscriptionConfigList({ subscriptionId }: { subscriptionId: string }) {
  const { configs, loading, error, refetch } = useSubscriptionConfigs(subscriptionId);

  if (loading) return <div>Loading configs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Your VPN Configs ({configs.length})</h2>

      {configs.map((config) => (
        <ConfigCard
          key={config.ipAddress}
          config={config}
          onDelete={refetch}
        />
      ))}
    </div>
  );
}
```

### 4. Rotate Config

```typescript
// components/RotateConfigButton.tsx
import { useState } from 'react';
import { apiRequest } from '@/utils/api-client';

interface RotateConfigButtonProps {
  subscriptionId: string;
  onRotated: () => void;
}

export function RotateConfigButton({
  subscriptionId,
  onRotated,
}: RotateConfigButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleRotate() {
    if (!confirm('Are you sure? Your current config will be deactivated.')) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest<{
        result: {
          oldIpAddress: string;
          newConfig: VpnConfig;
        };
      }>('/vpn/rotate', {
        method: 'POST',
        body: { subscriptionId },
      });

      alert(`Config rotated! Old IP: ${response.result.oldIpAddress}`);
      onRotated();
    } catch (error) {
      alert(`Failed to rotate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleRotate} disabled={loading}>
      {loading ? 'Rotating...' : 'Rotate Config'}
    </button>
  );
}
```

### 5. Delete Config

```typescript
// components/DeleteConfigButton.tsx
import { useState } from 'react';
import { apiRequest } from '@/utils/api-client';

interface DeleteConfigButtonProps {
  configId: string;
  subscriptionId: string;
  onDeleted: () => void;
}

export function DeleteConfigButton({
  configId,
  subscriptionId,
  onDeleted,
}: DeleteConfigButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this config? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      await apiRequest(`/vpn/${configId}?subscriptionId=${subscriptionId}`, {
        method: 'DELETE',
      });

      onDeleted();
    } catch (error) {
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-danger">
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

## Error Handling

### Централизованный обработчик ошибок

```typescript
// utils/error-handler.ts
interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    // Network error
    if (error.message === 'Failed to fetch') {
      return 'Network error. Please check your connection.';
    }

    return error.message;
  }

  return 'An unexpected error occurred';
}

export function getErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You are not authenticated. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict. This resource already exists.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}
```

### Error Boundary

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Можно отправить в Sentry/LogRocket
    // Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!);
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Использование
function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

## TypeScript Types

### Создание типов из API responses

```typescript
// types/api.ts

// Auth types
export interface TelegramUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  referralCode: string;
}

export interface AuthResponse {
  user: TelegramUser;
  sessionToken: string;
}

// VPN types
export interface VpnConfig {
  subscriptionId: string;
  serverId: string;
  privateKey: string;
  publicKey: string;
  presharedKey?: string;
  ipAddress: string;
  serverPublicKey: string;
  serverEndpoint: string;
  allowedIPs: string;
  dns: string;
  configText: string;
}

export interface VpnServer {
  id: string;
  name: string;
  countryCode: string;
  city?: string;
  endpoint: string;
  status: 'active' | 'maintenance' | 'overloaded' | 'offline';
  currentUsers: number;
  maxUsers: number;
}

// Generic API response
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        message: string;
        code?: string;
        statusCode: number;
      };
    };
```

## Testing

### Mock API для тестирования

```typescript
// utils/mock-api.ts (для разработки без бэкенда)
const MOCK_USER: TelegramUser = {
  id: 'mock-user-id',
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'Test',
  isAdmin: false,
  referralCode: 'TEST1234',
};

const MOCK_CONFIG: VpnConfig = {
  subscriptionId: 'sub-123',
  serverId: 'server-1',
  privateKey: 'MOCK_PRIVATE_KEY_BASE64==',
  publicKey: 'MOCK_PUBLIC_KEY_BASE64==',
  presharedKey: 'MOCK_PSK_BASE64==',
  ipAddress: '10.0.1.100',
  serverPublicKey: 'SERVER_PUBLIC_KEY==',
  serverEndpoint: 'vpn.example.com:51820',
  allowedIPs: '0.0.0.0/0, ::/0',
  dns: '1.1.1.1, 8.8.8.8',
  configText: '[Interface]\n...',
};

export const mockApi = {
  async login(): Promise<AuthResponse> {
    await delay(500);
    return {
      user: MOCK_USER,
      sessionToken: 'mock-token-' + Date.now(),
    };
  },

  async generateConfig(): Promise<{ config: VpnConfig }> {
    await delay(1000);
    return { config: MOCK_CONFIG };
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Использование в development
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export async function login(initData: string) {
  if (USE_MOCK) {
    return mockApi.login();
  }

  return apiRequest<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: { initData },
    requireAuth: false,
  });
}
```

## React Query Integration

```typescript
// hooks/useVpnQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/api-client';

// Query: Get subscription configs
export function useSubscriptionConfigs(subscriptionId: string) {
  return useQuery({
    queryKey: ['vpn-configs', subscriptionId],
    queryFn: async () => {
      const response = await apiRequest<{
        configs: VpnConfig[];
        count: number;
      }>(`/vpn/subscription/${subscriptionId}`);
      return response.configs;
    },
  });
}

// Mutation: Generate config
export function useGenerateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string;
      serverId?: string;
    }) => {
      const response = await apiRequest<{ config: VpnConfig }>(
        '/vpn/generate',
        {
          method: 'POST',
          body: params,
        }
      );
      return response.config;
    },
    onSuccess: (_, variables) => {
      // Invalidate configs list
      queryClient.invalidateQueries({
        queryKey: ['vpn-configs', variables.subscriptionId],
      });
    },
  });
}

// Использование
function ConfigManager({ subscriptionId }: { subscriptionId: string }) {
  const { data: configs, isLoading } = useSubscriptionConfigs(subscriptionId);
  const generateMutation = useGenerateConfig();

  async function handleGenerate() {
    try {
      await generateMutation.mutateAsync({ subscriptionId });
      alert('Config generated!');
    } catch (error) {
      alert('Failed to generate config');
    }
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleGenerate} disabled={generateMutation.isPending}>
        {generateMutation.isPending ? 'Generating...' : 'Generate Config'}
      </button>

      <ul>
        {configs?.map((config) => (
          <li key={config.ipAddress}>{config.ipAddress}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Всегда обрабатывайте ошибки**
2. **Показывайте loading states**
3. **Используйте TypeScript для type safety**
4. **Кешируйте данные (React Query)**
5. **Логируйте ошибки в production (Sentry)**
6. **Валидируйте данные перед отправкой**
7. **Не храните sensitive данные в localStorage** (только session token)
8. **Используйте HTTPS в production**
9. **Добавьте retry logic для критичных запросов**
10. **Тестируйте с mock data**
