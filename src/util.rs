use time::{format_description::FormatItem, macros::format_description};

pub const TIMESTAMP_FORMAT: &[FormatItem<'_>] = format_description!(
    "[year]-[month]-[day]T[hour]:[minute]:[second][offset_hour sign:mandatory]:[offset_minute]"
);

pub fn error_chain_fmt(
    e: &impl std::error::Error,
    f: &mut std::fmt::Formatter<'_>,
) -> std::fmt::Result {
    writeln!(f, "{e}\n")?;
    let mut current = e.source();
    while let Some(cause) = current {
        writeln!(f, "Caused by:\n\t{cause}")?;
        current = cause.source();
    }

    Ok(())
}
