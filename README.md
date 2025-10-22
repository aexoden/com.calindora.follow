# Calindora Follow

![Rust](https://github.com/aexoden/com.calindora.follow/actions/workflows/general.yml/badge.svg)

This is a web application to allow users to automatically submit location
reports and have those reports displayed on a map. It is primarily useful for
sharing one's location with friends and family. It is primarily meant for my own
personal use, and is therefore not particularly user friendly.

## Deployment

This application is intended to be deployed via [Dokku](https://dokku.com). In
order to successfully deploy, you should set the following environment variables:

```sh
APP_ENVIRONMENT=production
DATABASE_URL=<database URL>
SQLX_OFFLINE=true
```

Replace ```<database URL>``` with the appropriate URL to a Postgres database.
The angle brackets should not be included. If using Dokku, DATABASE_URL should
be set automatically when associating the database to the application.

In addition, a valid Google Maps API key should be specified via the
`VITE_GOOGLE_MAPS_API_KEY` environment variable.

## Development

If developing on a local machine, you should either set a ```DATABASE_URL```
environment variable or create a .env file in the root project directory that
contains the same variable. The URL should point to a working Postgres server,
and the database should exist.

If intending to run the test suite, note that the test suite will use the
database credentials configured via ```DATABASE_URL``` (or from the settings
files if not specified). The provided database user needs to have permission to
create databases, as the test suite creates test databases with random names
for isolation. These test databases are not currently cleaned up in any way.

In addition, you may sent the `APP_APPLICATION__ADDRESS` and `APP_APPLICATION__PORT`
environment variables to adjust the listening port and address.

It is recommended to run the main server with `cargo run` and then to separately
run the frontend in the frontend directory with `pnpm run dev`. A second .env file
may be placed in the frontend directory with the `VITE_API_BASE_URL` variable to
set the API address and the `VITE_GOOGLE_MAPS_API_KEY` variable shoudl contain a
valid Google Maps API key.

## Authors

* Jason Lynch (Aexoden) <jason@calindora.com>

## Acknowledgements

Some of the code for this application (especially for the testing infrastructure
and some of the boilerplate) is derived from code samples in the book
["Zero to Production in Rust"](https://www.zero2prod.com/) by Luca Palmieri. The
code samples themselves are available under either an MIT or Apache license at
<https://github.com/LukeMathWalker/zero-to-production>.
