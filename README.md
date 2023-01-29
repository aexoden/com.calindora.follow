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

## Authors

* Jason Lynch (Aexoden) <jason@calindora.com>

## Acknowledgements

Some of the code for this application (especially for the testing infrastructure
and some of the boilerplate) is derived from code samples in the book
["Zero to Production in Rust"](https://www.zero2prod.com/) by Luca Palmieri. The
code samples themselves are available under either an MIT or Apache license at
<https://github.com/LukeMathWalker/zero-to-production>.
