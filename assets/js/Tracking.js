// All load/GPS data comes through the Khalsa tracking proxy (Azure Function),
// which holds the TMS and GPS API keys server-side. No secrets in this file.
const TRACKING_API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:7071/api'
    : 'https://khalsa-tracking-api.azurewebsites.net/api';
const MAPS_EMBED_KEY = 'AIzaSyAVNJjUTj_u2CeM8KRbt4IS2NUfTYXlStg';

// Per-site carrier config — the only lines that differ between the company sites.
const TRACKING_CARRIER = 'akalfreight';
const CARRIER_NAME = 'Akal Freight LLC';
const DISPATCH_EMAIL = 'akalfreight@gmail.com';
const DISPATCH_PHONE = '833-281-3151';

// Tracking.js is included on every page; only tracking.html has the form.
const loadSearchForm = document.getElementById('loadSearchForm');
if (loadSearchForm) {
    loadSearchForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const loadId = $('#searchInput').val().trim();

        // Show loading overlay
        $('#loading-overlay').show();

        $.ajax({
            url: TRACKING_API_BASE + '/track/' + encodeURIComponent(loadId) + '?carrier=' + TRACKING_CARRIER,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                updateLoadInfo(data);
                $('#loading-overlay').hide();
            },
            error: function (error) {
                console.log('Error fetching load information:', error);
                const loadInfoDiv = document.getElementById('loadInfo');
                loadInfoDiv.innerHTML = `
                <div class="track-card p-4 p-md-5 text-center">
                    <h4 class="text-danger mb-2">No load information found</h4>
                    <p class="mb-0 text-secondary">We couldn't find load <strong class="track-num">#${escapeHtml(loadId)}</strong>. Please double-check the load number, or contact Admin.</p>
                </div>
                `;
                $('#loading-overlay').hide();
            }
        });
    });
}

function updateLoadInfo(data) {
    const loadData = data.load;
    const loadInfoDiv = document.getElementById('loadInfo');

    var legs = '';
    loadData.PickUpLoadLeg.forEach(function (leg, i) {
        legs += LegItem(leg, true, loadData.PickUpLoadLeg.length > 1 ? i + 1 : 0, LegEta(data.eta, 'pickup', i));
    });
    loadData.DropOffLoadLeg.forEach(function (leg, i) {
        legs += LegItem(leg, false, loadData.DropOffLoadLeg.length > 1 ? i + 1 : 0, LegEta(data.eta, 'dropoff', i));
    });

    loadInfoDiv.innerHTML = `
        <div class="track-card p-3 p-md-4 mb-4 text-start">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                    <div class="track-eyebrow">Load Number</div>
                    <h2 class="mb-0 fw-bold track-num">#${loadData.LoadNumber} ${LoadStatusBadge(loadData.StatusName)}</h2>
                </div>
                <div class="text-sm-end">
                    <div class="track-eyebrow">Carrier</div>
                    <h5 class="mb-0">${CARRIER_NAME}</h5>
                </div>
            </div>
            <div class="text-secondary small mt-3 mb-0">Load information updates periodically &mdash; refresh the page for the latest.</div>
        </div>

        <div class="row g-4 pb-4 text-start">
            <div class="col-lg-7">
                <div class="track-card p-3 p-md-4 h-100">
                    <div class="track-eyebrow mb-3">Route</div>
                    ${legs}
                </div>
            </div>
            <div class="col-lg-5 d-flex flex-column gap-4">
                ${CreateDriverHtml(data.drivers, loadData.TruckName, loadData.TrailerName)}
                <div class="track-card p-3 p-md-4">
                    <div class="track-eyebrow mb-2">Dispatcher</div>
                    <div class="track-kv"><span class="k">Email</span><span class="v"><a href="mailto:${DISPATCH_EMAIL}">${DISPATCH_EMAIL}</a></span></div>
                    <div class="track-kv"><span class="k">Phone</span><span class="v track-num"><a href="tel:${DISPATCH_PHONE.replace(/[^\d]/g, '')}">${DISPATCH_PHONE}</a></span></div>
                </div>
            </div>
        </div>
        ${AdjacentLoadsHtml(data.adjacentLoads, loadData.PickUpLoadLeg.length ? loadData.PickUpLoadLeg[0].LoadStartTime : null)}
        ${MapHtml(data, loadData)}
    `;
}

function LegItem(leg, isPickup, stopNumber, etaHtml) {
    const kind = isPickup ? 'pickup' : 'dropoff';
    const label = (isPickup ? 'Pick Up' : 'Drop Off') + (stopNumber ? ' ' + stopNumber : '');
    const labelColor = isPickup ? 'text-success' : 'text-warning';
    const done = getMilitaryTime(leg.CheckOut) != '0000';
    return `
        <div class="track-leg track-leg-${kind}${done ? ' track-leg-done' : ''}">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                    <div class="track-eyebrow ${labelColor}">${label}</div>
                    <h5 class="fw-bold mb-1">${escapeHtml(leg.AddressString)}</h5>
                </div>
                <div class="d-flex gap-1">
                    ${HeldUpBadge(leg)}
                    ${StatusBadge(LegStatus(leg, isPickup))}
                </div>
            </div>
            <div class="track-times">
                <span>Appt <strong>${formatDate(leg.LoadStartTime)}</strong></span>
                <span>In <strong>${CheckTime(leg.CheckIn)}</strong></span>
                <span>Out <strong>${CheckTime(leg.CheckOut)}</strong></span>
            </div>
            ${etaHtml}
        </div>
    `;
}

// "—" instead of the confusing 0000 sentinel; otherwise just the time of day.
function CheckTime(dateTimeString) {
    return getMilitaryTime(dateTimeString) == '0000' ? '&mdash;' : formatTime(dateTimeString);
}

// Flag a leg where the driver sat for over an hour. An early arrival doesn't
// start the clock until the appointment time; a late one counts from check-in.
function HeldUpBadge(leg) {
    if (getMilitaryTime(leg.CheckIn) == '0000' || getMilitaryTime(leg.CheckOut) == '0000') {
        return '';
    }
    var start = new Date(leg.CheckIn);
    var appt = new Date(leg.LoadStartTime);
    if (!isNaN(appt) && appt > start) {
        start = appt;
    }
    const dwellMs = new Date(leg.CheckOut) - start;
    if (dwellMs <= 3600000) {
        return '';
    }
    const hrs = (dwellMs / 3600000).toFixed(1);
    return `<span class="badge rounded-pill text-bg-danger">Held up &middot; ${hrs} hr</span>`;
}

function StatusBadge(status) {
    var cls = 'text-bg-secondary';
    if (status === 'Picked' || status === 'Delivered') cls = 'text-bg-success';
    else if (status === 'Checked IN') cls = 'text-bg-info';
    else if (status === 'On His Way') cls = 'text-bg-warning';
    return `<span class="badge rounded-pill ${cls}">${escapeHtml(status || 'Scheduled')}</span>`;
}

function LoadStatusBadge(statusName) {
    if (!statusName) return '';
    var cls = 'text-bg-secondary';
    if (statusName === 'Delivered') cls = 'text-bg-success';
    else if (statusName === 'Picked') cls = 'text-bg-info';
    return `<span class="badge rounded-pill ${cls} align-middle fs-6">${escapeHtml(statusName)}</span>`;
}

// ETA callout on the leg the truck is currently heading to (Avenger loads
// only; the server omits eta for everyone else).
function LegEta(eta, legType, legIndex) {
    if (!eta || eta.legType !== legType || eta.legIndex !== legIndex) {
        return '';
    }
    const hours = Math.floor(eta.driveMinutes / 60);
    const minutes = eta.driveMinutes % 60;
    const duration = (hours > 0 ? hours + 'h ' : '') + minutes + 'm';
    return `
            <div class="track-eta">
                <strong>ETA ~${duration} &middot; ${eta.distanceMi} mi</strong>
                <span>Arrives ~${formatDate(eta.arrivalIso)}</span>
            </div>
    `;
}

// Previous / next load the driver is running (Avenger loads only).
function AdjacentLoadsHtml(adjacentLoads, currentPickupTime) {
    if (!adjacentLoads || (!adjacentLoads.prev && !adjacentLoads.next)) {
        return '';
    }
    var cards = '';
    [['Previous Load', adjacentLoads.prev], ['Next Load', adjacentLoads.next]].forEach(function (pair) {
        const title = pair[0], l = pair[1];
        if (!l) return;
        var dateLine;
        if (title === 'Previous Load') {
            if (l.StatusName === 'Delivered') {
                dateLine = 'Delivered ' + formatDate(l.endTime || l.startTime);
            } else if (currentPickupTime) {
                // Round-trip assumption: the previous load delivers right when
                // the current load gets picked up.
                dateLine = 'Delivery ~' + formatDate(currentPickupTime);
            } else {
                dateLine = 'Pickup ' + formatDate(l.startTime);
            }
        } else {
            dateLine = 'Pickup ' + formatDate(l.startTime);
        }
        cards += `
            <div class="col-md-6">
                <div class="track-card p-3 h-100">
                    <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
                        <div class="track-eyebrow mb-0">${title}</div>
                        ${StatusBadge(l.StatusName)}
                    </div>
                    <h5 class="fw-bold track-num mb-1">#${escapeHtml(String(l.LoadNumber))}</h5>
                    <div class="track-route-line">
                        <span>${escapeHtml(l.fromCity || '')}, ${escapeHtml(l.fromState || '')}</span>
                        <span class="arrow">&rarr;</span>
                        <span>${escapeHtml(l.toCity || '')}, ${escapeHtml(l.toState || '')}</span>
                    </div>
                    <div class="text-secondary small mt-1 track-num">${dateLine}${l.TrailerName ? ' &middot; Trailer ' + escapeHtml(l.TrailerName) : ''}</div>
                </div>
            </div>
        `;
    });
    return `
        <div class="pb-4 text-start">
            <div class="track-eyebrow mb-2">Driver's Other Loads</div>
            <div class="row g-3">
                ${cards}
            </div>
        </div>
    `;
}

// Live truck position for Avenger loads; falls back to the pickup address.
function MapHtml(data, loadData) {
    var mapQuery, title, caption = '';
    if (data.truck && typeof data.truck.latitude === 'number') {
        mapQuery = data.truck.latitude + ',' + data.truck.longitude;
        title = 'Live Truck Location';
        caption = `${escapeHtml(data.truck.address || '')} &middot; ${data.truck.speedMph} mph &middot; Updated ${formatDate(data.truck.lastUpdate)}`;
    } else {
        mapQuery = loadData.PickUpLoadLeg.length ? loadData.PickUpLoadLeg[0].AddressString : '';
        if (!mapQuery) return '';
        title = 'Pickup Location';
    }
    return `
        <div class="track-card track-map mb-4 text-start">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3">
                <div class="track-eyebrow mb-0">${title}</div>
                <div class="text-secondary small track-num">${caption}</div>
            </div>
<iframe src="https://www.google.com/maps/embed/v1/place?q=${encodeURIComponent(mapQuery)}&key=${MAPS_EMBED_KEY}&zoom=${data.truck ? 10 : 12}" allowfullscreen></iframe>
        </div>
    `;
}

function LegStatus(leg, IsPickup){
    var status = '';

    if(getMilitaryTime(leg.CheckIn) != "0000" && getMilitaryTime(leg.CheckOut) != "0000" && leg.OnHisWay) {
        status = IsPickup ? 'Picked' : 'Delivered';
    }
    else if(getMilitaryTime(leg.CheckIn) != "0000" && getMilitaryTime(leg.CheckOut) == "0000") {
        status = 'Checked IN';
    }
    else if(getMilitaryTime(leg.CheckIn) == "0000" && getMilitaryTime(leg.CheckOut) == "0000" && leg.OnHisWay) {
        status = 'On His Way';
    }
    return status;
}

function formatDate(dateTimeString) {
    // Create a new Date object from the given string
    var date = new Date(dateTimeString);

    // Get the components of the date
    var month = date.getMonth() + 1; // Months are zero-based
    var day = date.getDate();
    var year = date.getFullYear() % 100; // Get last two digits of the year
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert hours from 24-hour to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be converted to 12

    // Pad single digit values with leading zero
    month = month < 10 ? '0' + month : month;
    day = day < 10 ? '0' + day : day;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    // Construct the formatted date-time string
    var formattedDateTime = month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ' ' + ampm;

    return formattedDateTime;
}

function formatTime(dateTimeString) {
    var date = new Date(dateTimeString);
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}

function getMilitaryTime(dateTimeString) {
    // Create a new Date object from the given string
    var date = new Date(dateTimeString);

    // Get the components of the date
    var hours = date.getHours();
    var minutes = date.getMinutes();

    // Pad single digit values with leading zero
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    // Construct the military time string
    var militaryTime = hours + '' + minutes;

    return militaryTime;
}

function CreateDriverHtml(drivers, truck, trailer){
    var driverinfo = ``;
    [['Main Driver', drivers && drivers.main], ['Local Driver', drivers && drivers.second]].forEach(function (pair) {
        const title = pair[0], d = pair[1];
        if (!d) return;
        const phoneDigits = String(d.PhoneNumber || '').replace(/[^\d+]/g, '');
        driverinfo += `
            <div class="track-card p-3 p-md-4">
                <div class="track-eyebrow mb-2">${title}</div>
                <div class="track-kv"><span class="k">Name</span><span class="v">${escapeHtml(d.FirstName || '')}</span></div>
                <div class="track-kv"><span class="k">Phone</span><span class="v track-num">${phoneDigits ? `<a href="tel:${phoneDigits}">${escapeHtml(d.PhoneNumber)}</a>` : '&mdash;'}</span></div>
                <div class="track-kv"><span class="k">Truck</span><span class="v">${escapeHtml(truck || '') || '&mdash;'}</span></div>
                <div class="track-kv"><span class="k">Trailer</span><span class="v">${escapeHtml(trailer || '') || '&mdash;'}</span></div>
            </div>
        `;
    });
    return driverinfo;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
