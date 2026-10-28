FROM php:8.5.12-fpm-alpine

RUN apk add --no-cache libpng-dev libjpeg-turbo-dev freetype-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql gd pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_HOME=/tmp/composer
WORKDIR /var/www

# Cấu hình entrypoint và logging pool
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY docker/php/logging.conf /usr/local/etc/php-fpm.d/zz-logging.conf
COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Copy toàn bộ mã nguồn ứng dụng
COPY . /var/www

ARG APP_ENV=dev
ENV APP_ENV=${APP_ENV}

# Cài đặt composer dependencies (chỉ dùng --no-dev khi APP_ENV=production)
RUN if [ -f "composer.json" ]; then \
        if [ "$APP_ENV" = "production" ]; then \
            composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader; \
        else \
            composer install --no-interaction --prefer-dist --optimize-autoloader; \
        fi; \
    fi

# Khởi tạo thư mục và phân quyền cho storage/cache
RUN mkdir -p /var/www/storage/framework/cache/data \
             /var/www/storage/framework/sessions \
             /var/www/storage/framework/views \
             /var/www/storage/logs \
             /var/www/bootstrap/cache \
    && chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 777 /var/www/storage /var/www/bootstrap/cache

EXPOSE 9000 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
