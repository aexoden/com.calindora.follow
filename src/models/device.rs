use secrecy::SecretString;
use sqlx::{types::Uuid, PgPool};

#[derive(serde::Serialize)]
pub struct Device {
    pub id: Uuid,
    pub api_key: String,
    #[serde(skip_serializing)]
    pub api_secret: SecretString,
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
                api_secret: device.api_secret.into(),
            })),
            _ => Ok(None),
        }
    }
}
