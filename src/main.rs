use std::net::TcpListener;

use com_calindora_follow::settings::get_settings;
use com_calindora_follow::telemetry::{get_subscriber, init_subscriber};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    init_subscriber(get_subscriber(
        "com_calindora_follow".into(),
        "info".into(),
        std::io::stdout,
    ));

    let settings = get_settings().expect("Failed to read configuration");
    let address = format!(
        "{}:{}",
        settings.application.address, settings.application.port
    );

    let listener = TcpListener::bind(&address)?;
    tracing::info!("Listening on {}", &address);

    com_calindora_follow::server::run(listener)?.await
}
