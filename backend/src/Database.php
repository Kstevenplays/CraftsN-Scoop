<?php

declare(strict_types=1);

namespace App;

use PDO;

final class Database
{
    private PDO $pdo;

    public function __construct(string $dbPath)
    {
        $directory = dirname($dbPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $this->pdo = new PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $this->migrate();
        $this->seed();
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    private function migrate(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT "customer",
                phone TEXT DEFAULT NULL,
                created_at TEXT NOT NULL
            )'
        );

        // Add phone column to existing tables that may not have it
        try {
            $this->pdo->exec('ALTER TABLE users ADD COLUMN phone TEXT DEFAULT NULL');
        } catch (\PDOException) {
            // Column already exists — safe to ignore
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT "Crafts",
                price REAL NOT NULL,
                image_url TEXT,
                stock INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT "pending",
                payment_status TEXT NOT NULL DEFAULT "pending_payment",
                receipt_url TEXT DEFAULT NULL,
                shipping_fee REAL NOT NULL,
                subtotal REAL NOT NULL,
                total REAL NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                shipping_address TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                unit_price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                line_total REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )'
        );

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )'
        );

        // Add columns to existing tables
        try { $this->pdo->exec('ALTER TABLE products ADD COLUMN category TEXT DEFAULT "Crafts"'); } catch (\PDOException) {}
        try { $this->pdo->exec('ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT "pending_payment"'); } catch (\PDOException) {}
        try { $this->pdo->exec('ALTER TABLE orders ADD COLUMN receipt_url TEXT DEFAULT NULL'); } catch (\PDOException) {}
        try { $this->pdo->exec('ALTER TABLE orders ADD COLUMN email TEXT'); } catch (\PDOException) {}
        try { $this->pdo->exec('ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT "gcash_qr"'); } catch (\PDOException) {}
        try { $this->pdo->exec('ALTER TABLE orders ADD COLUMN receipt_image_path TEXT'); } catch (\PDOException) {}
    }

    private function seed(): void
    {
        $adminEmail = (string) ($_ENV['ADMIN_EMAIL'] ?? 'admin@craftsnscoop.local');
        $adminPassword = (string) ($_ENV['ADMIN_PASSWORD'] ?? 'admin12345');

        $stmt = $this->pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $adminEmail]);
        if (!$stmt->fetch()) {
            $insert = $this->pdo->prepare(
                'INSERT INTO users (name, email, password_hash, role, created_at)
                 VALUES (:name, :email, :password_hash, :role, :created_at)'
            );
            $insert->execute([
                'name' => 'Admin',
                'email' => $adminEmail,
                'password_hash' => password_hash($adminPassword, PASSWORD_BCRYPT),
                'role' => 'admin',
                'created_at' => gmdate('c'),
            ]);
        }

        $count = (int) $this->pdo->query('SELECT COUNT(*) AS count FROM products')->fetch()['count'];
        if ($count > 0) {
            return;
        }

        $products = [
            [
                'name' => 'Handwoven Rattan Basket',
                'description' => 'Natural handcrafted basket perfect for storage and decor.',
                'price' => 420,
                'image_url' => 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
                'stock' => 14,
            ],
            [
                'name' => 'Ceramic Ice Cream Scoop Bowl',
                'description' => 'Glossy artisan bowl designed for premium dessert serving.',
                'price' => 280,
                'image_url' => 'https://images.unsplash.com/photo-1579954115563-e72bf1381629?auto=format&fit=crop&w=800&q=80',
                'stock' => 25,
            ],
            [
                'name' => 'Macrame Wall Hanging',
                'description' => 'Boho-inspired hand-knotted wall piece for modern homes.',
                'price' => 650,
                'image_url' => 'https://images.unsplash.com/photo-1620121478247-ec786b9be2fa?auto=format&fit=crop&w=800&q=80',
                'stock' => 9,
            ],
            [
                'name' => 'Wooden Scoop Set',
                'description' => 'Set of 3 polished scoops for coffee, tea, and spices.',
                'price' => 190,
                'image_url' => 'https://images.unsplash.com/photo-1521483418887-33a7e68181be?auto=format&fit=crop&w=800&q=80',
                'stock' => 35,
            ],
        ];

        $insertProduct = $this->pdo->prepare(
            'INSERT INTO products (name, description, price, image_url, stock, is_active, created_at)
             VALUES (:name, :description, :price, :image_url, :stock, :is_active, :created_at)'
        );

        foreach ($products as $product) {
            $insertProduct->execute([
                'name' => $product['name'],
                'description' => $product['description'],
                'price' => $product['price'],
                'image_url' => $product['image_url'],
                'stock' => $product['stock'],
                'is_active' => 1,
                'created_at' => gmdate('c'),
            ]);
        }
    }
}
