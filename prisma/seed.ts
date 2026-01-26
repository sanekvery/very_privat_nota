import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Генерация реферального кода
function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  console.log('🌱 Начинаем наполнение базы данных...');

  // ====================
  // Системные настройки
  // ====================
  console.log('📝 Создаем системные настройки...');

  await prisma.systemSettings.upsert({
    where: { key: 'referral_first_payment_percentage' },
    update: {},
    create: {
      key: 'referral_first_payment_percentage',
      value: 20,
      description: 'Процент от первого платежа реферала',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'referral_recurring_percentage' },
    update: {},
    create: {
      key: 'referral_recurring_percentage',
      value: 10,
      description: 'Процент от повторных платежей реферала',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'referral_min_withdrawal' },
    update: {},
    create: {
      key: 'referral_min_withdrawal',
      value: 100,
      description: 'Минимальная сумма для вывода средств (в TON)',
    },
  });

  await prisma.systemSettings.upsert({
    where: { key: 'withdrawal_enabled' },
    update: {},
    create: {
      key: 'withdrawal_enabled',
      value: false,
      description: 'Включить функцию вывода средств',
    },
  });

  // ====================
  // Администратор
  // ====================
  console.log('👤 Создаем тестового администратора...');

  const admin = await prisma.user.upsert({
    where: { telegramId: BigInt(123456789) },
    update: {},
    create: {
      telegramId: BigInt(123456789),
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      languageCode: 'ru',
      isAdmin: true,
      referralCode: 'ADMIN001',
    },
  });

  console.log(`   ✓ Администратор создан: ${admin.username} (ID: ${admin.id})`);

  // ====================
  // Тестовые пользователи
  // ====================
  console.log('👥 Создаем тестовых пользователей...');

  const users = await Promise.all([
    prisma.user.upsert({
      where: { telegramId: BigInt(111111111) },
      update: {},
      create: {
        telegramId: BigInt(111111111),
        username: 'test_user_1',
        firstName: 'Иван',
        lastName: 'Иванов',
        languageCode: 'ru',
        referralCode: generateReferralCode(),
      },
    }),
    prisma.user.upsert({
      where: { telegramId: BigInt(222222222) },
      update: {},
      create: {
        telegramId: BigInt(222222222),
        username: 'test_user_2',
        firstName: 'John',
        lastName: 'Doe',
        languageCode: 'en',
        referralCode: generateReferralCode(),
      },
    }),
    prisma.user.upsert({
      where: { telegramId: BigInt(333333333) },
      update: {},
      create: {
        telegramId: BigInt(333333333),
        username: 'test_user_3',
        firstName: 'Мария',
        lastName: 'Петрова',
        languageCode: 'ru',
        referralCode: generateReferralCode(),
        referredBy: 'ADMIN001', // Реферал админа
      },
    }),
  ]);

  console.log(`   ✓ Создано пользователей: ${users.length}`);

  // ====================
  // Тарифные планы
  // ====================
  console.log('💳 Создаем тарифные планы...');

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'basic-plan' },
    update: {},
    create: {
      id: 'basic-plan',
      name: 'Базовый',
      nameEn: 'Basic',
      description: 'Один VPN конфиг для одного устройства',
      descriptionEn: 'One VPN config for one device',
      maxConfigs: 1,
      durationDays: 30,
      price: 5,
      isCustom: false,
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'pro-plan' },
    update: {},
    create: {
      id: 'pro-plan',
      name: 'Профессиональный',
      nameEn: 'Pro',
      description: 'Три VPN конфига для нескольких устройств',
      descriptionEn: 'Three VPN configs for multiple devices',
      maxConfigs: 3,
      durationDays: 30,
      price: 12,
      isCustom: false,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { id: 'family-plan' },
    update: {},
    create: {
      id: 'family-plan',
      name: 'Семейный',
      nameEn: 'Family',
      description: 'Пять VPN конфигов для всей семьи',
      descriptionEn: 'Five VPN configs for the whole family',
      maxConfigs: 5,
      durationDays: 30,
      price: 20,
      isCustom: false,
      isActive: true,
    },
  });

  console.log(`   ✓ Создано планов: 3 (Basic, Pro, Family)`);

  // ====================
  // VPN Серверы
  // ====================
  console.log('🌍 Создаем VPN серверы...');

  const servers = await Promise.all([
    prisma.vpnServer.create({
      data: {
        name: 'Netherlands - Amsterdam',
        countryCode: 'NL',
        city: 'Amsterdam',
        host: 'nl-ams-01.example.com',
        port: 443,
        agentApiUrl: 'https://nl-ams-01.example.com:443',
        agentBearerToken: randomBytes(32).toString('hex'),
        publicKey: 'SERVER_PUBLIC_KEY_PLACEHOLDER_NL',
        endpoint: 'nl-ams-01.example.com:51820',
        listenPort: 51820,
        subnet: '10.0.1.0/24',
        dns: '1.1.1.1,8.8.8.8',
        maxUsers: 1000,
        currentUsers: 0,
        status: 'active',
        priority: 100,
        isActive: true,
      },
    }),
    prisma.vpnServer.create({
      data: {
        name: 'Germany - Frankfurt',
        countryCode: 'DE',
        city: 'Frankfurt',
        host: 'de-fra-01.example.com',
        port: 443,
        agentApiUrl: 'https://de-fra-01.example.com:443',
        agentBearerToken: randomBytes(32).toString('hex'),
        publicKey: 'SERVER_PUBLIC_KEY_PLACEHOLDER_DE',
        endpoint: 'de-fra-01.example.com:51820',
        listenPort: 51820,
        subnet: '10.0.2.0/24',
        dns: '1.1.1.1,8.8.8.8',
        maxUsers: 1000,
        currentUsers: 0,
        status: 'active',
        priority: 90,
        isActive: true,
      },
    }),
    prisma.vpnServer.create({
      data: {
        name: 'United States - New York',
        countryCode: 'US',
        city: 'New York',
        host: 'us-nyc-01.example.com',
        port: 443,
        agentApiUrl: 'https://us-nyc-01.example.com:443',
        agentBearerToken: randomBytes(32).toString('hex'),
        publicKey: 'SERVER_PUBLIC_KEY_PLACEHOLDER_US',
        endpoint: 'us-nyc-01.example.com:51820',
        listenPort: 51820,
        subnet: '10.0.3.0/24',
        dns: '1.1.1.1,8.8.8.8',
        maxUsers: 1000,
        currentUsers: 0,
        status: 'active',
        priority: 80,
        isActive: true,
      },
    }),
  ]);

  console.log(`   ✓ Создано серверов: ${servers.length}`);

  // ====================
  // IP Pool для каждого сервера
  // ====================
  console.log('🔢 Создаем IP пулы для серверов...');

  let totalIps = 0;
  for (const server of servers) {
    const [network] = server.subnet.split('/');
    if (!network) continue;
    const parts = network.split('.').map(Number);
    if (parts.length < 3) continue;
    const [oct1, oct2, oct3] = parts;

    // Создаем первые 10 IP для каждого сервера (для тестирования)
    const ips = [];
    for (let i = 2; i <= 11; i++) {
      ips.push({
        serverId: server.id,
        ipAddress: `${oct1}.${oct2}.${oct3}.${i}`,
        isAllocated: false,
      });
    }

    await prisma.ipPool.createMany({
      data: ips,
    });

    totalIps += ips.length;
  }

  console.log(`   ✓ Создано IP адресов: ${totalIps}`);

  // ====================
  // Промокоды
  // ====================
  console.log('🎁 Создаем тестовые промокоды...');

  await prisma.promoCode.create({
    data: {
      code: 'WELCOME2025',
      planId: basicPlan.id,
      durationDays: 7,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      createdBy: admin.id,
    },
  });

  await prisma.promoCode.create({
    data: {
      code: 'TESTPROMO',
      planId: proPlan.id,
      durationDays: 14,
      maxUses: 10,
      usedCount: 0,
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log(`   ✓ Создано промокодов: 2`);

  // ====================
  // Новости
  // ====================
  console.log('📰 Создаем тестовые новости...');

  await prisma.news.create({
    data: {
      title: 'Добро пожаловать в наш VPN сервис!',
      titleEn: 'Welcome to our VPN service!',
      content: `# Добро пожаловать!

Мы рады приветствовать вас в нашем VPN сервисе. Здесь вы найдете:

- 🚀 Высокую скорость подключения
- 🔒 Полную конфиденциальность
- 🌍 Серверы по всему миру
- 💰 Выгодные тарифы

Выберите подходящий тарифный план и начните пользоваться VPN прямо сейчас!`,
      contentEn: `# Welcome!

We are glad to welcome you to our VPN service. Here you will find:

- 🚀 High connection speed
- 🔒 Complete privacy
- 🌍 Servers worldwide
- 💰 Affordable plans

Choose a suitable plan and start using VPN right now!`,
      isPublished: true,
      publishedAt: new Date(),
      createdBy: admin.id,
    },
  });

  console.log(`   ✓ Создано новостей: 1`);

  // ====================
  // Завершение
  // ====================
  console.log('');
  console.log('✅ База данных успешно заполнена!');
  console.log('');
  console.log('📊 Сводка:');
  console.log(`   • Администратор: admin (Telegram ID: 123456789)`);
  console.log(`   • Тестовых пользователей: ${users.length}`);
  console.log(`   • Тарифных планов: 3`);
  console.log(`   • VPN серверов: ${servers.length}`);
  console.log(`   • IP адресов в пуле: ${totalIps}`);
  console.log(`   • Промокодов: 2 (WELCOME2025, TESTPROMO)`);
  console.log(`   • Новостей: 1`);
  console.log('');
  console.log('🚀 Готово к разработке!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при наполнении базы данных:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
