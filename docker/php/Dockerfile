FROM php:8.2-fpm-alpine

RUN apk add --no-cache libpng-dev libjpeg-turbo-dev freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql gd

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_HOME=/tmp/composer
WORKDIR /var/www

# Cấu hình entrypoint và logging pool
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY docker/php/logging.conf /usr/local/etc/php-fpm.d/zz-logging.conf

# Copy toàn bộ mã nguồn ứng dụng
COPY . /var/www

# Cài đặt composer production dependencies
RUN if [ -f "composer.json" ]; then \
        composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader; \
    fi

# Khởi tạo thư mục và phân quyền cho storage/cache
RUN mkdir -p /var/www/storage/framework/cache/data \
             /var/www/storage/framework/sessions \
             /var/www/storage/framework/views \
             /var/www/storage/logs \
             /var/www/bootstrap/cache \
    && chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 777 /var/www/storage /var/www/bootstrap/cache

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
