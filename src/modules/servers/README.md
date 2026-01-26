# SERVERS Module

Модуль управления VPN серверами с автоматическим балансировкой нагрузки и мониторингом здоровья.

## 📋 Содержание

- [Архитектура](#архитектура)
- [Компоненты](#компоненты)
- [API Endpoints](#api-endpoints)
- [Load Balancing](#load-balancing)
- [Health Checks](#health-checks)
- [Capacity Management](#capacity-management)
- [Настройка](#настройка)
- [Troubleshooting](#troubleshooting)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVERS MODULE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐                                       │
│  │  ServerService   │                                       │
│  │                  │                                       │
│  │  - CRUD          │                                       │
│  │  - Health checks │                                       │
│  │  - Load balancing│                                       │
│  │  - Capacity mgmt │                                       │
│  └────────┬─────────┘                                       │
│           │                                                 │
│  ┌────────▼──────────────────────────────┐                  │
│  │        Prisma Database                │                  │
│  │  - vpn_servers                        │                  │
│  │  - server_health_checks               │                  │
│  │  - vpn_configs (capacity calculation) │                  │
│  └───────────────────────────────────────┘                  │
│                                                             │
│  External:                                                  │
│  ┌──────────────────────┐                                   │
│  │    VPN Agent API     │  ← Health checks                  │
│  └──────────────────────┘                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Компоненты

### ServerService

Управление серверами и их жизненным циклом.

**Основные методы:**

```typescript
class ServerService {
  // CRUD operations
  async createServer(input: CreateServerInput): Promise<VpnServer>
  async getServerById(serverId: string): Promise<VpnServer>
  async getServerWithStats(serverId: string): Promise<ServerWithStats>
  async getAllServers(filters?): Promise<VpnServer[]>
  async updateServer(input: UpdateServerInput): Promise<VpnServer>
  async deleteServer(serverId: string): Promise<void>

  // Health monitoring
  async performHealthCheck(serverId: string): Promise<HealthCheckResult>

  // Load balancing
  async getOptimalServer(criteria?: ServerSelectionCriteria): Promise<OptimalServerResult>
  async getServerLoadMetrics(serverId: string): Promise<ServerLoadMetrics>

  // Statistics (admin)
  async getServerStatistics(): Promise<ServerStatistics>
  async getServerCapacityInfo(serverId: string): Promise<ServerCapacityInfo>
}
```

---

## API Endpoints

### User Endpoints

#### `GET /api/servers`
Получить список всех серверов.

**Query params:**
- `status` - фильтр по статусу (active, maintenance, offline)
- `countryCode` - фильтр по стране (ISO 3166-1 alpha-2: US, DE, NL)
- `isActive` - фильтр по активности (true/false)
- `limit` - лимит записей (default: 50, max: 100)
- `offset` - смещение для пагинации

**Response:**
```typescript
[
  {
    id: string
    name: string
    host: string
    port: number
    location: string
    countryCode: string
    status: 'active' | 'maintenance' | 'offline'
    isActive: boolean
    maxUsers: number
    // ... other fields
  }
]
```

#### `GET /api/servers/:serverId`
Получить детали сервера со статистикой.

**Response:**
```typescript
{
  id: string
  name: string
  host: string
  port: number
  location: string
  countryCode: string
  status: 'active' | 'maintenance' | 'offline'
  maxUsers: number
  stats: {
    activeConfigs: number
    totalConfigs: number
    capacityUsed: number      // Percentage 0-100
    lastHealthCheck?: Date
    isHealthy: boolean
  }
  // ... other fields
}
```

#### `GET /api/servers/optimal`
Получить оптимальный сервер для нового пользователя (load balancing).

**Query params:**
- `preferredCountry` - предпочитаемая страна (ISO alpha-2, optional)
- `maxCapacity` - максимальная допустимая загрузка% (default: 90)
- `requireActive` - требовать активный статус (default: true)

**Response:**
```typescript
{
  server: VpnServer
  score: number              // Selection score (higher is better)
  reason: string             // "matches preferred country, low load"
  metrics: {
    serverId: string
    activeUsers: number
    maxUsers: number
    capacityUsed: number     // Percentage
    availableIps: number
    totalIps: number
  }
}
```

---

### Admin Endpoints

#### `POST /api/servers` (Admin)
Создать новый сервер.

**Request:**
```typescript
{
  name: string                      // "Netherlands VPN #1"
  host: string                      // "vpn1.example.com"
  port?: number                     // 51820 (default)
  publicKey: string                 // WireGuard public key
  endpoint: string                  // "vpn1.example.com:51820"
  location: string                  // "Amsterdam, Netherlands"
  countryCode: string               // "NL" (ISO 3166-1 alpha-2)
  ipPoolStart: string               // "10.0.1.2"
  ipPoolEnd: string                 // "10.0.1.254"
  maxUsers?: number                 // 1000 (default)
  agentApiUrl: string               // "https://vpn1.example.com:8443"
  agentApiToken: string             // Bearer token for VPN Agent
  allowedIps?: string               // "0.0.0.0/0" (default)
  dns?: string                      // "1.1.1.1, 1.0.0.1" (default)
  mtu?: number                      // 1420 (default)
  persistentKeepalive?: number      // 25 (default)
  isActive?: boolean                // true (default)
  metadata?: Record<string, unknown>
}
```

**Validation:**
- `name`: 1-100 chars
- `host`: 1-255 chars
- `port`: 1-65535
- `countryCode`: exactly 2 chars (uppercase)
- `ipPoolStart/End`: valid IPv4, start <= end
- IP Pool size: 10-65536 addresses
- `maxUsers`: 1-10000

#### `PATCH /api/servers/:serverId` (Admin)
Обновить сервер.

**Request:** Любые поля из `CreateServerInput` (все optional).

#### `DELETE /api/servers/:serverId` (Admin)
Удалить сервер (soft delete).

**Validation:**
- Нельзя удалить сервер с активными конфигурациями
- Сервер помечается как `isActive: false`, `status: offline`

#### `POST /api/servers/:serverId/health` (Admin)
Выполнить health check сервера.

**Response:**
```typescript
{
  serverId: string
  isHealthy: boolean
  responseTime?: number        // ms
  lastChecked: Date
  error?: string
  details?: {
    agentReachable: boolean
  }
}
```

**Side effects:**
- Сохраняет результат в `server_health_checks`
- Если `isHealthy = false` и `status = active` → меняет на `offline`

#### `GET /api/admin/servers/stats` (Admin)
Статистика всех серверов.

**Response:**
```typescript
{
  totalServers: number
  activeServers: number
  maintenanceServers: number
  offlineServers: number
  totalCapacity: number         // Total maxUsers across all servers
  usedCapacity: number          // Total active configs
  averageLoad: number           // Percentage (0-100)
  serversByCountry: [
    { countryCode: "NL", count: 2 },
    { countryCode: "DE", count: 1 }
  ]
}
```

---

## Load Balancing

### Алгоритм выбора оптимального сервера

```typescript
getOptimalServer(criteria?) → OptimalServerResult
```

**Шаги:**

1. **Фильтрация серверов:**
   - `requireActive` → status = active, isActive = true
   - `preferredCountry` → countryCode = preferredCountry
   - `excludeServerIds` → не включать указанные серверы

2. **Расчет метрик для каждого сервера:**
   ```typescript
   metrics = {
     activeUsers: count(vpn_configs where isActive=true)
     capacityUsed: (activeUsers / maxUsers) * 100
     availableIps: totalIps - usedIps
   }
   ```

3. **Отсечение по максимальной загрузке:**
   - Если `capacityUsed > maxCapacity` → исключить сервер

4. **Расчет score (чем выше, тем лучше):**
   ```typescript
   score = 100 - capacityUsed

   // Бонусы
   if (matchesPreferredCountry) score += 20

   // Штрафы
   if (capacityUsed > 70) score -= 10
   ```

5. **Сортировка по score (desc)**

6. **Возврат лучшего сервера**

**Пример:**

```bash
# Найти сервер в Германии с макс. загрузкой 80%
GET /api/servers/optimal?preferredCountry=DE&maxCapacity=80

# Response:
{
  "server": { "id": "...", "name": "Germany VPN #1", ... },
  "score": 95,
  "reason": "matches preferred country, low load",
  "metrics": {
    "activeUsers": 50,
    "maxUsers": 1000,
    "capacityUsed": 5
  }
}
```

---

## Health Checks

### Автоматический мониторинг

Health checks выполняются для проверки доступности VPN серверов.

**Что проверяется:**

1. **VPN Agent API доступность**
   - HTTP GET к `{agentApiUrl}/health`
   - Authorization: Bearer {agentApiToken}
   - Timeout: разумное значение (5-10 сек)

2. **Response time** (мс)

**Результат сохраняется в БД:**

```sql
CREATE TABLE server_health_checks (
  id UUID PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES vpn_servers(id),
  is_healthy BOOLEAN NOT NULL,
  response_time INTEGER,
  error TEXT,
  checked_at TIMESTAMP NOT NULL
);
```

**Автоматическая реакция:**

Если health check failed и `server.status = 'active'`:
```typescript
// Автоматически меняем статус
server.status = 'offline'
```

### Cron для периодических проверок

**Настройка cron job:**

```typescript
// src/lib/cron/server-health-checks.ts

import { serverService } from '@/modules/servers/server.service';

export async function runServerHealthChecks() {
  const servers = await serverService.getAllServers({
    isActive: true,
    status: 'active',
  });

  for (const server of servers) {
    await serverService.performHealthCheck(server.id);
  }
}

// Запуск каждые 5 минут
schedule('*/5 * * * *', runServerHealthChecks);
```

---

## Capacity Management

### IP Pool Management

Каждый сервер имеет IP pool для выдачи пользователям:

```typescript
server = {
  ipPoolStart: '10.0.1.2',
  ipPoolEnd: '10.0.1.254',
  maxUsers: 1000
}

// Всего IP адресов в пуле
totalIps = ipToNumber(ipPoolEnd) - ipToNumber(ipPoolStart) + 1
// = 253 IPs

// Использовано IP (всего конфигов на сервере)
usedIps = count(vpn_configs where serverId = server.id)

// Доступно IP
availableIps = totalIps - usedIps
```

**Важно:**
- IP Pool должен быть >= 10 адресов
- IP Pool не может быть > 65536 адресов
- ipPoolStart <= ipPoolEnd (валидируется при создании)

### Capacity Limits

```typescript
server.maxUsers = 1000  // Максимальное количество пользователей

activeUsers = count(vpn_configs where serverId=X AND isActive=true)

capacityUsed = (activeUsers / maxUsers) * 100  // Percentage

availableSlots = maxUsers - activeUsers
```

**Предупреждения:**
- ⚠️ capacityUsed > 70% → "moderate load"
- 🔴 capacityUsed > 90% → сервер исключается из load balancing
- 🚫 capacityUsed >= 100% → сервер полностью заполнен

### Capacity Info Endpoint

```typescript
GET /api/servers/:serverId/capacity

{
  serverId: string
  maxUsers: 1000
  currentUsers: 750
  availableSlots: 250
  capacityPercentage: 75
  ipPoolSize: 253
  ipPoolUsed: 850      // Total configs (including inactive)
  ipPoolAvailable: -597  // ⚠️ IP pool exhausted!
}
```

**Critical:** Если `ipPoolAvailable < 0` → нельзя создавать новые конфиги!

---

## Настройка

### 1. Создание нового сервера

```bash
POST /api/servers
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Germany VPN #1",
  "host": "vpn-de-1.example.com",
  "port": 51820,
  "publicKey": "base64-encoded-public-key",
  "endpoint": "vpn-de-1.example.com:51820",
  "location": "Frankfurt, Germany",
  "countryCode": "DE",
  "ipPoolStart": "10.0.2.2",
  "ipPoolEnd": "10.0.2.254",
  "maxUsers": 500,
  "agentApiUrl": "https://vpn-de-1.example.com:8443",
  "agentApiToken": "secure-bearer-token",
  "dns": "1.1.1.1, 1.0.0.1",
  "isActive": true
}
```

### 2. Получение публичного ключа сервера

На VPN сервере:

```bash
# WireGuard public key
wg show wg0 public-key
```

### 3. Настройка VPN Agent

На VPN сервере должен быть запущен VPN Agent с API:

```bash
# VPN Agent слушает на https://localhost:8443
# Endpoint: GET /health
# Authorization: Bearer <agentApiToken>
```

См. [VPN Agent README](../vpn/VPN_AGENT.md) для подробностей.

### 4. Health Check Setup

```bash
# Manual health check (admin)
POST /api/servers/{serverId}/health

# Automated (cron)
# Настроить cron job для runServerHealthChecks()
```

---

## Troubleshooting

### Server Health Check Failed

**Симптомы:**
```json
{
  "isHealthy": false,
  "error": "connect ECONNREFUSED",
  "details": { "agentReachable": false }
}
```

**Причины:**

1. **VPN Agent не запущен**
   ```bash
   # На сервере
   systemctl status vpn-agent
   systemctl start vpn-agent
   ```

2. **Firewall блокирует агент API**
   ```bash
   # Открыть порт 8443
   ufw allow 8443/tcp
   ```

3. **Неверный agentApiToken**
   ```bash
   # Проверить токен в конфигурации агента
   cat /etc/vpn-agent/config.json
   ```

4. **SSL сертификат невалиден**
   - Агент использует self-signed cert
   - Убедитесь, что VPN Agent Client игнорирует SSL ошибки в dev mode

**Решение:**

```bash
# 1. Проверить агент
curl -k https://vpn-server:8443/health \
  -H "Authorization: Bearer <token>"

# 2. Проверить логи
journalctl -u vpn-agent -f

# 3. Обновить токен через API
PATCH /api/servers/{serverId}
{
  "agentApiToken": "new-token"
}
```

---

### Server At Capacity

**Симптомы:**
```
ValidationError: All servers are at capacity
```

**Причина:**
- Все серверы загружены > `maxCapacity` (default 90%)

**Решение:**

1. **Увеличить maxUsers на существующих серверах:**
   ```bash
   PATCH /api/servers/{serverId}
   { "maxUsers": 2000 }
   ```

2. **Добавить новый сервер:**
   ```bash
   POST /api/servers
   { ... }
   ```

3. **Деактивировать неиспользуемые конфиги:**
   ```sql
   -- Найти неактивные конфиги старше 30 дней
   SELECT * FROM vpn_configs
   WHERE is_active = false
   AND updated_at < NOW() - INTERVAL '30 days';

   -- Удалить (освобождает IP)
   DELETE FROM vpn_configs WHERE id IN (...);
   ```

---

### IP Pool Exhausted

**Симптомы:**
```bash
GET /api/servers/{serverId}

{
  "stats": {
    "capacityUsed": 50  # Выглядит нормально
  }
}

# Но при создании конфига:
POST /api/vpn/configs
→ Error: "No available IPs in pool"
```

**Причина:**
- `ipPoolAvailable < 0`
- Слишком много ВСЕХ конфигов (active + inactive)

**Решение:**

1. **Проверить capacity info:**
   ```bash
   GET /api/servers/{serverId}/capacity

   {
     "ipPoolSize": 253,
     "ipPoolUsed": 300,   # ⚠️ Больше чем размер пула!
     "ipPoolAvailable": -47
   }
   ```

2. **Удалить неактивные конфиги:**
   ```sql
   DELETE FROM vpn_configs
   WHERE server_id = '{serverId}'
   AND is_active = false
   AND updated_at < NOW() - INTERVAL '7 days';
   ```

3. **Расширить IP pool:**
   ```bash
   PATCH /api/servers/{serverId}
   {
     "ipPoolStart": "10.0.1.2",
     "ipPoolEnd": "10.0.2.254"  # Increased range
   }
   ```

---

### Load Balancing Not Working

**Симптомы:**
- Все пользователи попадают на один сервер

**Причины:**

1. **Только один активный сервер:**
   ```bash
   GET /api/servers?status=active
   # Returns только 1 сервер
   ```

2. **Preferred country слишком строгий:**
   ```bash
   GET /api/servers/optimal?preferredCountry=JP
   # В базе нет серверов в Японии
   ```

**Решение:**

```bash
# 1. Добавить больше серверов
POST /api/servers

# 2. Активировать существующие
PATCH /api/servers/{serverId}
{ "isActive": true, "status": "active" }

# 3. Не указывать preferredCountry (или делать fallback)
GET /api/servers/optimal
# Без country → выберет любой доступный
```

---

## Security Considerations

### 1. Admin Endpoints Protection

Все admin endpoints требуют:
- ✅ Authentication (`requireAuth`)
- ✅ Admin role check (`user.isAdmin = true`)

### 2. VPN Agent Token Security

```typescript
// agentApiToken хранится в БД (encrypted рекомендуется)
server.agentApiToken = "secure-random-token"

// При запросах к VPN Agent:
Authorization: Bearer <agentApiToken>
```

**Best practices:**
- Генерировать длинные случайные токены (>32 chars)
- Ротировать токены периодически
- Не логировать токены

### 3. IP Pool Isolation

Серверы используют разные IP диапазоны:
```
Server 1: 10.0.1.0/24
Server 2: 10.0.2.0/24
Server 3: 10.0.3.0/24
```

Это предотвращает IP коллизии.

---

## Performance Tips

### Индексы базы данных

```sql
-- Для быстрого поиска серверов
CREATE INDEX idx_vpn_servers_status ON vpn_servers(status);
CREATE INDEX idx_vpn_servers_country ON vpn_servers(country_code);
CREATE INDEX idx_vpn_servers_active ON vpn_servers(is_active);

-- Для расчета capacity
CREATE INDEX idx_vpn_configs_server_active
  ON vpn_configs(server_id, is_active);

-- Для health checks
CREATE INDEX idx_health_checks_server_time
  ON server_health_checks(server_id, checked_at DESC);
```

### Кеширование

```typescript
// Кешировать optimal server на 5 минут
import { redis } from '@/lib/redis';

const cacheKey = `optimal_server:${preferredCountry || 'any'}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await serverService.getOptimalServer(criteria);

await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min
return result;
```

---

## Related Documentation

- [VPN Module](../vpn/README.md)
- [MONITORING Module](../monitoring/README.md)
- [VPN Agent API](../vpn/VPN_AGENT.md)
