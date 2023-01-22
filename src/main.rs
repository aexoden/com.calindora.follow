use com_calindora_follow::run;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    run().await
}
