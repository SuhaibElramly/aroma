FROM php:8.3-cli-alpine

# System libs + PHP extensions Laravel needs against Neon/Postgres.
# bcmath/intl are required by laravel/framework; pdo_pgsql for Neon.
RUN apk add --no-cache \
        postgresql-dev \
        libzip-dev \
        icu-dev \
        oniguruma-dev \
    && docker-php-ext-install \
        pdo_pgsql \
        zip \
        bcmath \
        intl \
        opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy source. .dockerignore keeps node_modules / vendor / .env out.
COPY . .

# Install dependencies. NO `|| true` — a composer install failure must
# fail the build loudly, not produce an image without vendor/.
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# storage:link is idempotent-ish; tolerate the "already exists" case but
# keep it in a separate RUN so its failure can't mask the composer step.
RUN php artisan storage:link || true

# Render injects $PORT; expose for documentation only.
EXPOSE 10000

# Runtime: cache config/routes (env vars are now present), migrate, serve.
# config:cache and route:cache must run here, NOT in RUN, because env vars
# are only present at container start, not build time.
CMD ["sh", "-c", "php artisan config:cache && php artisan route:cache && php artisan migrate --force && php -S 0.0.0.0:${PORT:-10000} -t public public/index.php"]
