-- V16: Budget configuration and service usage metrics tracking

CREATE TABLE IF NOT EXISTS budget_configs (
    id varchar(255) NOT NULL,
    monthly_budget double precision NOT NULL DEFAULT 100.0,
    yellow_pct double precision NOT NULL DEFAULT 70.0,
    red_pct double precision NOT NULL DEFAULT 90.0,
    cost_cap_exceeded boolean NOT NULL DEFAULT FALSE,
    updated_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS service_usage_records (
    id varchar(255) NOT NULL,
    service_name varchar(50) NOT NULL,
    requests integer NOT NULL DEFAULT 0,
    success_count integer NOT NULL DEFAULT 0,
    failure_count integer NOT NULL DEFAULT 0,
    tokens_used integer DEFAULT 0,
    cost double precision DEFAULT 0.0,
    record_date date NOT NULL,
    created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_service_date UNIQUE (service_name, record_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_date ON service_usage_records (record_date);
