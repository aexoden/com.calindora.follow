use std::net::TcpListener;

use com_calindora_follow::telemetry::{get_subscriber, init_subscriber};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    init_subscriber(get_subscriber(
        "com_calindora_follow".into(),
        "info".into(),
        std::io::stdout,
    ));

    let listener = TcpListener::bind("0.0.0.0:5000")?;
    tracing::info!("Listening on 0.0.0.0:5000");

    com_calindora_follow::run(listener)?.await
}
