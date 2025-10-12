# Start pgAdmin container
docker run --name pgadmin -p 8080:80 \
    -e "PGADMIN_DEFAULT_EMAIL=dzx@dzx.com" \
    -e "PGADMIN_DEFAULT_PASSWORD=dzx123" \
    -v pgadmin_data:/var/lib/pgadmin \
    -d dpage/pgadmin4
# Start SSH tunnel
ssh -i ~/.ssh/capstone_db.pem -L 5433:localhost:5432 ubuntu@3.107.231.45 -N
