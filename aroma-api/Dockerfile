FROM php:8.3-cli-alpine

# System libs + PHP extensions Laravel needs against Neon/Postgres
RUN apk add --no-cache \
        postgresql-dev \
        libzip-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        zip \
        opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy source. .dockerignore keeps node_modules / vendor / .env out.
COPY . .

# Production install: no dev deps, optimized autoloader
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist \
    && php artisan storage:link || true

# Render injects $PORT; expose for documentation only.
EXPOSE 10000

# Runtime: cache config/routes (env vars are now present), migrate, serve.
# config:cache and route:cache must run here, NOT in RUN, because env vars
# are only present at container start, not build time.
CMD ["sh", "-c", "php artisan config:cache && php artisan route:cache && php artisan migrate --force && php -S 0.0.0.0:${PORT:-10000} -t public public/index.php"]
