FROM php:8.5-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/backend/apache.conf /etc/apache2/conf-enabled/zz-examhub.conf

WORKDIR /var/www/html
COPY api ./api
COPY backend ./backend

ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install \
    --working-dir=/var/www/html/backend \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress

EXPOSE 80
