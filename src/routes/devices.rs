use actix_web::{
    get,
    web::{Data, Json, Path},
    Responder,
};
use anyhow::Context;
use sqlx::PgPool;

use crate::models::{Device, DeviceError};

#[get("/devices/{api_key}")]
#[tracing::instrument(name = "Get device", skip(db))]
pub async fn get_device_by_api_key(
    db: Data<PgPool>,
    api_key: Path<String>,
) -> Result<impl Responder, DeviceError> {
    Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve the device associated with the provided API key")?
        .map_or(Err(DeviceError::UnknownApiKey), |record| Ok(Json(record)))
}
