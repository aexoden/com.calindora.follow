use std::net::TcpListener;

use actix_web::{dev::Server, get, App, HttpResponse, HttpServer, Responder};
use tracing_actix_web::TracingLogger;

pub mod telemetry;

#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[get("/health_check")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok()
}

pub fn run(listener: TcpListener) -> Result<Server, std::io::Error> {
    let server = HttpServer::new(|| {
        App::new()
            .wrap(TracingLogger::default())
            .service(index)
            .service(health_check)
    })
    .listen(listener)?
    .run();

    Ok(server)
}
