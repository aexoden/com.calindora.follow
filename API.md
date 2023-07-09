# com_calindora_follow API

This file documents the API implemented by this software. As this is primarily
a project for the author's personal use for friends and family, this document is
intended only as a basic reference. In the event of conflict between this
document and the software, the source code is considered authoritative.

## Basic Information

All API requests live under the `/api` namespace. The second component in the
path should be a `v` followed by an integer representing the desired version of
the API. All further components are specific to the particular request.

## Versions

There is currently one version of the API, version 1. This API version is not
yet stable, and changes may occur at any time. In other words, THERE IS NO
CURRENT STABLE API.

## Reports

Reports are accessed at the `/api/v1/devices/{api_key}/reports` endpoint.

This endpoint allows the client to store and retrieve reports associated with
the given API key. The API key itself is a string of arbitrary length and
contents. As the only way to add or remove devices at this time is directly via
the database, it falls upon the administrator to determine an appropriate
convention for their use case.

Associated with each device is additionally a secret key. As with the API key,
this secret key is an arbitrary string.

This endpoint allows for both GET and POST requests. Each will be described below:

### GET

A GET request at this endpoint allows the client to fetch location reports
associated with the given device. There is currently no authentication
associated with this action. The endpoint accepts several URL-encoded query
parameters to further refine the results:

* `order`: Should have a value of either `asc` to sort in ascending order or
           `desc` to sort in descending order (both by timestamp).
* `limit`: An integer representing the limit of results to return.
* `since`: An ISO8601 formatted timestamp all returned results must occur after.
* `until`: An ISO8601 formatted timestamp all returned results must occur before.

### POST

A POST request adds the posted report to the database. The request should send
its data as a JSON-formatted document. A sample request is listed below:

```json
{
    "timestamp": "2023-01-01T00:00:00+00:00",
    "latitude": "0.0",
    "longitude": "0.0",
    "altitude": "0.0",
    "speed": "0.0",
    "bearing": "0.0",
    "accuracy": "0.0",
}
```

A brief description of each field is provided below:

* `timestamp`: An ISO8601 formatted timestamp representing the date and time of
               the location report.
* `latitude`: The latitude of the location report. Should be in the range [-90, 90].
* `longitude`: The longitude of the location report. Should be in the range
               [-180, 180].
* `altitude`: The altitude of the location report.
* `speed`: The speed of the location report. Should be greater than or equal to zero.
* `bearing`: The bearing of the location report. Should be in the range [0, 360].
* `accuracy`: The accuracy of the location report. Should be greater than or
              equal to zero.

In addition, the request should have a custom `X-Signature` header with a
signature calculated as follows. The signature should be an HMAC signature with
a SHA256 hash function. The secret key is the previously defined secret key
associated with the device, interpreted as bytes. The input to the signature is
the seven fields of the request, in the order listed above, concatenated into a
single string, with some additional restrictions for consistency. The timestamp
should be interpreted in UTC and formatted as `yyyy-mm-ddTHH:MM:SS+00:00`. The
six numeric fields should be formatted with 12 digits after the decimal point
using zeroes to pad as necessary.

## Notes

Since this is primarily a personal use project, I have little intention of
improving this API beyond my own needs. Be aware that as written above, it is
currently subject to a limited replay attack. If an attacker were to gain access
to a previously calculated valid signature, they could in principle resubmit
this same request several times. In addition, since any subsecond portion of the
timestamp is not currently included in the signature generation, the attacker
could alter the subsecond portion in repeated requests. The negative
consequences of this attack are minimal at best, but it nonetheless does exist.
A relatively simple solution will be to add a nonce to the signature generation
and request, and for the server to deny any further uses of the same nonce by
that device.
