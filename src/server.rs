use std::net::TcpListener;

use actix_web::{dev::Server, App, HttpServer};
use tracing_actix_web::TracingLogger;

use crate::settings::Settings;

pub struct Application {
    port: u16,
    server: Server,
}

impl Application {
    pub async fn build(settings: Settings) -> Result<Self, std::io::Error> {
        let address = format!(
            "{}:{}",
            settings.application.address, settings.application.port
        );

        let listener = TcpListener::bind(&address)?;
        tracing::info!("Listening on {}", &address);
        let port = listener.local_addr().unwrap().port();

        let server = run(listener)?;

        Ok(Self { port, server })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn run(self) -> Result<(), std::io::Error> {
        self.server.await
    }
}

fn run(listener: TcpListener) -> Result<Server, std::io::Error> {
    let server = HttpServer::new(|| {
        App::new()
            .wrap(TracingLogger::default())
            .service(crate::routes::index)
            .service(crate::routes::health_check)
    })
    .listen(listener)?
    .run();

    Ok(server)
}
