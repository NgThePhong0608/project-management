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

echo "Laravel ready. Starting php-fpm..."
exec php-fpm

