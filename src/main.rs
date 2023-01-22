use std::net::TcpListener;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("0.0.0.0:5000")?;

    com_calindora_follow::run(listener)?.await
}
