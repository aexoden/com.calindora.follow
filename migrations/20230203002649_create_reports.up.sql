CREATE TABLE reports (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    submit_timestamp TIMESTAMP WITH TIME ZONE,
    latitude NUMERIC(15, 12) NOT NULL,
    longitude NUMERIC(15, 12) NOT NULL,
    altitude NUMERIC(20, 12) NOT NULL,
    speed NUMERIC(20, 12) NOT NULL,
    bearing NUMERIC(15, 12) NOT NULL,
    accuracy NUMERIC(20, 12) NOT NULL
);
