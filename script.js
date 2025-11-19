// Wait for the DOM to be fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    
    // --- API Configuration ---
    const apiKey = "346335384f8c43254230cd146c4c2c66"; // <-- IMPORTANT: REPLACE WITH YOUR KEY

    // --- DOM Element Selectors ---
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const locationBtn = document.getElementById("location-btn");
    
    const currentCity = document.getElementById("current-city");
    const currentIcon = document.getElementById("current-icon");
    const currentTemp = document.getElementById("current-temp");
    const currentDesc = document.getElementById("current-desc");
    const sunriseEl = document.getElementById("sunrise");
    const sunsetEl = document.getElementById("sunset");
    
    const feelsLike = document.getElementById("feels-like");
    const humidity = document.getElementById("humidity");
    const windSpeed = document.getElementById("wind-speed");
    const pressure = document.getElementById("pressure");
    
    const forecastGrid = document.getElementById("forecast-grid");
    const unitToggleButtons = document.querySelectorAll(".unit-btn");
    
    const aqiCard = document.getElementById("aqi-card");
    const aqiValue = document.getElementById("aqi-value");
    const aqiDesc = document.getElementById("aqi-desc");
    
    const mapElement = document.getElementById("weather-map");
    
    // --- State Variables ---
    let currentUnit = "metric"; // 'metric' (°C), 'imperial' (°F), 'standard' (K)
    let currentWeatherData = null;
    let currentForecastData = null;
    let map = null;
    let weatherLayer = null;

    // --- Main Functions ---

    /**
     * Fetches and displays all weather data for a given set of coordinates.
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    async function fetchAllData(lat, lon) {
        try {
            // Fetch all data in parallel
            const [weather, forecast, aqi] = await Promise.all([
                fetchWeather(lat, lon, currentUnit),
                fetchForecast(lat, lon, currentUnit),
                fetchAQI(lat, lon)
            ]);
            
            // Store data for unit conversions
            currentWeatherData = weather;
            currentForecastData = forecast;

            // Update the UI
            displayCurrentWeather(weather);
            displayForecast(forecast);
            displayAQI(aqi);
            updateMap(lat, lon);

        } catch (error) {
            console.error("Error fetching all data:", error);
            alert("Could not fetch weather data. Please try again.");
        }
    }

    /**
     * Fetches current weather data.
     */
    async function fetchWeather(lat, lon, units) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather data not found.");
        return await response.json();
    }

    /**
     * Fetches 5-day forecast data.
     */
    async function fetchForecast(lat, lon, units) {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Forecast data not found.");
        return await response.json();
    }

    /**
     * Fetches Air Quality Index (AQI) data.
     */
    async function fetchAQI(lat, lon) {
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("AQI data not found.");
        return await response.json();
    }

    /**
     * Fetches coordinates for a given city name.
     */
    async function fetchCoordsByCity(city) {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("City not found.");
        const data = await response.json();
        if (data.length === 0) throw new Error("City not found.");
        return { lat: data[0].lat, lon: data[0].lon };
    }

    // --- UI Display Functions ---

    /**
     * Updates the current weather section of the UI.
     */
    function displayCurrentWeather(data) {
        currentCity.textContent = data.name;
        currentTemp.textContent = Math.round(data.main.temp);
        currentDesc.textContent = data.weather[0].description;
        currentIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        currentIcon.alt = data.weather[0].description;

        feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;
        humidity.textContent = `${data.main.humidity}%`;
        pressure.textContent = `${data.main.pressure} hPa`;
        
        // Convert wind speed if necessary (API default is m/s for metric/standard, mph for imperial)
        let windSpeedVal = data.wind.speed;
        let windUnit = "m/s"; // Default for metric/standard
        if (currentUnit === "metric") {
             windSpeedVal = (data.wind.speed * 3.6).toFixed(1); // m/s to km/h
             windUnit = "km/h";
        } else if (currentUnit === "imperial") {
            windSpeedVal = data.wind.speed.toFixed(1);
            windUnit = "mph";
        }
        windSpeed.textContent = `${windSpeedVal} ${windUnit}`;

        sunriseEl.textContent = formatTime(data.sys.sunrise, data.timezone);
        sunsetEl.textContent = formatTime(data.sys.sunset, data.timezone);

        // Update dynamic background
        updateDynamicBackground(data.weather[0].id, data.weather[0].icon);
    }

    /**
     * Updates the 5-day forecast section.
     */
    function displayForecast(data) {
        forecastGrid.innerHTML = ""; // Clear previous forecast
        
        // Filter list to get one forecast per day (e.g., at 12:00)
        const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));

        dailyForecasts.forEach(day => {
            const card = document.createElement("div");
            card.classList.add("forecast-card");
            
            card.innerHTML = `
                <p class="day">${formatDay(day.dt, data.city.timezone)}</p>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}">
                <p class="temp">${Math.round(day.main.temp)}°</p>
            `;
            forecastGrid.appendChild(card);
        });
    }

    /**
     * Updates the Air Quality Index (AQI) card.
     */
    function displayAQI(data) {
        const aqi = data.list[0].main.aqi;
        let desc = "";
        let colorClass = "";

        switch (aqi) {
            case 1: desc = "Good"; colorClass = "good"; break;
            case 2: desc = "Fair"; colorClass = "moderate"; break;
            case 3: desc = "Moderate"; colorClass = "unhealthy-sensitive"; break;
            case 4: desc = "Poor"; colorClass = "unhealthy"; break;
            case 5: desc = "Very Poor"; colorClass = "very-unhealthy"; break;
            default: desc = "Hazardous"; colorClass = "hazardous";
        }
        
        aqiValue.textContent = aqi;
        aqiDesc.textContent = desc;
        aqiCard.className = `aqi-card ${colorClass}`; // Reset classes and add new one
    }

    /**
     * Changes the body class based on weather condition and time.
     */
    function updateDynamicBackground(weatherId, icon) {
        const isNight = icon.endsWith('n');
        document.body.className = ''; // Clear existing classes

        if (isNight) {
            document.body.classList.add('night');
        } else {
            document.body.classList.add('day');
        }

        // Add weather-specific class
        if (weatherId >= 200 && weatherId < 300) { // Thunderstorm
            document.body.classList.add('rain'); // Use rain style
        } else if (weatherId >= 300 && weatherId < 600) { // Drizzle/Rain
            document.body.classList.add('rain');
        } else if (weatherId >= 600 && weatherId < 700) { // Snow
            document.body.classList.add('snow');
        }
        // Add more classes for mist, clear, clouds etc. if desired
    }


    // --- Map Functions ---

    /**
     * Initializes the Leaflet map.
     */
    function initMap(lat, lon) {
        if (!map) {
            map = L.map(mapElement).setView([lat, lon], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        } else {
            map.setView([lat, lon], 10);
        }
        
        // Add OpenWeatherMap weather layer (e.g., 'clouds_new', 'precipitation_new', 'temp_new')
        if (weatherLayer) {
            map.removeLayer(weatherLayer);
        }
        weatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
            opacity: 0.7
        });
        weatherLayer.addTo(map);
    }
    
    /**
     * Updates map view to new coordinates.
     */
    function updateMap(lat, lon) {
        if (!map) {
            initMap(lat, lon);
        } else {
            map.setView([lat, lon], 10);
        }
    }


    // --- Event Handlers ---

    /**
     * Handles the search form submission.
     */
    async function handleSearch(e) {
        e.preventDefault();
        const city = searchInput.value.trim();
        if (!city) {
            alert("Please enter a city name.");
            return;
        }
        
        try {
            const { lat, lon } = await fetchCoordsByCity(city);
            fetchAllData(lat, lon);
            searchInput.value = ""; // Clear input
        } catch (error) {
            console.error("Error searching for city:", error);
            alert("City not found. Please try again.");
        }
    }

    /**
     * Handles the "get location" button click.
     */
    function handleLocationClick() {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchAllData(latitude, longitude);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location.");
            }
        );
    }

    /**
     * Handles clicks on the unit toggle buttons.
     */
    async function handleUnitToggle(e) {
        const selectedUnit = e.target.dataset.unit;
        if (selectedUnit === currentUnit) return; // No change

        currentUnit = selectedUnit;
        
        // Update active button state
        unitToggleButtons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.unit === currentUnit);
        });

        // Re-fetch data with new units
        if (currentWeatherData) {
            const { lat, lon } = currentWeatherData.coord;
            fetchAllData(lat, lon);
        }
    }

    // --- Utility/Helper Functions ---

    /**
     * Formats a UNIX timestamp to a readable time (HH:MM), adjusting for timezone.
     * @param {number} timestamp - UNIX timestamp (in seconds)
     * @param {number} timezone - Timezone offset (in seconds)
     */
    function formatTime(timestamp, timezone) {
        // Create a date object in UTC, then add the timezone offset
        const date = new Date((timestamp + timezone) * 1000);
        return date.toUTCString().match(/(\d{2}:\d{2}):\d{2}/)[1]; // Extracts HH:MM
    }

    /**
     * Formats a UNIX timestamp to a 3-letter day name (e.g., "Mon").
     */
    function formatDay(timestamp, timezone) {
        const date = new Date((timestamp + timezone) * 1000);
        return date.toUTCString().substring(0, 3); // Extracts "Mon", "Tue", etc.
    }


    // --- Initialization ---

    /**
     * Initial function to run on page load.
     */
    function initialize() {
        // Add event listeners
        searchForm.addEventListener("submit", handleSearch);
        locationBtn.addEventListener("click", handleLocationClick);
        unitToggleButtons.forEach(btn => btn.addEventListener("click", handleUnitToggle));

        // Load default weather (e.g., by user's location)
        handleLocationClick();
    }
    
    // Run the app
    initialize();
});