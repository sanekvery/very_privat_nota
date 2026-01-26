# MONITORING Module

Модуль системного мониторинга, сбора метрик, отслеживания здоровья системы и детекции абузов.

## Ответственность

- Сбор и агрегация метрик серверов
- Мониторинг состояния системы (health checks)
- Управление алертами
- Отслеживание использования bandwidth
- Детекция абузов пользователей
- Статистика для админ-панели

## Архитектура

```
src/modules/monitoring/
├── monitoring.types.ts           # Типы домена (15+ интерфейсов)
├── monitoring.validation.ts      # Zod схемы валидации
├── monitoring.service.ts         # Сервис мониторинга
├── abuse-detection.service.ts    # Сервис детекции абузов
└── README.md
```

## Типы

### SystemHealthSummary
```typescript
interface SystemHealthSummary {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  totalServers: number;
  healthyServers: number;
  degradedServers: number;
  criticalServers: number;
  offlineServers: number;
  totalUsers: number;
  activeUsers: number;
  totalBandwidth: number;  // bytes
  avgServerLoad: number;   // 0-100%
  alerts: Alert[];
}
```

### Alert
```typescript
interface Alert {
  id: string;
  type: string;                    // 'server_down', 'high_load', 'abuse_detection'
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  serverId?: string;
  userId?: string;
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

### AbuseDetectionResult
```typescript
interface AbuseDetectionResult {
  userId: string;
  isAbusive: boolean;
  reason?: string;
  score: number;                   // 0-100
  indicators: AbuseIndicator[];
  recommendation: 'monitor' | 'warn' | 'throttle' | 'ban';
}

interface AbuseIndicator {
  type: string;                    // 'excessive_bandwidth', 'too_many_configs'
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: number;
  threshold: number;
}
```

### MetricsAggregation
```typescript
interface MetricsAggregation {
  serverId?: string;
  period: string;
  avgBytesIn: number;
  avgBytesOut: number;
  totalBytesIn: number;
  totalBytesOut: number;
  peakActiveUsers: number;
  avgActiveUsers: number;
  totalConnections: number;
}
```

## MonitoringService

### Методы

#### getSystemHealth()
```typescript
const health = await monitoringService.getSystemHealth();
// Returns: SystemHealthSummary
```

Возвращает общее состояние системы:
- Подсчитывает серверы по статусам (active/maintenance/offline)
- Вычисляет среднюю загрузку серверов
- Агрегирует bandwidth за последний час
- Получает последние алерты
- Определяет overall health status

**Алгоритм расчета health status:**
- `critical`: если есть критичные серверы или все серверы offline
- `degraded`: если <50% здоровых серверов или avgLoad > 90%
- `degraded`: если есть деградированные серверы или avgLoad > 70%
- `healthy`: в остальных случаях

#### getServerMetrics(serverId, period, limit)
```typescript
const metrics = await monitoringService.getServerMetrics(
  'server-uuid',
  '24h',  // '1h' | '24h' | '7d' | '30d'
  100
);
// Returns: ServerMetric[]
```

Получает метрики сервера за указанный период.

#### getAggregatedMetrics(query)
```typescript
const aggregation = await monitoringService.getAggregatedMetrics({
  serverId: 'server-uuid',  // optional
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  },
  aggregation: 'avg',  // 'avg' | 'sum' | 'max' | 'min'
});
// Returns: MetricsAggregation
```

Агрегирует метрики с различными операциями.

#### getServerHealthTrend(serverId, period)
```typescript
const trend = await monitoringService.getServerHealthTrend(
  'server-uuid',
  '24h'
);
// Returns: ServerHealthTrend
```

Анализирует историю health checks:
- Uptime percentage
- Средний response time
- Количество успешных/неудачных проверок

#### getBandwidthUsage(params)
```typescript
const usage = await monitoringService.getBandwidthUsage({
  userId: 'user-uuid',    // optional
  serverId: 'server-uuid', // optional
  period: '24h',
});
// Returns: BandwidthUsage
```

Вычисляет использование bandwidth:
- Для конкретного пользователя (по всем его конфигам)
- Для конкретного сервера
- Для всей системы (если не указаны userId/serverId)

#### createAlert(input)
```typescript
const alert = await monitoringService.createAlert({
  type: 'server_down',
  severity: 'critical',
  message: 'Server XYZ is not responding',
  serverId: 'server-uuid',
  metadata: { lastSeen: new Date() },
});
```

Создает алерт:
- Хранит в Redis с TTL 7 дней
- Добавляет в список последних алертов (max 100)
- Логирует через Winston

#### resolveAlert(alertId)
```typescript
const alert = await monitoringService.resolveAlert('alert-uuid');
```

Помечает алерт как resolved.

#### getMonitoringStatistics()
```typescript
const stats = await monitoringService.getMonitoringStatistics();
// Returns: MonitoringStatistics
```

Комплексная статистика для админ-панели:
- System health summary
- Top 10 серверов по загрузке
- Top 10 пользователей по bandwidth (24h)
- Последние 20 алертов
- Количество детектированных абузов

## AbuseDetectionService

### Методы

#### detectAbuse(userId, period)
```typescript
const result = await abuseDetectionService.detectAbuse(
  'user-uuid',
  '24h'
);
// Returns: AbuseDetectionResult
```

Анализирует поведение пользователя на предмет абузов:

**Проверяемые индикаторы:**

1. **Bandwidth Abuse** (только для 24h):
   - High: >100 GB/day → medium severity
   - Critical: >500 GB/day → high severity

2. **Config Abuse**:
   - Слишком много активных конфигов (>5) → high
   - Слишком много всего конфигов (>10) → medium
   - Быстрое создание конфигов (>10 за 24h) → high
   - Множественные конфиги на одном сервере (>2) → medium

3. **Payment Abuse**:
   - Много неудачных платежей (≥5) → low
   - Много возвратов (≥3) → medium

**Scoring система:**
- Low severity: 10 баллов + бонус за превышение threshold
- Medium severity: 25 баллов + бонус
- High severity: 40 баллов + бонус
- Бонус = min((value/threshold - 1) * 100 * 0.5, 20)
- Максимальный score: 100

**Recommendations:**
- `monitor`: score ≥ 30
- `warn`: score ≥ 50
- `throttle`: score ≥ 70
- `ban`: score ≥ 90

**Автоматические действия:**
- При score ≥ 70: создает алерт (warning или critical)
- Логирует все детекции абузов

#### getAbuseStatistics(params)
```typescript
const stats = await abuseDetectionService.getAbuseStatistics({
  period: '24h',
  minScore: 50,  // только пользователи со score ≥ 50
});
// Returns: { totalChecked, abusiveUsers, averageScore, byRecommendation }
```

Проверяет всех пользователей системы и возвращает статистику.

**⚠️ Warning:** Медленная операция, вызывает `detectAbuse` для каждого пользователя.

## API Endpoints

### GET /api/monitoring/health
Получить состояние системы.

**Response:**
```json
{
  "status": "healthy",
  "totalServers": 10,
  "healthyServers": 9,
  "degradedServers": 1,
  "criticalServers": 0,
  "offlineServers": 0,
  "totalUsers": 1500,
  "activeUsers": 850,
  "totalBandwidth": 5368709120,
  "avgServerLoad": 65,
  "alerts": [...]
}
```

### GET /api/monitoring/bandwidth
Получить использование bandwidth.

**Query params:**
- `userId` (UUID, optional) - конкретный пользователь (admin only для других пользователей)
- `serverId` (UUID, optional) - конкретный сервер
- `period` ('1h' | '24h' | '7d' | '30d', default '24h')

**Response:**
```json
{
  "userId": "user-uuid",
  "bytesIn": 2147483648,
  "bytesOut": 3221225472,
  "totalBytes": 5368709120,
  "period": "24h"
}
```

### GET /api/monitoring/alerts
Получить последние алерты (admin only).

**Query params:**
- `limit` (number, default 20, max 100)

**Response:**
```json
[
  {
    "id": "alert-uuid",
    "type": "high_load",
    "severity": "warning",
    "message": "Server load exceeded 90%",
    "serverId": "server-uuid",
    "timestamp": "2024-01-20T12:00:00Z",
    "isResolved": false
  }
]
```

### POST /api/monitoring/alerts
Создать алерт (admin only).

**Body:**
```json
{
  "type": "custom_alert",
  "severity": "info",
  "message": "Custom monitoring alert",
  "serverId": "server-uuid",
  "metadata": { "customField": "value" }
}
```

### PATCH /api/monitoring/alerts/:alertId
Пометить алерт как resolved (admin only).

### GET /api/monitoring/servers/:serverId/metrics
Получить метрики сервера.

**Query params:**
- `period` ('1h' | '24h' | '7d' | '30d', default '24h')
- `limit` (number, default 100, max 1000)

**Response:** Array of ServerMetric

### GET /api/monitoring/servers/:serverId/health-trend
Получить health trend сервера.

**Query params:**
- `period` ('1h' | '24h' | '7d' | '30d', default '24h')

**Response:**
```json
{
  "serverId": "server-uuid",
  "period": "24h",
  "checks": [...],
  "uptimePercentage": 99.5,
  "avgResponseTime": 45,
  "failureCount": 2,
  "successCount": 288
}
```

### GET /api/monitoring/abuse/:userId
Детектировать абузы пользователя (admin only).

**Query params:**
- `period` ('1h' | '24h' | '7d' | '30d', default '24h')

**Response:**
```json
{
  "userId": "user-uuid",
  "isAbusive": true,
  "reason": "Excessive bandwidth usage: 150.50 GB in 24h",
  "score": 75,
  "indicators": [
    {
      "type": "excessive_bandwidth",
      "severity": "high",
      "description": "Excessive bandwidth usage: 150.50 GB in 24h",
      "value": 161061273600,
      "threshold": 107374182400
    }
  ],
  "recommendation": "throttle"
}
```

### GET /api/monitoring/statistics
Получить комплексную статистику (admin only).

**Query params:**
- `includeAbuseStats` (boolean, default false) - включить детальную статистику по абузам (медленно)

**Response:**
```json
{
  "systemHealth": { ... },
  "topServersByLoad": [
    { "serverId": "...", "serverName": "US-NY-01", "load": 85 }
  ],
  "topUsersByBandwidth": [
    { "userId": "...", "username": "user123", "bandwidth": 5368709120 }
  ],
  "recentAlerts": [...],
  "abuseDetections": 0,
  "abuseStats": {
    "totalChecked": 1500,
    "abusiveUsers": 15,
    "averageScore": 12,
    "byRecommendation": {
      "monitor": 10,
      "warn": 3,
      "throttle": 2,
      "ban": 0
    }
  }
}
```

## Redis Storage

### Alerts
```
Key: alert:{alertId}
Value: JSON serialized Alert
TTL: 7 days (604800 seconds)

Key: alerts:recent
Type: List
Value: Alert IDs (max 100)
```

## Интеграции

### С модулем SERVERS
- Использует `VpnServer` для определения health status
- Читает `ServerMetric` для bandwidth и load metrics
- Читает `ServerHealthCheck` для uptime analysis

### С модулем VPN
- Читает `VpnConfig` для определения активных пользователей
- Использует конфиги для расчета bandwidth по пользователям

### С модулем PAYMENTS
- Читает `Payment` для детекции payment abuse
- Анализирует failed/refunded платежи

### С Redis
- Хранит алерты временно (7 дней)
- Список последних алертов для быстрого доступа

### С Winston Logger
- Логирует все алерты
- Логирует детекции абузов

## Примеры использования

### Мониторинг состояния системы
```typescript
import { monitoringService } from '@/modules/monitoring/monitoring.service';

// Dashboard
const health = await monitoringService.getSystemHealth();

if (health.status === 'critical') {
  console.error('System is in critical state!');
}

console.log(`Average server load: ${health.avgServerLoad}%`);
console.log(`Active users: ${health.activeUsers}`);
```

### Анализ bandwidth пользователя
```typescript
// За последние 24 часа
const usage = await monitoringService.getBandwidthUsage({
  userId: 'user-uuid',
  period: '24h',
});

const usageGB = usage.totalBytes / (1024 ** 3);
console.log(`User consumed ${usageGB.toFixed(2)} GB in 24h`);
```

### Детекция абузов
```typescript
import { abuseDetectionService } from '@/modules/monitoring/abuse-detection.service';

const result = await abuseDetectionService.detectAbuse('user-uuid', '24h');

if (result.isAbusive) {
  console.warn(`User ${result.userId} is abusive!`);
  console.warn(`Reason: ${result.reason}`);
  console.warn(`Recommendation: ${result.recommendation}`);

  if (result.recommendation === 'ban') {
    // Take action...
  }
}
```

### Создание кастомного алерта
```typescript
await monitoringService.createAlert({
  type: 'maintenance_scheduled',
  severity: 'info',
  message: 'Server US-NY-01 will undergo maintenance at 02:00 UTC',
  serverId: 'server-uuid',
  metadata: {
    scheduledAt: new Date('2024-01-21T02:00:00Z'),
    duration: '2 hours',
  },
});
```

### Получение статистики для админки
```typescript
// Быстрая статистика
const stats = await monitoringService.getMonitoringStatistics();

// С детальным анализом абузов (медленно)
const detailedStats = await monitoringService.getMonitoringStatistics();
const abuseStats = await abuseDetectionService.getAbuseStatistics({
  period: '24h',
  minScore: 50,
});

console.log(`Found ${abuseStats.abusiveUsers} abusive users out of ${abuseStats.totalChecked}`);
```

## Performance Considerations

### Кеширование
- Алерты кешируются в Redis с TTL 7 дней
- Список последних алертов хранится в Redis для O(1) доступа

### Оптимизация запросов
- `getSystemHealth()`: использует `Promise.all` для параллельных запросов
- `detectAbuse()`: запускает все проверки параллельно
- Metrics агрегируются на уровне приложения (не DB)

### Медленные операции
- `getAbuseStatistics()` - проверяет ВСЕХ пользователей, использовать с осторожностью
- `getMonitoringStatistics()` - выполняет множественные JOIN запросы

### Рекомендации
- Вызывать `getAbuseStatistics()` в background jobs, не в API handlers
- Использовать pagination для metrics endpoints
- Настроить индексы на `ServerMetric.timestamp` и `ServerHealthCheck.checkedAt`

## Возможные улучшения

1. **Metrics Aggregation в БД**: Использовать TimescaleDB или ClickHouse для эффективного хранения метрик
2. **Real-time Alerts**: WebSocket connections для live alerts
3. **Connection Logging**: Добавить таблицу для логирования подключений (для более точной детекции абузов)
4. **Anomaly Detection**: ML-модель для обнаружения необычных паттернов
5. **Alert Rules Engine**: Настраиваемые правила для автоматического создания алертов
6. **Metrics Retention**: Автоматическая очистка старых метрик
7. **Dashboard Caching**: Кешировать dashboard data в Redis
8. **Grafana Integration**: Экспорт метрик в Prometheus формате
