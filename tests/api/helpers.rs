use once_cell::sync::Lazy;

use com_calindora_follow::server::Application;
use com_calindora_follow::settings::get_settings;
use com_calindora_follow::telemetry::{get_subscriber, init_subscriber};

static TRACING: Lazy<()> = Lazy::new(|| {
    if std::env::var("TEST_LOG").is_ok() {
        init_subscriber(get_subscriber(
            "test".into(),
            "debug".into(),
            std::io::stdout,
        ));
    } else {
        init_subscriber(get_subscriber("test".into(), "debug".into(), std::io::sink));
    }
});

pub struct TestApplication {
    pub base_url: String,
    pub port: u16,
}

pub async fn run_server() -> TestApplication {
    Lazy::force(&TRACING);

    let settings = {
        let mut settings = get_settings().expect("Failed to read settings");

        settings.application.address = "127.0.0.1".to_string();
        settings.application.port = 0;

        settings
    };

    let application = Application::build(settings.clone())
        .await
        .expect("Failed to build application");

    let application_port = application.port();

    actix_web::rt::spawn(application.run());

    TestApplication {
        base_url: format!("http://127.0.0.1:{application_port}"),
        port: application_port,
    }
}
