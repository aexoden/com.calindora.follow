use crate::helpers::run_server;

#[actix_web::test]
async fn health_check_works() {
    let server = run_server().await;
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/health_check", &server.base_url))
        .send()
        .await
        .expect("Failed to execute request");

    assert!(response.status().is_success());
    assert_eq!(Some(0), response.content_length());
}
