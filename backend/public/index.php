<?php

declare(strict_types=1);

use App\Auth;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;
use Slim\Routing\RouteCollectorProxy;

[$app, $pdo, $auth, $jwtMiddleware, $adminMiddleware] = require __DIR__ . '/../src/bootstrap.php';

$app->get('/health', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode(['status' => 'ok'], JSON_THROW_ON_ERROR));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->group('/api', function (RouteCollectorProxy $api) use ($pdo, $auth, $jwtMiddleware, $adminMiddleware) {
    $api->post('/auth/register', function (Request $request, Response $response) use ($pdo, $auth) {
        $data = (array) $request->getParsedBody();
        $name = trim((string) ($data['name'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            return json($response, ['message' => 'Name, email and password are required'], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return json($response, ['message' => 'Invalid email format'], 422);
        }

        if (strlen($password) < 6) {
            return json($response, ['message' => 'Password must be at least 6 characters'], 422);
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $exists->execute(['email' => $email]);
        if ($exists->fetch()) {
            return json($response, ['message' => 'Email is already registered'], 409);
        }

        $insert = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role, created_at)
             VALUES (:name, :email, :password_hash, :role, :created_at)'
        );
        $insert->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'role' => 'customer',
            'created_at' => gmdate('c'),
        ]);

        $userId = (int) $pdo->lastInsertId();
        $token = $auth->issueToken([
            'id' => $userId,
            'name' => $name,
            'email' => $email,
            'role' => 'customer',
        ]);

        return json($response, [
            'token' => $token,
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'role' => 'customer',
            ],
        ], 201);
    });

    $api->post('/auth/login', function (Request $request, Response $response) use ($pdo, $auth) {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            return json($response, ['message' => 'Invalid credentials'], 401);
        }

        $token = $auth->issueToken([
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ]);

        return json($response, [
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ]);
    });

    $api->get('/products', function (Request $request, Response $response) use ($pdo) {
        $queryParams = $request->getQueryParams();
        $admin = ($queryParams['admin'] ?? '') === '1';

        $where = '';
        if (!$admin) {
            $where = 'WHERE is_active = 1';
        }

        // determine order
        $sort = (string) ($queryParams['sort'] ?? '');
        $orderBy = 'ORDER BY id DESC';
        if ($sort === 'created_at') {
            $orderBy = 'ORDER BY created_at DESC';
        }

        // limit (safe integer, capped)
        $limit = 0;
        if (isset($queryParams['limit'])) {
            $limit = (int) $queryParams['limit'];
            if ($limit < 0) {
                $limit = 0;
            }
            $limit = min($limit, 100);
        }

        $sql = sprintf('SELECT * FROM products %s %s', $where, $orderBy);
        if ($limit > 0) {
            $sql .= ' LIMIT ' . $limit;
        }

        $stmt = $pdo->query($sql);
        $products = $stmt->fetchAll();
        return json($response, ['products' => $products]);
    });

    $api->get('/products/{id}', function (Request $request, Response $response, array $args) use ($pdo) {
        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $args['id']]);
        $product = $stmt->fetch();

        if (!$product || (int) $product['is_active'] !== 1) {
            return json($response, ['message' => 'Product not found'], 404);
        }

        return json($response, ['product' => $product]);
    });

    $api->group('', function (RouteCollectorProxy $protected) use ($pdo) {
        $protected->get('/me', function (Request $request, Response $response) {
            $user = $request->getAttribute('user');
            return json($response, [
                'user' => [
                    'id' => (int) ($user['sub'] ?? 0),
                    'name' => $user['name'] ?? '',
                    'email' => $user['email'] ?? '',
                    'role' => $user['role'] ?? 'customer',
                ],
            ]);
        });

        $protected->get('/users/profile', function (Request $request, Response $response) use ($pdo) {
            $user = $request->getAttribute('user');
            $stmt = $pdo->prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => (int) ($user['sub'] ?? 0)]);
            $profile = $stmt->fetch();

            if (!$profile) {
                return json($response, ['message' => 'User not found'], 404);
            }

            return json($response, ['user' => $profile]);
        });

        $protected->put('/users/profile', function (Request $request, Response $response) use ($pdo) {
            $user = $request->getAttribute('user');
            $data = (array) $request->getParsedBody();
            $userId = (int) ($user['sub'] ?? 0);

            $name = trim((string) ($data['name'] ?? ''));
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $phone = isset($data['phone']) ? trim((string) $data['phone']) : null;
            $currentPassword = (string) ($data['current_password'] ?? '');
            $newPassword = (string) ($data['new_password'] ?? '');

            if ($name === '' || $email === '') {
                return json($response, ['message' => 'Name and email are required'], 422);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return json($response, ['message' => 'Invalid email format'], 422);
            }

            // If changing password, verify current password
            if ($newPassword !== '') {
                if ($currentPassword === '') {
                    return json($response, ['message' => 'Current password is required to set a new password'], 422);
                }

                $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
                $stmt->execute(['id' => $userId]);
                $row = $stmt->fetch();

                if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
                    return json($response, ['message' => 'Current password is incorrect'], 401);
                }

                if (strlen($newPassword) < 6) {
                    return json($response, ['message' => 'New password must be at least 6 characters'], 422);
                }
            } elseif ($currentPassword !== '') {
                return json($response, ['message' => 'New password is required when providing current password'], 422);
            }

            // Check email uniqueness (exclude current user)
            $existing = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
            $existing->execute(['email' => $email, 'id' => $userId]);
            if ($existing->fetch()) {
                return json($response, ['message' => 'Email is already in use'], 409);
            }

            if ($newPassword !== '') {
                $stmt = $pdo->prepare(
                    'UPDATE users SET name = :name, email = :email, phone = :phone, password_hash = :password_hash WHERE id = :id'
                );
                $stmt->execute([
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'password_hash' => password_hash($newPassword, PASSWORD_BCRYPT),
                    'id' => $userId,
                ]);
            } else {
                $stmt = $pdo->prepare(
                    'UPDATE users SET name = :name, email = :email, phone = :phone WHERE id = :id'
                );
                $stmt->execute([
                    'name' => $name,
                    'email' => $email,
                    'phone' => $phone,
                    'id' => $userId,
                ]);
            }

            $stmt = $pdo->prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $userId]);
            $profile = $stmt->fetch();

            return json($response, ['message' => 'Profile updated successfully', 'user' => $profile]);
        });

        $protected->post('/orders', function (Request $request, Response $response) use ($pdo) {
            $user = $request->getAttribute('user');
            $data = (array) $request->getParsedBody();

            $items = $data['items'] ?? [];

            // Accept both old and new field names from frontend
            $fullName = trim((string) ($data['full_name'] ?? $data['customer_name'] ?? ''));
            $phone    = trim((string) ($data['phone'] ?? $data['customer_phone'] ?? ''));
            $email    = trim((string) ($data['email'] ?? $data['customer_email'] ?? ''));
            $deliveryAddress = trim((string) ($data['delivery_address'] ?? $data['shipping_address'] ?? ''));
            $paymentMethod   = trim((string) ($data['payment_method'] ?? 'gcash_qr'));
            $paymentStatus   = trim((string) ($data['payment_status'] ?? 'pending_payment'));
            $subtotalFromFrontend = isset($data['subtotal']) ? (float) $data['subtotal'] : null;
            $shippingFeeFromFrontend = isset($data['shipping_fee']) ? (float) $data['shipping_fee'] : null;
            $totalAmountFromFrontend = isset($data['total_amount']) ? (float) $data['total_amount'] : null;

            if (!is_array($items) || count($items) === 0) {
                return json($response, ['message' => 'Order items are required'], 422);
            }

            if ($fullName === '' || $phone === '' || $email === '' || $deliveryAddress === '') {
                return json($response, ['message' => 'full_name, phone, email, and delivery_address are required'], 422);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return json($response, ['message' => 'Invalid email format'], 422);
            }

            $shippingFee = $shippingFeeFromFrontend ?? (float) ($_ENV['SHIPPING_FEE'] ?? 80);
            $subtotal = 0.0;
            $normalized = [];

            foreach ($items as $item) {
                $productId = (int) ($item['product_id'] ?? 0);
                $qty = max(1, (int) ($item['quantity'] ?? 1));

                $productStmt = $pdo->prepare('SELECT * FROM products WHERE id = :id AND is_active = 1 LIMIT 1');
                $productStmt->execute(['id' => $productId]);
                $product = $productStmt->fetch();

                if (!$product) {
                    return json($response, ['message' => 'One or more products are invalid'], 422);
                }

                if ((int) $product['stock'] < $qty) {
                    return json($response, ['message' => 'Insufficient stock for ' . $product['name']], 422);
                }

                $lineTotal = (float) $product['price'] * $qty;
                $subtotal += $lineTotal;

                $normalized[] = [
                    'product' => $product,
                    'quantity' => $qty,
                    'line_total' => $lineTotal,
                ];
            }

            $total = $totalAmountFromFrontend ?? ($subtotal + $shippingFee);

            $pdo->beginTransaction();

            try {
                $insertOrder = $pdo->prepare(
                    'INSERT INTO orders (user_id, status, payment_status, email, payment_method, shipping_fee, subtotal, total, customer_name, customer_phone, shipping_address, created_at)
                     VALUES (:user_id, :status, :payment_status, :email, :payment_method, :shipping_fee, :subtotal, :total, :customer_name, :customer_phone, :shipping_address, :created_at)'
                );
                $insertOrder->execute([
                    'user_id' => (int) ($user['sub'] ?? 0),
                    'status' => 'pending',
                    'payment_status' => $paymentStatus,
                    'email' => $email,
                    'payment_method' => $paymentMethod,
                    'shipping_fee' => $shippingFee,
                    'subtotal' => $subtotal,
                    'total' => $total,
                    'customer_name' => $fullName,
                    'customer_phone' => $phone,
                    'shipping_address' => $deliveryAddress,
                    'created_at' => gmdate('c'),
                ]);

                $orderId = (int) $pdo->lastInsertId();

                $insertItem = $pdo->prepare(
                    'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
                     VALUES (:order_id, :product_id, :product_name, :unit_price, :quantity, :line_total)'
                );

                $updateStock = $pdo->prepare('UPDATE products SET stock = stock - :qty WHERE id = :id');

                foreach ($normalized as $entry) {
                    $product = $entry['product'];
                    $insertItem->execute([
                        'order_id' => $orderId,
                        'product_id' => (int) $product['id'],
                        'product_name' => $product['name'],
                        'unit_price' => (float) $product['price'],
                        'quantity' => $entry['quantity'],
                        'line_total' => $entry['line_total'],
                    ]);

                    $updateStock->execute([
                        'qty' => $entry['quantity'],
                        'id' => (int) $product['id'],
                    ]);
                }

                $pdo->commit();
                return json($response, ['success' => true, 'order_id' => $orderId], 201);
            } catch (Throwable $e) {
                $pdo->rollBack();
                error_log('Order placement failed: ' . $e->getMessage());
                return json($response, ['message' => 'Failed to place order: ' . $e->getMessage()], 500);
            }
        });

        $protected->get('/orders/me', function (Request $request, Response $response) use ($pdo) {
            $user = $request->getAttribute('user');
            $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = :user_id ORDER BY id DESC');
            $stmt->execute(['user_id' => (int) ($user['sub'] ?? 0)]);
            $orders = $stmt->fetchAll();

            foreach ($orders as &$order) {
                $itemStmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = :order_id');
                $itemStmt->execute(['order_id' => (int) $order['id']]);
                $order['items'] = $itemStmt->fetchAll();
            }

            return json($response, ['orders' => $orders]);
        });

        $protected->post('/orders/{id}/upload-receipt', function (Request $request, Response $response, array $args) use ($pdo) {
            $user = $request->getAttribute('user');
            $orderId = (int) $args['id'];

            // Verify order belongs to user
            $stmt = $pdo->prepare('SELECT id FROM orders WHERE id = :id AND user_id = :user_id LIMIT 1');
            $stmt->execute(['id' => $orderId, 'user_id' => (int) ($user['sub'] ?? 0)]);
            if (!$stmt->fetch()) {
                return json($response, ['message' => 'Order not found'], 404);
            }

            $files = $request->getUploadedFiles();
            $image = $files['receipt'] ?? null;

            if (!$image instanceof UploadedFileInterface) {
                return json($response, ['message' => 'Receipt image is required'], 422);
            }

            if ($image->getError() !== UPLOAD_ERR_OK) {
                return json($response, ['message' => 'Upload failed'], 422);
            }

            if ($image->getSize() > 5 * 1024 * 1024) {
                return json($response, ['message' => 'Image must be 5MB or smaller'], 422);
            }

            $originalName = $image->getClientFilename() ?? '';
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png'];
            if (!in_array($extension, $allowed, true)) {
                return json($response, ['message' => 'Only JPG and PNG files are accepted'], 422);
            }

            $uploadDir = __DIR__ . '/uploads/receipts';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $filename = 'receipt_' . $orderId . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
            $image->moveTo($uploadDir . '/' . $filename);

            $base = rtrim((string) ($_ENV['APP_URL'] ?? ''), '/');
            $receiptUrl = $base !== '' ? $base . '/uploads/receipts/' . $filename : '/uploads/receipts/' . $filename;

            $update = $pdo->prepare('UPDATE orders SET receipt_url = :receipt_url, payment_status = :payment_status WHERE id = :id');
            $update->execute([
                'receipt_url' => $receiptUrl,
                'payment_status' => 'payment_submitted',
                'id' => $orderId,
            ]);

            return json($response, ['message' => 'Receipt uploaded', 'receipt_url' => $receiptUrl], 201);
        });
    })->add($jwtMiddleware);

    $api->group('/admin', function (RouteCollectorProxy $admin) use ($pdo) {
        $admin->post('/upload-image', function (Request $request, Response $response) {
            $files = $request->getUploadedFiles();
            $image = $files['image'] ?? null;

            if (!$image instanceof UploadedFileInterface) {
                return json($response, ['message' => 'Image file is required'], 422);
            }

            if ($image->getError() !== UPLOAD_ERR_OK) {
                return json($response, ['message' => 'Upload failed'], 422);
            }

            if ($image->getSize() > 5 * 1024 * 1024) {
                return json($response, ['message' => 'Image must be 5MB or smaller'], 422);
            }

            $originalName = $image->getClientFilename() ?? '';
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
            if (!in_array($extension, $allowed, true)) {
                return json($response, ['message' => 'Unsupported image type'], 422);
            }

            $uploadDir = __DIR__ . '/uploads';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $filename = bin2hex(random_bytes(12)) . '.' . $extension;
            $image->moveTo($uploadDir . '/' . $filename);

            $base = rtrim((string) ($_ENV['APP_URL'] ?? ''), '/');
            $imageUrl = $base !== '' ? $base . '/uploads/' . $filename : '/uploads/' . $filename;

            return json($response, ['message' => 'Uploaded', 'image_url' => $imageUrl], 201);
        });

        $admin->post('/products', function (Request $request, Response $response) use ($pdo) {
            $data = (array) $request->getParsedBody();

            $name = trim((string) ($data['name'] ?? ''));
            $description = trim((string) ($data['description'] ?? ''));
            $category = trim((string) ($data['category'] ?? 'Crafts'));
            $price = (float) ($data['price'] ?? 0);
            $image = trim((string) ($data['image_url'] ?? ''));
            $stock = (int) ($data['stock'] ?? 0);
            $isActive = (int) (($data['is_active'] ?? 1) ? 1 : 0);

            if ($name === '' || $price <= 0) {
                return json($response, ['message' => 'Name and valid price are required'], 422);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO products (name, description, category, price, image_url, stock, is_active, created_at)
                 VALUES (:name, :description, :category, :price, :image_url, :stock, :is_active, :created_at)'
            );
            $stmt->execute([
                'name' => $name,
                'description' => $description,
                'category' => $category,
                'price' => $price,
                'image_url' => $image,
                'stock' => max(0, $stock),
                'is_active' => $isActive,
                'created_at' => gmdate('c'),
            ]);

            return json($response, ['message' => 'Product created', 'id' => (int) $pdo->lastInsertId()], 201);
        });

        $admin->put('/products/{id}', function (Request $request, Response $response, array $args) use ($pdo) {
            $id = (int) $args['id'];
            $data = (array) $request->getParsedBody();

            $stmt = $pdo->prepare(
                'UPDATE products
                 SET name = :name,
                     description = :description,
                     category = :category,
                     price = :price,
                     image_url = :image_url,
                     stock = :stock,
                     is_active = :is_active
                 WHERE id = :id'
            );
            $stmt->execute([
                'id' => $id,
                'name' => trim((string) ($data['name'] ?? '')),
                'description' => trim((string) ($data['description'] ?? '')),
                'category' => trim((string) ($data['category'] ?? 'Crafts')),
                'price' => (float) ($data['price'] ?? 0),
                'image_url' => trim((string) ($data['image_url'] ?? '')),
                'stock' => max(0, (int) ($data['stock'] ?? 0)),
                'is_active' => (int) (($data['is_active'] ?? 1) ? 1 : 0),
            ]);

            return json($response, ['message' => 'Product updated']);
        });

        $admin->delete('/products/{id}', function (Request $request, Response $response, array $args) use ($pdo) {
            $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
            $stmt->execute(['id' => (int) $args['id']]);
            return json($response, ['message' => 'Product deleted']);
        });

        $admin->get('/orders', function (Request $request, Response $response) use ($pdo) {
            $orders = $pdo->query(
                'SELECT o.*, u.email as user_email
                 FROM orders o
                 JOIN users u ON o.user_id = u.id
                 ORDER BY o.id DESC'
            )->fetchAll();

            foreach ($orders as &$order) {
                $items = $pdo->prepare('SELECT * FROM order_items WHERE order_id = :order_id');
                $items->execute(['order_id' => (int) $order['id']]);
                $order['items'] = $items->fetchAll();
            }

            return json($response, ['orders' => $orders]);
        });

        $admin->patch('/orders/{id}/status', function (Request $request, Response $response, array $args) use ($pdo) {
            $data = (array) $request->getParsedBody();
            $status = strtolower(trim((string) ($data['status'] ?? '')));
            $allowed = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];

            if (!in_array($status, $allowed, true)) {
                return json($response, ['message' => 'Invalid status'], 422);
            }

            $stmt = $pdo->prepare('UPDATE orders SET status = :status WHERE id = :id');
            $stmt->execute([
                'status' => $status,
                'id' => (int) $args['id'],
            ]);

            return json($response, ['message' => 'Order status updated']);
        });
        $admin->get('/settings/shipping-fee', function (Request $request, Response $response) use ($pdo) {
            $stmt = $pdo->prepare('SELECT value FROM settings WHERE key = :key LIMIT 1');
            $stmt->execute(['key' => 'shipping_fee']);
            $row = $stmt->fetch();
            $fee = $row ? (float) $row['value'] : (float) ($_ENV['SHIPPING_FEE'] ?? 80);
            return json($response, ['shipping_fee' => $fee]);
        });

        $admin->put('/settings/shipping-fee', function (Request $request, Response $response) use ($pdo) {
            $data = (array) $request->getParsedBody();
            $fee = (float) ($data['shipping_fee'] ?? 0);
            if ($fee < 0) {
                return json($response, ['message' => 'Invalid shipping fee'], 422);
            }
            $stmt = $pdo->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (:key, :value)');
            $stmt->execute(['key' => 'shipping_fee', 'value' => (string) $fee]);
            return json($response, ['message' => 'Shipping fee updated', 'shipping_fee' => $fee]);
        });

        $admin->patch('/orders/{id}/payment', function (Request $request, Response $response, array $args) use ($pdo) {
            $data = (array) $request->getParsedBody();
            $paymentStatus = trim((string) ($data['payment_status'] ?? ''));
            $allowed = ['pending_payment', 'payment_submitted', 'payment_confirmed', 'failed'];

            if (!in_array($paymentStatus, $allowed, true)) {
                return json($response, ['message' => 'Invalid payment status'], 422);
            }

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare('UPDATE orders SET payment_status = :payment_status WHERE id = :id');
                $stmt->execute(['payment_status' => $paymentStatus, 'id' => (int) $args['id']]);

                // If payment confirmed, also set order to processing
                if ($paymentStatus === 'payment_confirmed') {
                    $stmt2 = $pdo->prepare('UPDATE orders SET status = :status WHERE id = :id AND status = :old_status');
                    $stmt2->execute(['status' => 'processing', 'id' => (int) $args['id'], 'old_status' => 'pending']);
                }
                if ($paymentStatus === 'failed') {
                    $stmt2 = $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id AND status = :old_status");
                    $stmt2->execute(['status' => 'cancelled', 'id' => (int) $args['id'], 'old_status' => 'pending']);
                }

                $pdo->commit();
            } catch (Throwable) {
                $pdo->rollBack();
                return json($response, ['message' => 'Failed to update payment status'], 500);
            }

            return json($response, ['message' => 'Payment status updated']);
        });
    })->add($adminMiddleware)->add($jwtMiddleware);
});

$app->addErrorMiddleware((bool) ($_ENV['APP_DEBUG'] ?? false), true, true)
    ->setDefaultErrorHandler(function (
        Request $request,
        Throwable $exception,
        bool $displayErrorDetails
    ) use ($app): Response {
        $response = $app->getResponseFactory()->createResponse(500);
        $message = $displayErrorDetails ? $exception->getMessage() : 'Server error';
        $response->getBody()->write(json_encode(['message' => $message], JSON_THROW_ON_ERROR));
        return $response->withHeader('Content-Type', 'application/json');
    });

$app->run();

function json(Response $response, array $payload, int $status = 200): Response
{
    $response->getBody()->write(json_encode($payload, JSON_THROW_ON_ERROR));
    return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
}
