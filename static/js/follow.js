/*
 * Global Variables
 */

var com = com || {};
com.calindora = com.calindora || {};
com.calindora.follow = com.calindora.follow || {};

/*
 * Module Definition
 */

com.calindora.follow.follow = function()
{
    /*
     * Constants
     */

    const google = window.google;

    const LIMIT = 86400 * 1000 * 2;
    const TRIP_AGE_THRESHOLD = 120 * 1000;
    const DELAYED_THRESHOLD = 15 * 1000;
    const REPORT_LIMIT = 1000;

    const TRIP_COLORS = [
        "#0066CC",
        "#0962C3",
        "#125DBA",
        "#1B59B1",
        "#2354A9",
        "#2C50A0",
        "#354B97",
        "#3E478E",
        "#474385",
        "#503E7C",
        "#593A73",
        "#62356A",
        "#6A3162",
        "#732C59",
        "#7C2850",
        "#852347",
        "#8E1F3E",
        "#971B35",
        "#A0162C",
        "#A91223",
        "#B10D1B",
        "#BA0912",
        "#C30409",
        "#CC0000",
    ];

    /*
     * Global Variables
     */

    let _follow = null;

    /*
     * Classes
     */

    const Follow = class {
        #accuracyCircle = null;
        #immediateUpdate = false;
        #map = null;
        #marker = null;
        #trips = [];
        #updateIntervalHandle = null;
        #updating = false;
        #url = null;

        constructor(url) {
            this.#url = url;

            let position = new google.maps.LatLng(0.0, 0.0);

            let mapOptions = {
                center: position,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                zoom: 12,
            };

            this.#map = new google.maps.Map(document.getElementById("map"), mapOptions);

            this.#map.addListener("dragstart", () => {
                document.getElementById("switch_auto_center").checked = false;
            });

            this.#marker = new google.maps.Marker({
                position: position,
                map: this.#map,
            });

            this.#accuracyCircle = new google.maps.Circle({
                center: position,
                fillColor: "#006699",
                fillOpacity: 0.3,
                map: this.#map,
                radius: 1000.0,
                strokeColor: "#006699",
                strokeOpacity: 0.9,
            });

            document.getElementById("switch_auto_center").addEventListener("change", this.updateMarker.bind(this));

            this.onUpdate();
            this.#updateIntervalHandle = setInterval(this.onUpdate.bind(this), 5000);
        }

        /*
         * Event Handlers
         */

        onUpdate() {
            if (this.#updating) {
                return;
            }

            this.#updating = true;

            let parameters = {};
            parameters.order = "asc";
            parameters.limit = REPORT_LIMIT;

            if (this.#trips.length == 0 || this.#trips[this.#trips.length - 1].length == 0) {
                parameters.since = new Date(new Date().getTime() - LIMIT).toISOString();
            } else {
                let last_trip = this.#trips[this.#trips.length - 1];
                let last_report = last_trip.last_report;

                parameters.since = last_report.timestamp.toISOString();
            }

            $.getJSON(this.#url, parameters,
                function(data) {
                    this.update(data);
                }.bind(this),
            ).always(function(_) {
                this.#updating = false;

                if (this.#immediateUpdate) {
                    this.onUpdate();
                }
            }.bind(this));
        }

        /*
         * Private Methods
         */

        addReport(report) {
            let trip_active = this.#trips.length > 0 && report.age - this.#trips[this.#trips.length - 1].age < TRIP_AGE_THRESHOLD;
            let current_trip = null;

            if (trip_active) {
                current_trip = this.#trips.pop();
            } else {
                current_trip = new Trip(this.#map);
            }

            current_trip.addReport(report);
            this.#trips.push(current_trip);
        }

        prune() {
            for (let i = 0; i < this.#trips.length; i++) {
                let trip = this.#trips[i];
                trip.prune();
            }

            while (this.#trips.length > 0 && this.#trips[0].length == 0) {
                this.#trips.shift();
            }
        }

        update(reports) {
            for (let i = 0; i < reports.length; i++) {
                this.addReport(new Report(reports[i]));
            }

            this.updateTrips();
            this.updateMarker();
            this.updateStatus();
            this.prune();

            this.#immediateUpdate = reports.length == REPORT_LIMIT;
        }

        updateMarker() {
            if (this.#trips.length > 0) {
                let report = this.#trips[this.#trips.length - 1].last_report;

                let position = new google.maps.LatLng(report.latitude, report.longitude);

                if (document.getElementById("switch_auto_center").checked) {
                    this.#map.panTo(position);
                }

                this.#marker.setPosition(position);
                this.#accuracyCircle.setCenter(position);
                this.#accuracyCircle.setRadius(report.accuracy);
            }
        }

        updateStatus() {
            if (this.#trips.length > 0) {
                let report = this.#trips[this.#trips.length -1].last_report;

                let delay = "";

                if (report.submit_timestamp - report.timestamp > DELAYED_THRESHOLD) {
                    let seconds = (report.submit_timestamp - report.timestamp) / 1000;

                    if (seconds > 60) {
                        let minutes = Math.floor(seconds / 60);
                        let suffix = "";

                        if (minutes != 1) {
                            suffix = "s";
                        }

                        delay = "<br>(delayed " + Math.floor(seconds / 60) + " minute" + suffix + ")";
                    } else {
                        let suffix = "";

                        if (Math.floor(seconds) != 1) {
                            suffix = "s";
                        }

                        delay = "<br>(delayed " + Math.floor(seconds) + " second" + suffix + ")";
                    }
                }

                document.getElementById("status_last_update_time").innerHTML = report.timestamp.toLocaleString() + delay;
                document.getElementById("status_latitude").innerHTML = Math.round(report.latitude * 100000) / 100000 + "&#176;";
                document.getElementById("status_longitude").innerHTML = Math.round(report.longitude * 100000) / 100000 + "&#176;";
                document.getElementById("status_altitude").innerHTML = Math.round(report.altitude * 3.2808399) + " ft";
                document.getElementById("status_speed").innerHTML = Math.round(report.speed * 2.23693629) + " MPH";
                document.getElementById("status_bearing").innerHTML = Math.round(report.bearing) + "&#176;";
            }
        }

        updateTrips() {
            for (let i = 0; i < this.#trips.length; i++) {
                let trip = this.#trips[i];
                trip.update();
            }
        }
    };

    const Polyline = class {
        #path = null;
        #polyline = null;

        constructor(map) {
            this.#path = new google.maps.MVCArray();

            let options = {
                map: map,
                path: this.#path,
                strokeColor: "#FFFFFF",
            };

            this.#polyline = new google.maps.Polyline(options);
        }

        set color(color) {
            this.#polyline.setOptions({
                strokeColor: color,
            });
        }

        set opacity(opacity) {
            this.#polyline.setOptions({
                strokeOpacity: opacity,
            });
        }

        add(report) {
            this.#path.push(new google.maps.LatLng(report.latitude, report.longitude));
        }

        clear() {
            this.#path.clear();
        }

        render() {
            this.#polyline.setPath(this.#path);
        }
    };

    const Report = class {
        constructor(report) {
            this.timestamp = new Date(Date.parse(report.timestamp));
            this.submit_timestamp = new Date(Date.parse(report.submit_timestamp));
            this.latitude = parseFloat(report.latitude);
            this.longitude = parseFloat(report.longitude);
            this.altitude = parseFloat(report.altitude);
            this.speed = parseFloat(report.speed);
            this.bearing = parseFloat(report.bearing);
            this.accuracy = parseFloat(report.accuracy);
        }

        get age() {
            return new Date() - this.timestamp;
        }
    };

    const Trip = class {
        #map = null;
        #reports = [];
        #polylines = [];

        constructor(map) {
            this.#map = map;

            for (let i = 0; i < TRIP_COLORS.length; i++) {
                this.#polylines.push(new Polyline(this.#map));
            }
        }

        get age() {
            if (this.#reports.length > 0) {
                return this.#reports[this.#reports.length - 1].age;
            } else {
                return 0;
            }
        }

        get last_report() {
            return this.#reports[this.#reports.length - 1];
        }

        get length() {
            return this.#reports.length;
        }

        addReport(report) {
            this.#reports.push(report);
        }

        prune() {
            while (this.#reports.length > 0 && this.#reports[0].age > LIMIT) {
                this.#reports.shift();
            }

            this.regeneratePolylines();
        }

        regeneratePolylines() {
            for (let i = 0; i < this.#polylines.length; i++) {
                this.#polylines[i].clear();
                this.#polylines[i].color = TRIP_COLORS[i];
                this.#polylines[i].opacity = (TRIP_COLORS.length - i) / (TRIP_COLORS.length * 4) + 0.75;
            }

            for (let i = 0; i < this.#reports.length; i++) {
                let report = this.#reports[i];
                let colorIndex = TRIP_COLORS.length - Math.min(TRIP_COLORS.length, Math.ceil(report.age / (2 * 60 * 60 * 1000)));

                if (this.#polylines[colorIndex].length == 0 && colorIndex > 0) {
                    this.#polylines[colorIndex - 1].add(report);
                }

                this.#polylines[colorIndex].add(report);
            }

            for (let i = 0; i < this.#polylines.length; i++) {
                this.#polylines[i].render();
            }
        }

        update() {
            this.regeneratePolylines();
        }
    };

    /*
     * Functions
     */

    const init = function(url) {
        _follow = new Follow(url);
    };

    /*
     * Public Definition
     */

    return {
        init: init,
    };
};


/*


*/
