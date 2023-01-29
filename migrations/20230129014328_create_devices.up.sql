CREATE TABLE devices (
    id UUID PRIMARY KEY,
    api_key VARCHAR NOT NULL UNIQUE,
    api_secret VARCHAR NOT NULL
);
