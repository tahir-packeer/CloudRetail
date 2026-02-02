-- ===================================
-- CloudRetail Database Initialization
-- Create all databases first
-- ===================================

-- Create all databases
CREATE DATABASE
IF NOT EXISTS auth_db;
CREATE DATABASE
IF NOT EXISTS catalog_db;
CREATE DATABASE
IF NOT EXISTS cart_db;
CREATE DATABASE
IF NOT EXISTS order_db;
CREATE DATABASE
IF NOT EXISTS payment_db;
CREATE DATABASE
IF NOT EXISTS analytics_db;

-- Create user for CloudRetail services
CREATE USER
IF NOT EXISTS 'cloudretail_user'@'%' IDENTIFIED BY 'CloudRetail@2026';
CREATE USER
IF NOT EXISTS 'cloudretail_user'@'localhost' IDENTIFIED BY 'CloudRetail@2026';

-- Grant privileges
GRANT ALL PRIVILEGES ON auth_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON order_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON analytics_db.* TO 'cloudretail_user'@'%';

GRANT ALL PRIVILEGES ON auth_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON order_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON payment_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON analytics_db.* TO 'cloudretail_user'@'localhost';

FLUSH PRIVILEGES;
