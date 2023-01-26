#[derive(serde::Deserialize)]
pub struct Settings {
    pub application: ApplicationSettings,
}

#[derive(serde::Deserialize)]
pub struct ApplicationSettings {
    pub address: String,
    pub port: u16,
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
                "{} is not a supported environment. Use either `development` or `production`",
                other
            )),
        }
    }
}

pub fn get_environment() -> Environment {
    std::env::var("APP_ENVIRONMENT")
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
        .build()?;

    settings.try_deserialize::<Settings>()
}
