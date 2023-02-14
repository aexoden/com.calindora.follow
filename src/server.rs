use std::net::TcpListener;
use std::str::FromStr;

use actix_web::{
    dev::Server, error, http::StatusCode, web::Data, web::QueryConfig, App, HttpResponse,
    HttpServer,
};
use actix_web_validator::JsonConfig;
use serde_json::json;
use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    ConnectOptions, PgPool,
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
    let mut options =
        PgConnectOptions::from_str(&settings.url).expect("Invalid configured database URL");

    options.log_statements(tracing::log::LevelFilter::Trace);

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
            .wrap(TracingLogger::default())
            .app_data(json_cfg)
            .app_data(query_cfg)
            .app_data(db_pool.clone())
            .app_data(settings.clone())
            .service(crate::routes::index)
            .service(crate::routes::follow)
            .service(crate::routes::health_check)
            .service(crate::routes::get_report_by_id)
            .service(crate::routes::get_reports)
            .service(crate::routes::post_report)
            .service(actix_files::Files::new("/static", "./static"))
    })
    .listen(listener)?
    .run();

    Ok(server)
}
