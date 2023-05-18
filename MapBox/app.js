// Initialize Firebase
var firebaseConfig = {
  apiKey: "AIzaSyBQxjy-jwlLn3W64wfS68iBQrPGCWqkpvU",
  authDomain: "mapboxtest-386503.firebaseapp.com",
  projectId: "mapboxtest-386503",
  storageBucket: "mapboxtest-386503.appspot.com",
  messagingSenderId: "917336042037",
  appId: "1:917336042037:web:9ebf276dc2ab5e6a6b5f7c"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// Mapbox Setup
mapboxgl.accessToken = 'pk.eyJ1IjoicGhpbGxkZXYiLCJhIjoiY2xoazB6cHV0MDViNTNwcDR1czJycGc0cSJ9.wY2-LXk_KVtYZGf9f3Th3A';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-96, 37.8],
    zoom: 2
});
function addMarker(coordinates) {
    new mapboxgl.Marker()
        .setLngLat(coordinates)
        .addTo(map);
}

// Rest of your JavaScript code
// ...


function getRoute(start, end, profile) {
    var directionsRequest = 'https://api.mapbox.com/directions/v5/mapbox/' + profile + '/' + start[0] + ',' + start[1] + ';' + end[0] + ',' + end[1] + '?geometries=geojson&access_token=' + mapboxgl.accessToken;
     if (map.getLayer('route')) {
         map.removeLayer('route');
         map.removeSource('route');
     }
    fetch(directionsRequest)
    .then(response => response.json())
    .then(data => {
        var route = data.routes[0].geometry;
        if (map.getSource('route')) {
            map.getSource('route').setData(route);
        } else {
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: route
                },
                paint: {
                    'line-color': '#1db7dd',
                    'line-width': 2
                }
            });
        }
    });
}
map.on('load', function() {
    // Use Geolocation API to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var userLocation = [position.coords.longitude, position.coords.latitude];
            map.flyTo({
                center: userLocation,
                zoom: 14
            });

            // Store user's location in Firestore
            db.collection("locations").doc("userLocation").set({
                coordinates: userLocation
            })
            .then(function() {
                console.log("User's location successfully written!");
                addMarker(userLocation);
            })
            .catch(function(error) {
                console.error("Error writing document: ", error);
            });

            // Get destination coordinates when form is submitted
            document.getElementById('routeForm').addEventListener('submit', function(e) {
                e.preventDefault();
                var destinationName = document.getElementById('destination').value;
                var geocodingUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(destinationName) + '.json?access_token=' + mapboxgl.accessToken;
                fetch(geocodingUrl)
                .then(response => response.json())
                .then(data => {
                    var destinationCoordinates = data.features[0].center;
                    // Store destination coordinates in Firestore
                    db.collection("locations").doc("destination").set({
                        coordinates: destinationCoordinates
                    })
                    .then(function() {
                        console.log("Destination successfully written!");
                        // Get route when both user's location and destination are available
                        db.collection("locations").get().then(function(querySnapshot) {
                            var docs = querySnapshot.docs;
                            var start = docs.find(doc => doc.id === 'userLocation').data().coordinates;
                            var end = docs.find(doc => doc.id === 'destination').data().coordinates;
                            getRoute(start, end, "driving-traffic");  // change the profile here
                        });
                    })
                    .catch(function(error) {
                        console.error("Error writing document: ", error);
                    });
                });
            });
            // Add event listener for the Clear Route button
            document.getElementById('clearRoute').addEventListener('click', function() {
                if (map.getLayer('route')) {
                    map.removeLayer('route');
                    map.removeSource('route');
                }
                document.getElementById('destination').value = '';
                document.getElementById('suggestions').innerHTML = '';
            });

            // Add event listener for the input event
            document.getElementById('destination').addEventListener('input', function(e) {
                var input = e.target.value;
                if (input.length > 2) {  // only fetch suggestions if input is 3 or more characters
                    var geocodingUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(input) + '.json?access_token=' + mapboxgl.accessToken;
                    fetch(geocodingUrl)
                    .then(response => response.json())
                    .then(data => {
                        // Clear existing suggestions
                        var suggestionsElement = document.getElementById('suggestions');
                        suggestionsElement.innerHTML = '';

                        // Create a new list item for each suggestion
                        data.features.forEach(feature => {
                            var listItem = document.createElement('li');
                            listItem.textContent = feature.place_name;
                            listItem.addEventListener('click', function() {
                                document.getElementById('destination').value = feature.place_name;
                                // Clear suggestions once one is chosen
                                suggestionsElement.innerHTML = '';
                            });
                            suggestionsElement.appendChild(listItem);
                        });
                    });
                }
            });

        });
    } else {
        alert('Geolocation is not supported by your browser!');
    }
});
