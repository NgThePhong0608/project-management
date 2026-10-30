#!/bin/sh
set -e

mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         bootstrap/cache

chmod -R 775 storage bootstrap/cache 2>/dev/null || true

if [ ! -f "vendor/autoload.php" ]; then
    echo "vendor/autoload.php not found. Installing composer dependencies..."
    if [ "$APP_ENV" = "production" ]; then
        composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
    else
        composer install --no-interaction --prefer-dist --optimize-autoloader
    fi
fi

php artisan storage:link || true

php artisan migrate --force
php artisan dynamodb:migrate || true
php artisan db:seed --force || true

php artisan config:clear
php artisan route:clear
php artisan view:clear

if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

chown -R www-data:www-data storage bootstrap/cache
chmod -R 777 storage bootstrap/cache
chmod -R 777 storage/logs storage/framework

if [ $# -gt 0 ]; then
    echo "Executing custom command: $@"
    exec "$@"
fi

# Start background queue worker
echo "Starting background queue worker..."
(while true; do php artisan queue:work --sleep=3 --tries=3 --max-time=3600; sleep 2; done) &

# Start background Reverb server
echo "Starting background Reverb server on port 8080..."
(while true; do php artisan reverb:start --host=0.0.0.0 --port=8080; sleep 2; done) &

echo "Laravel ready. Starting php-fpm..."
exec php-fpm


