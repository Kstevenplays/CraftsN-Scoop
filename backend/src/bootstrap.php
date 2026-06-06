<?php

declare(strict_types=1);

use App\Auth;
use App\Database;
use Dotenv\Dotenv;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$root = dirname(__DIR__);
if (file_exists($root . '/.env')) {
    Dotenv::createImmutable($root)->safeLoad();
}

$dbPath = $root . '/' . (string) ($_ENV['DB_PATH'] ?? 'storage/database.sqlite');
$db = new Database($dbPath);
$auth = new Auth();

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

$app->add(function (ServerRequestInterface $request, RequestHandlerInterface $handler) use ($app) {
    $response = $handler->handle($request);

    $origin = $request->getHeaderLine('Origin');
    $allowed = [
        (string) ($_ENV['FRONTEND_URL'] ?? 'http://127.0.0.1:4200'),
        'http://localhost:4200',
        'http://127.0.0.1:4200',
    ];

    if ($origin !== '' && in_array($origin, $allowed, true)) {
        return $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }

    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
});

$app->options('/{routes:.+}', function ($request, $response) {
    return $response;
});

$jwtMiddleware = new class($auth, $app->getResponseFactory()) implements MiddlewareInterface {
    public function __construct(private Auth $auth, private ResponseFactoryInterface $responseFactory)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $header = $request->getHeaderLine('Authorization');
        if (!str_starts_with($header, 'Bearer ')) {
            return $this->error('Unauthorized', 401);
        }

        $token = trim(substr($header, 7));
        try {
            $payload = $this->auth->decodeToken($token);
            return $handler->handle($request->withAttribute('user', $payload));
        } catch (Throwable) {
            return $this->error('Invalid token', 401);
        }
    }

    private function error(string $message, int $status): ResponseInterface
    {
        $response = $this->responseFactory->createResponse($status);
        $response->getBody()->write(json_encode(['message' => $message], JSON_THROW_ON_ERROR));
        return $response->withHeader('Content-Type', 'application/json');
    }
};

$adminMiddleware = new class($app->getResponseFactory()) implements MiddlewareInterface {
    public function __construct(private ResponseFactoryInterface $responseFactory)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $user = $request->getAttribute('user');
        if (!is_array($user) || ($user['role'] ?? '') !== 'admin') {
            $response = $this->responseFactory->createResponse(403);
            $response->getBody()->write(json_encode(['message' => 'Admin access required'], JSON_THROW_ON_ERROR));
            return $response->withHeader('Content-Type', 'application/json');
        }

        return $handler->handle($request);
    }
};

return [$app, $db->pdo(), $auth, $jwtMiddleware, $adminMiddleware];
