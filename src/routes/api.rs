use std::cmp;

use actix_web::{
    HttpRequest, HttpResponse, Responder, ResponseError, get,
    http::StatusCode,
    post,
    web::{Data, Json, Path, Query},
};
use anyhow::Context;
use secrecy::ExposeSecret;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::models::{CreateReportRequest, Device, Report};
use crate::util::error_chain_fmt;

#[derive(thiserror::Error)]
pub enum ApiError {
    #[error("The provided signature was invalid")]
    InvalidSignature,
    #[error("No signature was provided")]
    MissingSignature,
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
    #[error("There is no device associated with the provided API key")]
    UnknownApiKey,
    #[error("There is no report associated with the provided ID and API key")]
    UnknownReportId,
}

impl std::fmt::Debug for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        error_chain_fmt(self, f)
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        let body = json!({
            "code": self.status_code().to_string(),
            "success": false,
            "reason": self.to_string()
        });

        HttpResponse::build(self.status_code()).json(body)
    }

    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidSignature => StatusCode::UNAUTHORIZED,
            Self::MissingSignature => StatusCode::UNAUTHORIZED,
            Self::UnexpectedError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::UnknownApiKey => StatusCode::NOT_FOUND,
            Self::UnknownReportId => StatusCode::NOT_FOUND,
        }
    }
}

#[derive(Deserialize, Debug)]
enum Ordering {
    #[serde(alias = "asc")]
    Ascending,
    #[serde(alias = "desc")]
    Descending,
}

#[derive(Deserialize, Debug)]
pub struct ReportParameters {
    #[serde(default, with = "time::serde::iso8601::option")]
    since: Option<OffsetDateTime>,
    #[serde(default, with = "time::serde::iso8601::option")]
    until: Option<OffsetDateTime>,
    limit: Option<usize>,
    order: Option<Ordering>,
}

#[get("/api/v1/devices/{api_key}/reports/count")]
#[tracing::instrument(name = "Get report count", skip(db, api_key))]
pub async fn get_report_count(
    db: Data<PgPool>,
    api_key: Path<String>,
    parameters: Query<ReportParameters>,
) -> Result<impl Responder, ApiError> {
    let device = Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve the device associated with the provided API key")?
        .ok_or(ApiError::UnknownApiKey)?;

    let since = if let Some(since) = parameters.since {
        since
    } else {
        OffsetDateTime::from_unix_timestamp(0).unwrap()
    };

    let until = if let Some(until) = parameters.until {
        until
    } else {
        OffsetDateTime::now_utc()
    };

    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM reports WHERE device_id = $1 AND timestamp > $2 AND timestamp < $3"#,
        device.id,
        since,
        until
    )
    .fetch_one(&**db)
    .await
    .context("Failed to fetch report count for the device associated with the provided API key")?;

    let count_value = count.unwrap_or(0);

    Ok(HttpResponse::Ok().json(json!({ "count": count_value})))
}

#[get("/api/v1/devices/{api_key}/reports/{id}")]
#[tracing::instrument(name = "Get report by ID", skip(db, path))]
pub async fn get_report_by_id(
    db: Data<PgPool>,
    path: Path<(String, Uuid)>,
) -> Result<impl Responder, ApiError> {
    let (api_key, id) = path.into_inner();

    let device = Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve device associated with the provided API key")?
        .ok_or(ApiError::UnknownApiKey)?;

    let report = Report::find_by_id(&db, &id)
        .await
        .context("Failed to retrieve the report associated with the provided ID and API key")?
        .ok_or(ApiError::UnknownReportId)?;

    if report.device_id == device.id {
        Ok(Json(report))
    } else {
        Err(ApiError::UnknownReportId)
    }
}

#[get("/api/v1/devices/{api_key}/reports")]
#[tracing::instrument(name = "Get reports", skip(db, api_key))]
pub async fn get_reports(
    db: Data<PgPool>,
    api_key: Path<String>,
    parameters: Query<ReportParameters>,
) -> Result<impl Responder, ApiError> {
    let device = Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve the device associated with the provided API key")?
        .ok_or(ApiError::UnknownApiKey)?;

    let ordering = match parameters.order {
        Some(Ordering::Ascending) => Ordering::Ascending,
        Some(Ordering::Descending) => Ordering::Descending,
        None => Ordering::Descending,
    };

    let limit = if let Some(limit) = parameters.limit {
        cmp::min(10000, limit)
    } else {
        100
    };

    let since = if let Some(since) = parameters.since {
        since
    } else {
        OffsetDateTime::from_unix_timestamp(0).unwrap()
    };

    let until = if let Some(until) = parameters.until {
        until
    } else {
        OffsetDateTime::now_utc()
    };

    let reports = match ordering {
        Ordering::Ascending => sqlx::query_as!(
            Report,
            r#"SELECT * FROM reports WHERE device_id = $1 AND timestamp > $2 AND timestamp < $3 ORDER BY timestamp ASC LIMIT $4"#,
            device.id,
            since,
            until,
            limit as i32
        ).fetch_all(&**db).await,
        Ordering::Descending => sqlx::query_as!(
            Report,
            r#"SELECT * FROM reports WHERE device_id = $1 AND timestamp > $2 AND timestamp < $3 ORDER BY timestamp DESC LIMIT $4"#,
            device.id,
            since,
            until,
            limit as i32
        ).fetch_all(&**db).await,
    }
    .context("Failed to fetch reports for the device associated with the provided API key")?;

    Ok(HttpResponse::Ok().json(reports))
}

#[post("/api/v1/devices/{api_key}/reports")]
#[tracing::instrument(name = "Post report to device", skip(db, request, api_key))]
pub async fn post_report(
    db: Data<PgPool>,
    request: HttpRequest,
    api_key: Path<String>,
    report_request: actix_web_validator::Json<CreateReportRequest>,
) -> Result<impl Responder, ApiError> {
    let device = Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve the device associated with the provided API key")?
        .ok_or(ApiError::UnknownApiKey)?;

    let signature = request
        .headers()
        .get("X-Signature")
        .ok_or(ApiError::MissingSignature)?
        .to_str()
        .map_err(|_| ApiError::InvalidSignature)?;

    if report_request.get_signature(device.api_secret.expose_secret()) != signature {
        return Err(ApiError::InvalidSignature);
    }

    let report =
        sqlx::query_as!(Report,
                r#"WITH inserted AS (
                    INSERT INTO reports (id, device_id, timestamp, submit_timestamp, latitude, longitude, altitude, speed, bearing, accuracy)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *
                )
                SELECT * FROM inserted"#,
            Uuid::new_v4(),
            device.id,
            report_request.timestamp,
            time::OffsetDateTime::now_utc(),
            report_request.latitude,
            report_request.longitude,
            report_request.altitude,
            report_request.speed,
            report_request.bearing,
            report_request.accuracy
        )
        .fetch_one(&**db)
        .await
        .context("Failed to insert report")?;

    Ok(HttpResponse::Created()
        .insert_header((
            "Location",
            format!("/api/v1/devices/{api_key}/reports/{}", report.id),
        ))
        .json(report))
}
