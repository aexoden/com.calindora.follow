CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR NOT NULL UNIQUE,
    api_secret VARCHAR NOT NULL
);
