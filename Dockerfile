FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY index.js /usr/share/nginx/html/index.js
COPY style.css /usr/share/nginx/html/style.css

EXPOSE 80
