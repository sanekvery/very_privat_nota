-- PostgreSQL initialization script
-- Runs automatically when database is created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create custom types
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('ton', 'promo_code', 'manual');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_user', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE server_status AS ENUM ('active', 'maintenance', 'overloaded', 'offline');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE notification_type AS ENUM ('subscription_expiring', 'subscription_expired', 'payment_received', 'support_reply', 'news', 'system');

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vpn_db TO vpn_user;
