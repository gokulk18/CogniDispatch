worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    server {
        listen 5000;
        server_name localhost;

        location /api/auth/ {
            proxy_pass http://${auth_fqdn};
            proxy_set_header Host ${auth_fqdn};
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/vendors/ {
            proxy_pass http://${vendor_fqdn};
            proxy_set_header Host ${vendor_fqdn};
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ai/ {
            proxy_pass http://${ai_fqdn};
            proxy_set_header Host ${ai_fqdn};
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/admin/ {
            proxy_pass http://${admin_fqdn};
            proxy_set_header Host ${admin_fqdn};
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/dispatches/ {
            proxy_pass http://${dispatch_fqdn};
            proxy_set_header Host ${dispatch_fqdn};
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io/ {
            proxy_pass http://${dispatch_fqdn};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host ${dispatch_fqdn};
            proxy_cache_bypass $http_upgrade;
        }

        location /api/health {
            default_type application/json;
            return 200 '{"status":"online","service":"api-gateway-nginx-container-app"}';
        }

        location / {
            default_type text/plain;
            return 200 'OK';
        }
    }
}
