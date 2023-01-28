use tracing::{subscriber::set_global_default, Subscriber};
use tracing_bunyan_formatter::{BunyanFormattingLayer, JsonStorageLayer};
use tracing_log::LogTracer;
use tracing_subscriber::{
    filter::filter_fn,
    fmt::{format::FmtSpan, MakeWriter},
    layer::SubscriberExt,
    EnvFilter, Layer, Registry,
};

use crate::settings::{get_environment, Environment};

pub fn get_subscriber<Sink>(
    name: String,
    env_filter: String,
    sink: Sink,
) -> impl Subscriber + Send + Sync
where
    Sink: for<'a> MakeWriter<'a> + Send + Sync + Copy + 'static,
{
    let environment = get_environment();

    let emit_bunyan = environment == Environment::Production;
    let emit_pretty = environment == Environment::Development;

    let bunyan_json_layer = JsonStorageLayer.with_filter(filter_fn(move |_| emit_bunyan));
    let bunyan_formatting_layer =
        BunyanFormattingLayer::new(name, sink).with_filter(filter_fn(move |_| emit_bunyan));

    let pretty_formatting_layer = tracing_subscriber::fmt::layer()
        .with_writer(sink)
        .with_span_events(FmtSpan::CLOSE)
        .with_filter(filter_fn(move |_| emit_pretty));

    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(env_filter));

    Registry::default()
        .with(env_filter)
        .with(bunyan_json_layer)
        .with(bunyan_formatting_layer)
        .with(pretty_formatting_layer)
}

pub fn init_subscriber(subscriber: impl Subscriber + Send + Sync) {
    LogTracer::init().expect("Failed to set logger");
    set_global_default(subscriber).expect("Failed to set subscriber");
}
