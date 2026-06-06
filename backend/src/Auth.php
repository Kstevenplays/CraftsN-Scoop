<?php

declare(strict_types=1);

namespace App;

use DateInterval;
use DateTimeImmutable;
use DateTimeZone;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Token;
use Lcobucci\JWT\Validation\Constraint\SignedWith;

final class Auth
{
    private function config(): Configuration
    {
        $secret = (string) ($_ENV['JWT_SECRET'] ?? 'dev-secret');
        if (strlen($secret) < 32) {
            $secret = hash('sha256', $secret, true);
        }
        return Configuration::forSymmetricSigner(new Sha256(), InMemory::plainText($secret));
    }

    public function issueToken(array $claims): string
    {
        $ttl = (int) ($_ENV['JWT_TTL'] ?? 86400);
        $config = $this->config();
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));

        $token = $config->builder()
            ->issuedAt($now)
            ->expiresAt($now->add(new DateInterval('PT' . $ttl . 'S')))
            ->relatedTo((string) $claims['id'])
            ->withClaim('name', (string) $claims['name'])
            ->withClaim('email', (string) $claims['email'])
            ->withClaim('role', (string) $claims['role'])
            ->getToken($config->signer(), $config->signingKey());

        return $token->toString();
    }

    public function decodeToken(string $token): array
    {
        $config = $this->config();
        $parsed = $config->parser()->parse($token);

        if (!$parsed instanceof Token\Plain) {
            throw new \RuntimeException('Invalid token');
        }

        $constraints = [
            new SignedWith($config->signer(), $config->verificationKey()),
        ];

        if (!$config->validator()->validate($parsed, ...$constraints)) {
            throw new \RuntimeException('Token validation failed');
        }

        $exp = $parsed->claims()->get('exp');
        if ($exp instanceof DateTimeImmutable) {
            $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            if ($exp <= $now) {
                throw new \RuntimeException('Token has expired');
            }
        }

        return [
            'sub' => (int) $parsed->claims()->get('sub'),
            'name' => (string) $parsed->claims()->get('name'),
            'email' => (string) $parsed->claims()->get('email'),
            'role' => (string) $parsed->claims()->get('role'),
        ];
    }
}
