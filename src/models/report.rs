use std::str::FromStr;

use anyhow::Context;
use bigdecimal::BigDecimal;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::{PgPool, types::Uuid};
use time::OffsetDateTime;
use validator::{Validate, ValidationError};

use crate::util::TIMESTAMP_FORMAT;

#[derive(Serialize)]
pub struct Report {
    pub id: Uuid,
    #[serde(skip_serializing)]
    pub device_id: Uuid,
    #[serde(with = "time::serde::iso8601")]
    pub timestamp: OffsetDateTime,
    #[serde(with = "time::serde::iso8601::option")]
    pub submit_timestamp: Option<OffsetDateTime>,
    pub latitude: BigDecimal,
    pub longitude: BigDecimal,
    pub altitude: BigDecimal,
    pub speed: BigDecimal,
    pub bearing: BigDecimal,
    pub accuracy: BigDecimal,
}

impl Report {
    #[tracing::instrument(name = "Get device from ID", skip(db, id))]
    pub async fn find_by_id(db: &PgPool, id: &Uuid) -> Result<Option<Report>, sqlx::Error> {
        sqlx::query_as!(Report, "SELECT * FROM reports WHERE id = $1", &id)
            .fetch_optional(db)
            .await
    }
}

#[derive(Deserialize, Debug, Validate)]
pub struct CreateReportRequest {
    #[serde(with = "time::serde::iso8601")]
    pub timestamp: OffsetDateTime,
    #[validate(custom(function = "validate_latitude"))]
    pub latitude: BigDecimal,
    #[validate(custom(function = "validate_longitude"))]
    pub longitude: BigDecimal,
    pub altitude: BigDecimal,
    #[validate(custom(function = "validate_positive"))]
    pub speed: BigDecimal,
    #[validate(custom(function = "validate_bearing"))]
    pub bearing: BigDecimal,
    #[validate(custom(function = "validate_positive"))]
    pub accuracy: BigDecimal,
}

impl CreateReportRequest {
    pub fn get_signature(&self, secret: &str) -> anyhow::Result<String> {
        type HmacSha256 = Hmac<Sha256>;

        let timestamp = &self
            .timestamp
            .format(TIMESTAMP_FORMAT)
            .context("Failed to format timestamp for signature generation")?;

        let input = format!(
            "{timestamp}{:.12}{:.12}{:.12}{:.12}{:.12}{:.12}",
            self.latitude, self.longitude, self.altitude, self.speed, self.bearing, self.accuracy
        );

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
            .context("Failed to create HMAC instance for signature generation")?;
        mac.update(input.as_bytes());

        Ok(hex::encode(mac.finalize().into_bytes()))
    }
}

#[expect(clippy::unwrap_used)]
fn validate_latitude(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("-90.0").unwrap()
        || *value > BigDecimal::from_str("90.0").unwrap()
    {
        Err(ValidationError::new("value not in range [-90.0, 90.0]"))
    } else {
        Ok(())
    }
}

#[expect(clippy::unwrap_used)]
fn validate_longitude(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("-180.0").unwrap()
        || *value > BigDecimal::from_str("180.0").unwrap()
    {
        Err(ValidationError::new("value not in range [-180.0, 180.0]"))
    } else {
        Ok(())
    }
}

#[expect(clippy::unwrap_used)]
fn validate_positive(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("0.0").unwrap() {
        Err(ValidationError::new(
            "value not greater than or equal to zero",
        ))
    } else {
        Ok(())
    }
}

#[expect(clippy::unwrap_used)]
fn validate_bearing(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("0.0").unwrap()
        || *value > BigDecimal::from_str("360.0").unwrap()
    {
        Err(ValidationError::new("value not in range [0.0, 360.0]"))
    } else {
        Ok(())
    }
}
