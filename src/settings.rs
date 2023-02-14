#[derive(serde::Deserialize, Clone)]
pub struct Settings {
    pub application: ApplicationSettings,
    pub database: DatabaseSettings,
}

#[derive(serde::Deserialize, Clone)]
pub struct ApplicationSettings {
    pub address: String,
    pub maps_api_key: String,
    pub port: u16,
}

#[derive(serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub url: String,
}

#[derive(PartialEq)]
pub enum Environment {
    Development,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Development => "development",
            Environment::Production => "production",
        }
    }
}

impl TryFrom<String> for Environment {
    type Error = String;

    fn try_from(s: String) -> Result<Self, Self::Error> {
        match s.to_lowercase().as_str() {
            "development" => Ok(Self::Development),
            "production" => Ok(Self::Production),
            other => Err(format!(
                "{other} is not a supported environment. Use either `development` or `production`",
            )),
        }
    }
}

pub fn get_environment() -> Environment {
    dotenvy::var("APP_ENVIRONMENT")
        .unwrap_or_else(|_| "development".into())
        .try_into()
        .expect("Failed to parse APP_ENVIRONMENT")
}

pub fn get_settings() -> Result<Settings, config::ConfigError> {
    let base_path = std::env::current_dir().expect("Failed to determine the current directory");
    let settings_path = base_path.join("settings");

    let environment_filename = format!("{}.yaml", get_environment().as_str());

    let settings = config::Config::builder()
        .add_source(config::File::from(settings_path.join("base.yaml")))
        .add_source(config::File::from(settings_path.join(environment_filename)))
        .add_source(
            config::Environment::with_prefix("APP")
                .prefix_separator("_")
                .separator("__"),
        )
        .set_override_option("database.url", dotenvy::var("DATABASE_URL").ok())?
        .build()?;

    settings.try_deserialize::<Settings>()
}
