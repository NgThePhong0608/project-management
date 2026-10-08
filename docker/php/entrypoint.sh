#!/bin/sh
set -e

# Đảm bảo các thư mục cache/storage có quyền ghi
mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         bootstrap/cache

chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# Tự động cài composer dependencies nếu chưa có
if [ ! -f "vendor/autoload.php" ]; then
    echo "vendor/autoload.php not found. Installing composer dependencies..."
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# Chạy migrations tự động
php artisan migrate --force

# Xóa cache và cache lại cấu hình cho production
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Chỉ cache nếu là môi trường production
if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Phân quyền chuẩn cho user www-data (user chạy php-fpm worker)
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
chmod -R 777 storage/logs storage/framework

echo "Laravel ready. Starting php-fpm..."
exec php-fpm

