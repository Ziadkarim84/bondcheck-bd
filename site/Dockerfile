FROM nginx:1.27-alpine
COPY public /usr/share/nginx/html
# Cache the results file briefly so new draws show up fast; assets longer.
RUN printf 'server {\n  listen 8080;\n  root /usr/share/nginx/html;\n  location = /data/results.json { add_header Cache-Control "public, max-age=300"; add_header Access-Control-Allow-Origin "*"; }\n  location /assets/ { add_header Cache-Control "public, max-age=86400"; }\n  location / { try_files $uri $uri/ =404; }\n}\n' > /etc/nginx/conf.d/default.conf
CMD ["/bin/sh", "-c", "sed -i \"s/listen 8080;/listen ${PORT:-8080};/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
