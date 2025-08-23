# Start pgAdmin container
docker run --name pgadmin -p 8080:80 \
    -e "PGADMIN_DEFAULT_EMAIL=dzx@dzx.com" \
    -e "PGADMIN_DEFAULT_PASSWORD=dzx123" \
    -d dpage/pgadmin4
# Start SSH tunnel
ssh -L 5433:localhost:5432 ubuntu@3.26.244.193 -N