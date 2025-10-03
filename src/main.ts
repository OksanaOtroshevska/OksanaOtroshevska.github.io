import './style.css';


type City = {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type WeatherApiResponse = {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    sunshine_duration: number;
    rain: number;
    time: string;
    is_day: number;
    interval: number;
  };
   current_units: {
    precipitation: string;
    relative_humidity_2m: string;
    temperature_2m: string;
    wind_speed_10m: string;
  };
};

const API_BASE = "https://api.open-meteo.com/v1/forecast";

// weatherCode - иконка и описание
const weatherMap: Record<number, { desc: string; icon: string }> = {
  0: { desc: "Clear sky", icon: "01d" },
  1: { desc: "Mainly clear", icon: "02d" },
  2: { desc: "Partly cloudy", icon: "03d" },
  3: { desc: "Overcast", icon: "04d" },
  45: { desc: "Fog", icon: "50d" },
  48: { desc: "Depositing rime fog", icon: "50d" },
  51: { desc: "Light drizzle", icon: "09d" },
  61: { desc: "Slight rain", icon: "10d" },
  63: { desc: "Rain", icon: "10d" },
  71: { desc: "Snow fall", icon: "13d" },
  80: { desc: "Rain showers", icon: "09d" },
  95: { desc: "Thunderstorm", icon: "11d" },
};

const cities: City[] = [
  { name: "Munich", latitude:48.137, longitude:11.575, timezone: "Europe/Berlin" },
  { name: "Kyiv", latitude:50.450, longitude:30.523, timezone: "Europe/Kyiv" },
  { name: "Paris", latitude:48.856, longitude:2.353, timezone: "Europe/Paris" },
];

// сбор query параметров
function buildParams(city: City): string {
  const params = new URLSearchParams({
    latitude: city.latitude.toString(),
    longitude: city.longitude.toString(),
    current:
      "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,sunshine_duration",
    timezone: "auto",
  });
  return params.toString();
}

// загрузка данных
async function fetchWeather(city: City): Promise<WeatherApiResponse> {
  const url = `${API_BASE}?${buildParams(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Ошибка загрузки данных");
  return res.json();
  
}

// перевод sunshine (секунды → часы)
function formatSunshine(sec: number): string {
  return `${(sec / 3600).toFixed(1)}h`;
}

// построение карточки
function buildCard(city: City, data: WeatherApiResponse): HTMLElement {
  const card = document.createElement("div");
  card.className = "weather-card";

  // температура
  const temp = Math.round(data.current.temperature_2m);
  const tempText = `${temp}°C`;

  // описание и иконка
  const code = data.current.weather_code;
  const { desc, icon } =
    weatherMap[code] || { desc: "Unknown", icon: "02d" };
  const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

  // ветeр, влажность, солнце
  const windText = `${Math.round(data.current.wind_speed_10m)} km/h`;
  const humidityText = `${data.current.relative_humidity_2m}%`;
  const sunshineText = formatSunshine(data.current.sunshine_duration);

  // локальное время
  const locTime = new Date(data.current.time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  card.innerHTML = `
    <div class="weather-card__header">
      <h2>${city.name}</h2>
      <div class="time">${locTime}</div>
    </div>

    <div class="weather-card__body">
      <h1>${tempText}</h1>
      <span class="weather-desc">${desc}</span>
    </div>

    <div class="footer-left">
      <div class="footer-item">
        <img src="/media/cloud-wind-icon.svg" alt="Wind"> ${windText}
      </div>
      <div class="footer-item">
        <img src="/media/drop-icon.svg" alt="Humidity"> ${humidityText}
      </div>
      <div class="footer-item">
        <img src="/media/sun-icon.svg" alt="Sunshine"> ${sunshineText}
      </div>
    </div>

    <img src="${iconUrl}" alt="${desc}" class="weather-icon" />
  `;

  // тема (день/ночь)
  const hour = new Date(data.current.time).getHours();
  if (hour >= 6 && hour < 20) {
    card.classList.add("day");
  } else {
    card.classList.add("night");
  }

  return card;
}

// отображение ошибки
function buildErrorCard(city: City, err: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "weather-card error";
  card.innerHTML = `
    <div class="weather-card__header">
      <h2>${city.name}</h2>
    </div>
    <div class="weather-card__body">
      <p>Не удалось загрузить данные</p>
      <small>${err}</small>
    </div>
  `;
  return card;
}


async function updateWeather() {
  const container = document.querySelector(".weather-grid")!;
  container.innerHTML = "";

  try {
    const results = await Promise.allSettled(
      cities.map((c) => fetchWeather(c))
    );

    results.forEach((res, i) => {
      if (res.status === "fulfilled") {
        container.appendChild(buildCard(cities[i], res.value));
      } else {
        container.appendChild(buildErrorCard(cities[i], res.reason.message));
      }
    });
  } catch (e) {
    console.error(e);
  }
}


updateWeather();
setInterval(updateWeather, 60_000);


