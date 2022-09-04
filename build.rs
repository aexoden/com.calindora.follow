fn main() {
    dotenv_build::output(dotenv_build::Config::default()).unwrap();
    println!("cargo:rerun-if-changed=migrations");
}
