use std::net::TcpListener;

use actix_web::{dev::Server, App, HttpServer};
use tracing_actix_web::TracingLogger;

pub fn run(listener: TcpListener) -> Result<Server, std::io::Error> {
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
