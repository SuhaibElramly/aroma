<?php

// Suppress PHP 8.5 PDO deprecation warnings from Laravel framework
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all proxies (Render/Vercel/etc. terminate TLS upstream and
        // forward via X-Forwarded-Proto). Without this, URL generation emits
        // http:// instead of https:// behind the proxy.
        $middleware->trustProxies(at: '*');

        // Using stateless bearer token auth — no stateful/CSRF middleware needed
        $middleware->alias([
            'is_admin' => \App\Http\Middleware\IsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
