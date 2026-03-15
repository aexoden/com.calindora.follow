use com_calindora_follow::server::Application;
use com_calindora_follow::settings::get_settings;
use com_calindora_follow::telemetry::{get_subscriber, init_subscriber};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    init_subscriber(get_subscriber(
        "com_calindora_follow".into(),
        "info".into(),
        std::io::stdout,
    ));

    let settings = get_settings();

    match settings {
        Ok(settings) => {
            let application = Application::build(settings).await?;

            application.run().await
        }
        Err(e) => {
            tracing::error!("Failed to read configuration: {e}");
            return Err(std::io::Error::other("Failed to read configuration"));
        }
    }
}
