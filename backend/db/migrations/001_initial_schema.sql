CREATE TABLE users(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT UNIQUE NOT NULL CHECK (LENGTH(TRIM(email)) > 0),
    password_hash TEXT NOT NULL CHECK (LENGTH(TRIM(password_hash)) > 0)
);

CREATE TABLE products(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE CHECK (LENGTH(TRIM(sku)) > 0),
    name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    price_cents INT NOT NULL CHECK (price_cents > 0),
    credits INT NOT NULL CHECK (credits > 0)
);

CREATE TABLE orders(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    credits INT NOT NULL CHECK (credits > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'paid', 'expired')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE payments(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INT NOT NULL,
    stripe_session_id TEXT UNIQUE,
    amount_cents INT NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE wallet_transactions(
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    order_id INT UNIQUE,
    credits INT NOT NULL CHECK (credits > 0),
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    CHECK (
    (type = 'IN' AND order_id IS NOT NULL)
    OR
    (type = 'OUT' AND order_id IS NULL))
);

CREATE UNIQUE INDEX one_successful_payment_per_order
ON payments(order_id)
WHERE status = 'succeeded';
