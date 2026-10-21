FROM httpd:2.4

RUN sed -i \
    -e 's/^#LoadModule proxy_module /LoadModule proxy_module /' \
    -e 's/^#LoadModule proxy_fcgi_module /LoadModule proxy_fcgi_module /' \
    /usr/local/apache2/conf/httpd.conf

COPY apache.conf /usr/local/apache2/conf/extra/lab.conf

RUN echo 'Include conf/extra/lab.conf' >> /usr/local/apache2/conf/httpd.conf

COPY index.html index.js style.css /usr/local/apache2/htdocs/

EXPOSE 80