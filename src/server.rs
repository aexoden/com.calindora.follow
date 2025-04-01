use std::net::TcpListener;
use std::str::FromStr;

use actix_cors::Cors;
use actix_web::{
    App, HttpResponse, HttpServer, dev::Server, error, http::StatusCode, http::header, web::Data,
    web::QueryConfig,
};
use actix_web_validator::JsonConfig;
use serde_json::json;
use sqlx::{
    ConnectOptions, PgPool,
    postgres::{PgConnectOptions, PgPoolOptions},
};
use tracing_actix_web::TracingLogger;

use crate::settings::{DatabaseSettings, Settings};

pub struct Application {
    port: u16,
    server: Server,
}

impl Application {
    pub async fn build(settings: Settings) -> std::io::Result<Self> {
        let db_pool = get_db_pool(&settings.database);

        tracing::info!("Attempting to migrate database");
        sqlx::migrate!()
            .run(&db_pool)
            .await
            .expect("Failed to migrate database");

        let address = format!(
            "{}:{}",
            settings.application.address, settings.application.port
        );

        let listener = TcpListener::bind(&address)?;
        tracing::info!("Listening on {}", &address);
        let port = listener.local_addr().unwrap().port();

        let server = run(listener, db_pool, settings)?;

        Ok(Self { port, server })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn run(self) -> std::io::Result<()> {
        self.server.await
    }
}

pub fn get_db_pool(settings: &DatabaseSettings) -> PgPool {
    let options =
        PgConnectOptions::from_str(&settings.url).expect("Invalid configured database URL");

    let options = options.log_statements(tracing::log::LevelFilter::Trace);

    PgPoolOptions::new()
        .max_connections(20)
        .connect_lazy_with(options)
}

fn run(listener: TcpListener, db_pool: PgPool, settings: Settings) -> std::io::Result<Server> {
    let db_pool = Data::new(db_pool);
    let settings = Data::new(settings);

    let server = HttpServer::new(move || {
        let json_cfg = JsonConfig::default().error_handler(|err, _| {
            let body = json!({
                "code": StatusCode::BAD_REQUEST.to_string(),
                "success": false,
                "reason": err.to_string(),
            });

            let response = HttpResponse::BadRequest().json(body);
            error::InternalError::from_response(err, response).into()
        });

        let query_cfg = QueryConfig::default().error_handler(|err, req| {
            if req.path().starts_with("/api") {
                let body = json!({
                    "code": StatusCode::BAD_REQUEST.to_string(),
                    "success": false,
                    "reason": err.to_string(),
                });

                let response = HttpResponse::BadRequest().json(body);
                error::InternalError::from_response(err, response).into()
            } else {
                let body = format!(
                    "<html><body><h1>{}</h1><p>{}</p></body></html>",
                    StatusCode::BAD_REQUEST,
                    err
                );

                let response = HttpResponse::BadRequest().body(body);
                error::InternalError::from_response(err, response).into()
            }
        });

        App::new()
            .wrap(
                Cors::default()
                    .allowed_origin("http://localhost:5173")
                    .allowed_methods(vec!["GET", "POST"])
                    .allowed_headers(vec![
                        header::AUTHORIZATION,
                        header::ACCEPT,
                        header::CONTENT_TYPE,
                    ])
                    .max_age(3600),
            )
            .wrap(TracingLogger::default())
            .app_data(json_cfg)
            .app_data(query_cfg)
            .app_data(db_pool.clone())
            .app_data(settings.clone())
            .service(crate::routes::index::index)
            .service(crate::routes::index::follow)
            .service(crate::routes::health_check::health_check)
            .service(crate::routes::api::get_report_by_id)
            .service(crate::routes::api::get_reports)
            .service(crate::routes::api::post_report)
            .service(actix_files::Files::new("/static", "./static"))
    })
    .listen(listener)?
    .run();

    Ok(server)
}
