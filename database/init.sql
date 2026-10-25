-- Initial schema and seed data for PostgreSQL Testing Lab
-- Executed automatically by postgres container on first boot

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    "fullName" VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    city VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial records for testing
INSERT INTO users (name, email, age) VALUES 
('Ahmad Fauzi', 'ahmad@example.com', 28),
('Siti Rahma', 'siti@example.com', 24),
('Budi Santoso', 'budi@example.com', 35)
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, price, stock, description) VALUES
('Mechanical Keyboard RGB', 850000.00, 15, 'Tenkeyless wireless keyboard with hot-swappable switches'),
('Ergonomic Mouse 2.4G', 350000.00, 30, 'Rechargeable vertical ergonomic mouse'),
('USB-C 8-in-1 Hub', 275000.00, 50, 'Aluminum multi-port adapter with 4K HDMI and 100W PD')
ON CONFLICT DO NOTHING;

INSERT INTO customers ("fullName", phone, city) VALUES
('Dewi Lestari', '081234567890', 'Jakarta'),
('Rian Pratama', '082198765432', 'Bandung'),
('Maya Safitri', '085712349876', 'Surabaya')
ON CONFLICT DO NOTHING;
