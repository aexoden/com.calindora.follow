use std::str::FromStr;

use bigdecimal::BigDecimal;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::{types::Uuid, PgPool};
use time::OffsetDateTime;
use validator::{Validate, ValidationError};

use crate::util::TIMESTAMP_FORMAT;

#[derive(Serialize)]
pub struct Report {
    pub id: Uuid,
    #[serde(skip_serializing)]
    pub device_id: Uuid,
    pub timestamp: OffsetDateTime,
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
    #[validate(custom = "validate_latitude")]
    pub latitude: BigDecimal,
    #[validate(custom = "validate_longitude")]
    pub longitude: BigDecimal,
    pub altitude: BigDecimal,
    #[validate(custom = "validate_positive")]
    pub speed: BigDecimal,
    #[validate(custom = "validate_bearing")]
    pub bearing: BigDecimal,
    #[validate(custom = "validate_positive")]
    pub accuracy: BigDecimal,
}

impl CreateReportRequest {
    pub fn get_signature(&self, secret: &str) -> String {
        let mut input = String::with_capacity(128);

        input.push_str(&self.timestamp.format(TIMESTAMP_FORMAT).unwrap());
        input.push_str(&format!("{:.12}", self.latitude));
        input.push_str(&format!("{:.12}", self.longitude));
        input.push_str(&format!("{:.12}", self.altitude));
        input.push_str(&format!("{:.12}", self.speed));
        input.push_str(&format!("{:.12}", self.bearing));
        input.push_str(&format!("{:.12}", self.accuracy));

        type HmacSha256 = Hmac<Sha256>;

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(input.as_bytes());

        hex::encode(mac.finalize().into_bytes())
    }
}

fn validate_latitude(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("-90.0").unwrap()
        || *value > BigDecimal::from_str("90.0").unwrap()
    {
        Err(ValidationError::new("value not in range [-90.0, 90.0]"))
    } else {
        Ok(())
    }
}

fn validate_longitude(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("-180.0").unwrap()
        || *value > BigDecimal::from_str("180.0").unwrap()
    {
        Err(ValidationError::new("value not in range [-180.0, 180.0]"))
    } else {
        Ok(())
    }
}

fn validate_positive(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("0.0").unwrap() {
        Err(ValidationError::new(
            "value not greater than or equal to zero",
        ))
    } else {
        Ok(())
    }
}

fn validate_bearing(value: &BigDecimal) -> Result<(), ValidationError> {
    if *value < BigDecimal::from_str("0.0").unwrap()
        || *value > BigDecimal::from_str("360.0").unwrap()
    {
        Err(ValidationError::new("value not in range [0.0, 360.0]"))
    } else {
        Ok(())
    }
}
