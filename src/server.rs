use std::net::TcpListener;

use actix_web::{dev::Server, web::Data, App, HttpServer};
use sqlx::{postgres::PgPoolOptions, PgPool};
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

        let server = run(listener, db_pool)?;

        Ok(Self { port, server })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn run(self) -> std::io::Result<()> {
        self.server.await
    }
}

fn get_db_pool(settings: &DatabaseSettings) -> PgPool {
    PgPoolOptions::new()
        .max_connections(20)
        .connect_lazy(&settings.url)
        .expect("Invalid configured database URL")
}

fn run(listener: TcpListener, db_pool: PgPool) -> std::io::Result<Server> {
    let db_pool = Data::new(db_pool);

    let server = HttpServer::new(move || {
        App::new()
            .wrap(TracingLogger::default())
            .service(crate::routes::index)
            .service(crate::routes::health_check)
            .service(crate::routes::get_device_by_api_key)
            .app_data(db_pool.clone())
    })
    .listen(listener)?
    .run();

    Ok(server)
}
