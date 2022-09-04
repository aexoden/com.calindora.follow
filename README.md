# Calindora Follow

This is a web application to allow users to automatically submit location
reports and have those reports displayed. It is primarily useful for sharing
one's location with friends and family. It is primarily meant for my own
personal use, and is thus not particularly user friendly.

## Deployment

This application is intended to be deployed via [Dokku](https://dokku.com).
In order to successfully deploy, you should set the following environment
variables:

```sh
DATABASE_URL=<database URL>
ROCKET_DATABASES={follow={url="<database URL>"}}
SQLX_OFFLINE=true
```

```DATABASE_URL``` may not be strictly necessary, but is standard and may end up being
set automatically.

Replace ```<database URL>``` with the appropriate URL to a Postgres database. The
angle brackets should not be included.
