use once_cell::sync::Lazy;
use sqlx::{migrate::MigrateDatabase, postgres::PgPoolOptions, PgPool};
use uuid::Uuid;

use com_calindora_follow::server::{get_db_pool, Application};
use com_calindora_follow::settings::{get_settings, DatabaseSettings, Settings};
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
    pub settings: Settings,
    pub db: PgPool,
}

pub async fn run_server() -> TestApplication {
    Lazy::force(&TRACING);

    let database_name = Uuid::new_v4().to_string();

    let settings = {
        let mut settings = get_settings().expect("Failed to read settings");

        settings.application.address = "127.0.0.1".to_string();
        settings.application.port = 0;
        settings.database.url = format!(
            "postgres://postgres:password@localhost/com_calindora_follow-test-{database_name}"
        );

        settings
    };

    configure_database(&settings.database).await.close().await;

    let application = Application::build(settings.clone())
        .await
        .expect("Failed to build application");

    let application_port = application.port();

    actix_web::rt::spawn(application.run());

    TestApplication {
        base_url: format!("http://127.0.0.1:{application_port}"),
        port: application_port,
        db: get_db_pool(&settings.database),
        settings,
    }
}

async fn configure_database(settings: &DatabaseSettings) -> PgPool {
    sqlx::Postgres::create_database(&settings.url)
        .await
        .expect("Failed to create database");

    let db = PgPoolOptions::new()
        .connect_lazy(&settings.url)
        .expect("Failed to connect to database");

    sqlx::migrate!()
        .run(&db)
        .await
        .expect("Failed to migrate database");

    db
}
