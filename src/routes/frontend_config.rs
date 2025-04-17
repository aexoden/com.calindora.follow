use actix_web::{HttpResponse, Responder, get, web::Data};
use serde::Serialize;

use crate::settings::Settings;

#[derive(Serialize)]
pub struct FrontendConfig {
    maps_api_key: String,
}

#[get("/api/v1/frontend_config")]
async fn get_frontend_config(settings: Data<Settings>) -> impl Responder {
    let config = FrontendConfig {
        maps_api_key: settings.frontend.maps_api_key.clone(),
    };

    HttpResponse::Ok().json(config)
}
