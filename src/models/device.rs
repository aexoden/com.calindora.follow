use actix_web::{http::StatusCode, ResponseError};
use secrecy::SecretString;
use sqlx::{types::Uuid, PgPool};

use crate::util::error_chain_fmt;

#[derive(serde::Serialize)]
pub struct Device {
    id: Uuid,
    api_key: String,
    #[serde(skip_serializing)]
    _api_secret: SecretString,
}

#[derive(thiserror::Error)]
pub enum DeviceError {
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
    #[error("There is no device associated with the provided API key")]
    UnknownApiKey,
}

impl std::fmt::Debug for DeviceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        error_chain_fmt(self, f)
    }
}

impl ResponseError for DeviceError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::UnexpectedError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::UnknownApiKey => StatusCode::NOT_FOUND,
        }
    }
}

impl Device {
    #[tracing::instrument(name = "Get device from API key", skip(db, api_key))]
    pub async fn find_by_api_key(
        db: &PgPool,
        api_key: &str,
    ) -> Result<Option<Device>, sqlx::Error> {
        let device = sqlx::query!("SELECT * FROM devices WHERE api_key = $1", api_key)
            .fetch_optional(db)
            .await?;

        match device {
            Some(device) => Ok(Some(Device {
                id: device.id,
                api_key: device.api_key,
                _api_secret: device.api_secret.into(),
            })),
            _ => Ok(None),
        }
    }
}
