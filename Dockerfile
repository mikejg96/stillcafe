# Still. v2 — a static site (no build step), served by nginx.
FROM nginx:1.27-alpine

# Same port as v1 so the live deployment keeps working unchanged. Hosts that
# inject their own PORT (Railway, Render, Fly, …) override it at run time.
ENV PORT=4173

# The nginx image fills ${PORT} into this template when the container starts.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY public/ /usr/share/nginx/html/

EXPOSE 4173
