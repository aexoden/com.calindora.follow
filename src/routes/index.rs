use actix_web::{
    get,
    http::{header::ContentType, StatusCode},
    web::{Data, Path},
    HttpResponse, Responder, ResponseError,
};
use anyhow::Context;
use sqlx::PgPool;
use tracing::error;

use crate::models::Device;
use crate::settings::Settings;
use crate::util::{error_chain_fmt, TEMPLATES};

#[derive(thiserror::Error)]
pub enum WebError {
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
    #[error("There is no device associated with the provided device key")]
    UnknownApiKey,
}

impl std::fmt::Debug for WebError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        error_chain_fmt(self, f)
    }
}

impl ResponseError for WebError {
    fn error_response(&self) -> HttpResponse {
        let body = format!(
            "<html><body><h1>{}</h1><p>{}</p></body></html>",
            self.status_code(),
            self
        );

        HttpResponse::build(self.status_code()).body(body)
    }

    fn status_code(&self) -> StatusCode {
        match self {
            Self::UnexpectedError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::UnknownApiKey => StatusCode::NOT_FOUND,
        }
    }
}

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[get("/follow/{api_key}")]
async fn follow(
    db: Data<PgPool>,
    settings: Data<Settings>,
    api_key: Path<String>,
) -> Result<impl Responder, WebError> {
    Device::find_by_api_key(&db, &api_key)
        .await
        .context("Failed to retrieve device associated with the provided API key")?
        .ok_or(WebError::UnknownApiKey)?;

    let mut ctx = tera::Context::new();
    ctx.insert("device_api_key", &api_key.to_string());
    ctx.insert("maps_api_key", &settings.application.maps_api_key);

    match TEMPLATES.render("follow.html", &ctx) {
        Ok(body) => Ok(HttpResponse::Ok()
            .content_type(ContentType::html())
            .body(body)),
        Err(err) => {
            error!("Tera Error: {}", err);
            Err(WebError::UnexpectedError(err.into()))
        }
    }
}
