#[macro_use]
extern crate rocket;

#[launch]
fn rocket() -> _ {
    rocket::build().attach(com_calindora_follow::stage())
}
