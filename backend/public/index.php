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

        $protected->post('/orders', function (Request $request, Response $response) use ($pdo) {
            $user = $request->getAttribute('user');
            $data = (array) $request->getParsedBody();

            $items = $data['items'] ?? [];
            $customerName = trim((string) ($data['customer_name'] ?? ''));
            $customerPhone = trim((string) ($data['customer_phone'] ?? ''));
            $shippingAddress = trim((string) ($data['shipping_address'] ?? ''));

            if (!is_array($items) || count($items) === 0) {
                return json($response, ['message' => 'Order items are required'], 422);
            }

            if ($customerName === '' || $customerPhone === '' || $shippingAddress === '') {
                return json($response, ['message' => 'Shipping details are required'], 422);
            }

            $shippingFee = (float) ($_ENV['SHIPPING_FEE'] ?? 80);
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

            $total = $subtotal + $shippingFee;

            $pdo->beginTransaction();

            try {
                $insertOrder = $pdo->prepare(
                    'INSERT INTO orders (user_id, status, shipping_fee, subtotal, total, customer_name, customer_phone, shipping_address, created_at)
                     VALUES (:user_id, :status, :shipping_fee, :subtotal, :total, :customer_name, :customer_phone, :shipping_address, :created_at)'
                );
                $insertOrder->execute([
                    'user_id' => (int) ($user['sub'] ?? 0),
                    'status' => 'pending',
                    'shipping_fee' => $shippingFee,
                    'subtotal' => $subtotal,
                    'total' => $total,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'shipping_address' => $shippingAddress,
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
                return json($response, ['message' => 'Order placed', 'order_id' => $orderId], 201);
            } catch (Throwable $e) {
                $pdo->rollBack();
                return json($response, ['message' => 'Failed to place order'], 500);
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
            $price = (float) ($data['price'] ?? 0);
            $image = trim((string) ($data['image_url'] ?? ''));
            $stock = (int) ($data['stock'] ?? 0);
            $isActive = (int) (($data['is_active'] ?? 1) ? 1 : 0);

            if ($name === '' || $price <= 0) {
                return json($response, ['message' => 'Name and valid price are required'], 422);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO products (name, description, price, image_url, stock, is_active, created_at)
                 VALUES (:name, :description, :price, :image_url, :stock, :is_active, :created_at)'
            );
            $stmt->execute([
                'name' => $name,
                'description' => $description,
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
            $status = trim((string) ($data['status'] ?? ''));
            $allowed = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

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
