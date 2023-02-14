use std::str::FromStr;

use com_calindora_follow::util::TIMESTAMP_FORMAT;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::types::BigDecimal;
use time::OffsetDateTime;

use crate::helpers::run_server;

#[derive(serde::Serialize)]
struct ReportRequest {
    pub timestamp: String,
    pub latitude: String,
    pub longitude: String,
    pub altitude: String,
    pub speed: String,
    pub bearing: String,
    pub accuracy: String,
}

impl ReportRequest {
    fn new(
        timestamp: &str,
        latitude: f64,
        longitude: f64,
        altitude: f64,
        speed: f64,
        bearing: f64,
        accuracy: f64,
    ) -> Self {
        Self {
            timestamp: timestamp.to_string(),
            latitude: format!("{latitude:.12}"),
            longitude: format!("{longitude:.12}"),
            altitude: format!("{altitude:.12}"),
            speed: format!("{speed:.12}"),
            bearing: format!("{bearing:.12}"),
            accuracy: format!("{accuracy:.12}"),
        }
    }

    fn signature(&self, secret: &str) -> String {
        type HmacSha256 = Hmac<Sha256>;

        let input = format!(
            "{}{}{}{}{}{}{}",
            self.timestamp,
            self.latitude,
            self.longitude,
            self.altitude,
            self.speed,
            self.bearing,
            self.accuracy
        );

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(input.as_bytes());

        hex::encode(mac.finalize().into_bytes())
    }
}

#[actix_web::test]
async fn post_report_returns_201_for_valid_report() {
    let server = run_server().await;
    let (api_key, api_secret) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let test_cases = vec![
        ReportRequest::new("2022-12-15T15:17:44+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        ReportRequest::new(
            "1978-12-15T00:00:38+00:00",
            90.0,
            -117.43,
            -500.0,
            10.0,
            359.9,
            0.5,
        ),
        ReportRequest::new(
            "2015-12-14T23:59:59+00:00",
            -37.0,
            -180.0,
            45.0,
            500.0,
            15.0,
            12.0,
        ),
    ];

    for test_case in test_cases {
        let body = serde_json::to_string(&test_case).unwrap();
        let signature = test_case.signature(&api_secret);

        let response = server.post_report(&api_key, &signature, &body).await;

        assert_eq!(
            201,
            response.status().as_u16(),
            "The API did not return a 201 Created when the body was {body} and the signature was {signature}",
        );

        assert_eq!(
            "application/json",
            response.headers().get("Content-Type").unwrap(),
            "The API did not return a JSON reponse when a valid report was submitted",
        )
    }
}

#[actix_web::test]
async fn post_report_returns_401_for_invalid_signature() {
    let server = run_server().await;
    let (api_key, _) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let request = ReportRequest::new("2021-12-15T14:15:16+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

    let body = serde_json::to_string(&request).unwrap();
    let signature = "invalid_signature";

    let response = server.post_report(&api_key, signature, &body).await;

    assert_eq!(
        401,
        response.status().as_u16(),
        "The API did not return a 401 Unauthorized for an invalid signature",
    );

    assert_eq!(
        "application/json",
        response.headers().get("Content-Type").unwrap(),
        "The API did not return a JSON error reponse for an invalid signature",
    )
}

#[actix_web::test]
async fn post_report_returns_400_for_invalid_report() {
    let server = run_server().await;
    let (api_key, api_secret) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let test_cases = vec![
        (
            ReportRequest::new("2022-12-15T15:17:44+00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            "incorrectly formatted date",
        ),
        (
            ReportRequest::new("2022-12-15T25:17:44+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            "invalid time",
        ),
        (
            ReportRequest::new("2022-14-15T21:17:44+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            "invalid date",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 90.1, 0.0, 0.0, 0.0, 0.0, 0.0),
            "latitude greater than 90.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", -90.1, 0.0, 0.0, 0.0, 0.0, 0.0),
            "latitude less than -90.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 180.1, 0.0, 0.0, 0.0, 0.0),
            "longitude greater than 180.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, -180.1, 0.0, 0.0, 0.0, 0.0),
            "longitude less than -180.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 0.0, 0.0, -0.1, 0.0, 0.0),
            "speed less than 0.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 0.0, 0.0, 0.0, -0.1, 0.0),
            "bearing less than 0.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 0.0, 0.0, 0.0, 360.1, 0.0),
            "bearing greater than 360.0",
        ),
        (
            ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, -0.1),
            "accuracy less than 0.0",
        ),
        (
            {
                let mut request =
                    ReportRequest::new("2000-01-01T00:00:00+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, -0.1);

                request.latitude = "non-numeric latitude".to_string();

                request
            },
            "non-numeric latitude",
        ),
    ];

    for (test_case, description) in test_cases {
        let body = serde_json::to_string(&test_case).unwrap();
        let signature = test_case.signature(&api_secret);

        tracing::info!("{}", body);

        let response = server.post_report(&api_key, &signature, &body).await;

        assert_eq!(
            400,
            response.status().as_u16(),
            "The API did not return a 400 Bad Request when the payload was invalid: {description}",
        );

        assert_eq!(
            "application/json",
            response.headers().get("Content-Type").unwrap(),
            "The API did not return a JSON error reponse when the payload was invalid: {description}",
        )
    }
}

#[actix_web::test]
async fn post_report_returns_404_for_invalid_api_key() {
    let server = run_server().await;

    let request = ReportRequest::new("2021-12-15T14:15:16+00:00", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

    let body = serde_json::to_string(&request).unwrap();

    let response = server
        .post_report("invalid_api_key", "invalid_signature", &body)
        .await;

    assert_eq!(
        404,
        response.status().as_u16(),
        "The API did not return a 404 Not Found for invalid API key",
    );

    assert_eq!(
        "application/json",
        response.headers().get("Content-Type").unwrap(),
        "The API did not return a JSON error reponse for an invalid API key",
    )
}

#[actix_web::test]
async fn post_report_persists_valid_report() {
    let server = run_server().await;
    let (api_key, api_secret) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let request = ReportRequest::new("2021-12-15T14:15:16+00:00", 0.0, 1.0, 2.0, 3.0, 4.0, 5.0);

    let body = serde_json::to_string(&request).unwrap();
    let signature = request.signature(&api_secret);

    server.post_report(&api_key, &signature, &body).await;

    let report = sqlx::query!("SELECT * FROM reports")
        .fetch_one(&server.db)
        .await
        .expect("Failed to fetch submitted report");

    assert_eq!(
        report.timestamp,
        OffsetDateTime::parse("2021-12-15T14:15:16+00:00", TIMESTAMP_FORMAT).unwrap()
    );
    assert_eq!(report.latitude, BigDecimal::from_str("0.0").unwrap());
    assert_eq!(report.longitude, BigDecimal::from_str("1.0").unwrap());
    assert_eq!(report.altitude, BigDecimal::from_str("2.0").unwrap());
    assert_eq!(report.speed, BigDecimal::from_str("3.0").unwrap());
    assert_eq!(report.bearing, BigDecimal::from_str("4.0").unwrap());
    assert_eq!(report.accuracy, BigDecimal::from_str("5.0").unwrap());
}

#[actix_web::test]
async fn post_report_fails_if_fatal_database_error() {
    let server = run_server().await;
    let (api_key, api_secret) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let request = ReportRequest::new("2021-12-15T14:15:16+00:00", 0.0, 1.0, 2.0, 3.0, 4.0, 5.0);

    let body = serde_json::to_string(&request).unwrap();
    let signature = request.signature(&api_secret);

    sqlx::query!("ALTER TABLE reports DROP COLUMN latitude")
        .execute(&server.db)
        .await
        .unwrap();

    let response = server.post_report(&api_key, &signature, &body).await;

    assert_eq!(
        500,
        response.status().as_u16(),
        "The API did not return a 500 Internal Server Error after a fatal database error",
    );

    assert_eq!(
        "application/json",
        response.headers().get("Content-Type").unwrap(),
        "The API did not return a JSON error reponse after a fatal database error",
    )
}

#[actix_web::test]
async fn follow_returns_html() {
    let server = run_server().await;

    let (api_key, _) = server
        .create_random_device()
        .await
        .expect("Failed to create a test device");

    let response = reqwest::Client::new()
        .get(&format!("{}/follow/{api_key}", &server.base_url))
        .send()
        .await
        .expect("Failed to execute request");

    assert_eq!(
        200,
        response.status().as_u16(),
        "The server did not return a 200 for a valid API key",
    );

    assert_eq!(
        "text/html; charset=utf-8",
        response.headers().get("Content-Type").unwrap(),
        "The server did not return HTML for a valid API key",
    )
}
