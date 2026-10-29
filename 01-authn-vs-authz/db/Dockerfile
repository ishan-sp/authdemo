# Official Postgres image + our schema.
# Any .sql file in /docker-entrypoint-initdb.d runs once, on first start
# (i.e. when the data volume is empty).
FROM postgres:16-alpine
COPY init.sql /docker-entrypoint-initdb.d/
