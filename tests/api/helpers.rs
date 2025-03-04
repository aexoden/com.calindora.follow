use once_cell::sync::Lazy;
use sqlx::{PgPool, migrate::MigrateDatabase, postgres::PgPoolOptions};
use uuid::Uuid;

use com_calindora_follow::server::{Application, get_db_pool};
use com_calindora_follow::settings::{DatabaseSettings, Settings, get_settings};
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

#[allow(dead_code)]
pub struct TestApplication {
    pub base_url: String,
    pub port: u16,
    pub settings: Settings,
    pub db: PgPool,
}

impl TestApplication {
    pub async fn create_random_device(&self) -> Result<(String, String), sqlx::Error> {
        let id = Uuid::new_v4();
        let api_key = Uuid::new_v4().to_string();
        let api_secret = Uuid::new_v4().to_string();

        sqlx::query!(
            "INSERT INTO devices (id, api_key, api_secret) VALUES ($1, $2, $3)",
            id,
            api_key,
            api_secret
        )
        .execute(&self.db)
        .await?;

        Ok((api_key, api_secret))
    }

    pub async fn post_report(
        &self,
        api_key: &str,
        signature: &str,
        body: &str,
    ) -> reqwest::Response {
        reqwest::Client::new()
            .post(format!(
                "{}/api/v1/devices/{api_key}/reports",
                &self.base_url
            ))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .header("X-Signature", signature)
            .body(body.to_string())
            .send()
            .await
            .expect("Failed to execute request")
    }
}

pub async fn run_server() -> TestApplication {
    Lazy::force(&TRACING);

    let database_name = Uuid::new_v4().to_string();

    let settings = {
        let mut settings = get_settings().expect("Failed to read settings");

        settings.application.address = "127.0.0.1".to_string();
        settings.application.port = 0;
        settings.database.url = format!(
            "postgres://postgres:password@localhost/com_calindora_follow_test_{database_name}"
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
