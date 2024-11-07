document.getElementById('loadSearchForm').addEventListener('submit', function (event) {
            event.preventDefault();

            // Get the input value
            const loadId = $('#searchInput').val();
            // Replace 'YOUR_API_KEY' with your actual API key
            const apiKey = '$Akal-1699-Key';

            // Make the API call with headers
           // Make the API call with headers
        // Show loading overlay
        $('#loading-overlay').show();
    
        $.ajax({
            url: 'https://www.akalltrucking.com/api/LoadModelsApi/LoadModelByLoadNumber' + '?LoadNumber=' + loadId,
            type: 'GET',
            dataType: 'json',
            contentType: 'json',
            headers: {
                "API_KEY": "$Akal-1699-Key"
            },
            success: function(data) {
                // Display information for the matching load
                if(data.CarrierProfileID != 6) {
                    const loadInfoDiv = document.getElementById('loadInfo');
                    loadInfoDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h2 class="text-secondary">Load #: ${loadId}</h2>
                    <h4 class="text-danger">There was NO Load information found, please contact Admin.</h4>
                </div>
                    `;
                }
                else {
                    updateLoadInfo(data);
                    if(data.DriverID != 0){
                        GetDriverInfo(data.DriverID, 'Driver')
                    }
                    if(data.SecondDriverID != 0){
                        GetDriverInfo(data.SecondDriverID , 'SecondDriver')
                    }
                }
                // Hide loading overlay
                $('#loading-overlay').hide();
            },
            error: function(error) {
                console.log('Error fetching load information:', error);
                // Hide loading overlay
                $('#loading-overlay').hide();
            }
        }); 
        
    });

        function updateLoadInfo(loadData) {
            //var jsonObj = JSON.parse(loadData);
            console.log(loadData);
            // Example: Parse the JSON array and update the HTML div with the model object information
            const loadInfoDiv = document.getElementById('loadInfo');
            loadInfoDiv.innerHTML = `
                 <div class="d-flex justify-content-between">
                    <h2 class="text-secondary">Load #: ${loadData.LoadNumber}</h2>
                    <h3 class="text-secondary">Carrier: Akal Freight LLC</h3>
                </div>
                <hr>
                <p class="text-center">Below Load information is accurate and subject to be changed periodically. Please refresh to get the updated information...&nbsp;</p>
                <hr>
                <div class="row pb-5">
                    <div class="col-md-6">
                        <div class="border-bottom border-success">
                            <h4 class="fw-bold text-success">Pick UP</h4>
                            <div class="d-flex justify-content-between">
                                <h5>${loadData.PickUpLoadLeg[0].AddressString}</h5>
                                <h5><span class="badge text-bg-success">${LegStatus(loadData.PickUpLoadLeg[0], true)}</span></h5>
                            </div>
                            <div class="d-flex justify-content-between">
                                <h5 class="fw-light text-info">${formatDate(loadData.PickUpLoadLeg[0].LoadStartTime)}</h5>
                                <h5 class="fw-light text-danger">IN: ${getMilitaryTime(loadData.PickUpLoadLeg[0].CheckIn)} | OUT: ${getMilitaryTime(loadData.PickUpLoadLeg[0].CheckOut)}</h5>
                            </div>
                        </div>
                        <div class="pt-3 border-bottom border-warning">
                            <h4 class="fw-bold text-warning">Drop Off</h4>
                            <div class="d-flex justify-content-between">
                                <h5>${loadData.DropOffLoadLeg[0].AddressString}</h5>
                                <h5><span class="text-bg-warning badge">${LegStatus(loadData.DropOffLoadLeg[0], false)}</span></h5>
                            </div>
                            <div class="d-flex justify-content-between">
                                <h5 class="fw-light text-info">${formatDate(loadData.DropOffLoadLeg[0].LoadStartTime)}</h5>
                                <h5 class="fw-light text-danger">IN: ${getMilitaryTime(loadData.DropOffLoadLeg[0].CheckIn)} | OUT: ${getMilitaryTime(loadData.DropOffLoadLeg[0].CheckOut)}</h5>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="border-bottom border-info">
                            <h4 class="fw-bold text-success">Driver Info's:</h4>
                            <hr>
                            <div class="row">
                                ${CreateDriverHtml(loadData.DriverID,loadData.SecondDriverID,loadData.TruckName,loadData.TrailerName)}
                            </div>
                        </div>
                        <div class="pt-3 text-end border-bottom border-info">
                            <h4 class="fw-bold text-success">Dispatcher Info:</h4>
                            <h5>akalfreight@gmail.com</h5>
                            <h5>833-281-3151</h5>
                        </div>
                    </div>
                </div>
<iframe width="100%" height="450" frameborder="0" style="border:0" src="https://www.google.com/maps/embed/v1/place?q='${loadData.PickUpLoadLeg[0].AddressString}&key=AIzaSyAVNJjUTj_u2CeM8KRbt4IS2NUfTYXlStg&zoom=12" allowfullscreen></iframe>
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

function CreateDriverHtml(driverId, secondDriverId, truck, trailer){
    var driverinfo = ``;    
    if(driverId != 0) {
        driverinfo += `
            <div class="col">
                <h5 class="fw-bold text-info">Main Driver</h5>
                <div id=Driver></div>
                <h5>Truck: ${truck}</h5>
                <h5>Trailer: ${trailer}</h5>
            </div>
        `;
    }    
    if(secondDriverId != 0) {
        driverinfo += `
            <div class="col">
                <h5 class="fw-bold text-danger">Local Driver</h5>
                <div id=SecondDriver></div>
                <h5>Truck: ${truck}</h5>
                <h5>Trailer: ${trailer}</h5>
            </div>
        `;
    }
    return driverinfo;
    
}

function GetDriverInfo(driverID, driver){
        $.ajax({
            url: 'https://www.akalltrucking.com/api/DriverModelApi/GetDriverByID' + '?id=' + driverID,
            type: 'GET',
            dataType: 'json',
            contentType: 'json',
            headers: {
                "API_KEY": "$Akal-1699-Key"
            },
            success: function(data) {
                // Display information for the matching load
                console.log(data);
                var driverinfo = `
                <h5>Driver Name: ${data.FirstName}</h5>
                <h5>Driver Phone: ${data.ContactInformation.PhoneNumber}</h5>
                `;
                
                const driverInfo = document.getElementById(driver);
                driverInfo.innerHTML = driverinfo;
            },
            error: function(error) {
                console.log('Error fetching load information:', error);
                rejected(error);
            }
        }); 
}