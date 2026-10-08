const CITY_DATA = {
  bengaluru: {
    name: "Bengaluru",
    solarHours: 4.8,
    tariff: 5.3636,
    tariffLabel: "Karnataka - Bangalore city municipal corp. rate",
    lat: 12.9716,
    lon: 77.5946,
  },
  delhi: {
    name: "Delhi",
    solarHours: 5.1,
    tariff: 6.5163,
    tariffLabel: "Delhi BYPL/BRPL/NDPL rate",
    lat: 28.6139,
    lon: 77.209,
  },
  mumbai: {
    name: "Mumbai",
    solarHours: 4.6,
    tariff: 8.7986,
    tariffLabel: "Mumbai Reliance Energy rate",
    lat: 19.076,
    lon: 72.8777,
  },
  chennai: {
    name: "Chennai",
    solarHours: 5.2,
    tariff: 4.9991,
    tariffLabel: "Tamil Nadu domestic rate",
    lat: 13.0827,
    lon: 80.2707,
  },
  hyderabad: {
    name: "Hyderabad",
    solarHours: 5.3,
    tariff: 4.1538,
    tariffLabel: "Andhra Pradesh domestic rate from table",
    lat: 17.385,
    lon: 78.4867,
  },
  pune: {
    name: "Pune",
    solarHours: 5.0,
    tariff: 6.1775,
    tariffLabel: "Maharashtra continuous supply area rate",
    lat: 18.5204,
    lon: 73.8567,
  },
  ahmedabad: {
    name: "Ahmedabad",
    solarHours: 5.4,
    tariff: 4.6766,
    tariffLabel: "Torrent Power Ahmedabad rate",
    lat: 23.0225,
    lon: 72.5714,
  },
  jaipur: {
    name: "Jaipur",
    solarHours: 5.6,
    tariff: 5.7171,
    tariffLabel: "Rajasthan domestic rate",
    lat: 26.9124,
    lon: 75.7873,
  },
  kochi: {
    name: "Kochi",
    solarHours: 4.5,
    tariff: 3.7849,
    tariffLabel: "Kerala domestic rate",
    lat: 9.9312,
    lon: 76.2673,
  },
  kolkata: {
    name: "Kolkata",
    solarHours: 4.4,
    tariff: 5.8086,
    tariffLabel: "CESC Kolkata rate",
    lat: 22.5726,
    lon: 88.3639,
  },
};

const ASSUMPTIONS = {
  panelWatt: 540,
  panelAreaSqFt: 28,
  costPerKw: 65000,
  roofSqFtPerKw: 90,
  performanceRatio: 0.78,
  co2KgPerUnit: 0.71,
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHLY_SOLAR_FACTORS = [0.98, 1.05, 1.12, 1.1, 1.06, 0.86, 0.68, 0.7, 0.86, 1.02, 1.04, 0.98];

const elements = {
  form: document.getElementById("solarForm"),
  city: document.getElementById("city"),
  tariffNote: document.getElementById("tariffNote"),
  bill: document.getElementById("bill"),
  roof: document.getElementById("roof"),
  fitMessage: document.getElementById("fitMessage"),
  panelsNeeded: document.getElementById("panelsNeeded"),
  systemSize: document.getElementById("systemSize"),
  netCost: document.getElementById("netCost"),
  subsidyApplied: document.getElementById("subsidyApplied"),
  monthlySavings: document.getElementById("monthlySavings"),
  coveredUnits: document.getElementById("coveredUnits"),
  annualOutput: document.getElementById("annualOutput"),
  annualOutputNote: document.getElementById("annualOutputNote"),
  todayOutput: document.getElementById("todayOutput"),
  weatherNote: document.getElementById("weatherNote"),
  weatherFactor: document.getElementById("weatherFactor"),
  weatherDetail: document.getElementById("weatherDetail"),
  paybackPeriod: document.getElementById("paybackPeriod"),
  tenYearSavings: document.getElementById("tenYearSavings"),
  co2Saved: document.getElementById("co2Saved"),
  chart: document.getElementById("savingsChart"),
  productionChart: document.getElementById("productionChart"),
  forecastChart: document.getElementById("forecastChart"),
  forecastPeriod: document.getElementById("forecastPeriod"),
  customForecastDays: document.getElementById("customForecastDays"),
  mapSearchForm: document.getElementById("mapSearchForm"),
  addressSearch: document.getElementById("addressSearch"),
  mapStatus: document.getElementById("mapStatus"),
  roofMap: document.getElementById("roofMap"),
  measuredAreaBadge: document.getElementById("measuredAreaBadge"),
  clearRoofButton: document.getElementById("clearRoofButton"),
  demoButton: document.getElementById("demoButton"),
  printButton: document.getElementById("printButton"),
};

let savingsChart;
let productionChart;
let forecastChart;
let roofMap;
let drawnRoofItems;
let searchTargetLayer;
let weatherState = {
  cityKey: "",
  factor: 1,
  cloudCover: null,
  precipitation: null,
  daily: [],
  status: "Weather forecast not loaded yet.",
};

init();

function init() {
  fillCityOptions();
  elements.city.value = "bengaluru";
  elements.form.addEventListener("submit", handleSubmit);
  elements.form.addEventListener("input", calculateAndRender);
  elements.city.addEventListener("change", loadWeatherForSelectedCity);
  elements.city.addEventListener("change", loadNearbySuppliersForCity);
  elements.roof.addEventListener("blur", roundRoofInput);
  elements.forecastPeriod.addEventListener("change", handleForecastPeriodChange);
  elements.customForecastDays.addEventListener("input", handleForecastPeriodChange);
  elements.demoButton.addEventListener("click", useDemoValues);
  elements.clearRoofButton.addEventListener("click", clearRoofDrawing);
  elements.printButton.addEventListener("click", () => window.print());
  initRoofMap();
  handleForecastPeriodChange(false);
  calculateAndRender();
  loadWeatherForSelectedCity();
  loadNearbySuppliersForCity();
}

function fillCityOptions() {
  Object.entries(CITY_DATA).forEach(([key, city]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = city.name;
    elements.city.appendChild(option);
  });
}

function handleSubmit(event) {
  event.preventDefault();
  calculateAndRender();
}

function calculateAndRender() {
  const city = CITY_DATA[elements.city.value];
  const monthlyBill = getNumber(elements.bill.value);
  const roofArea = getNumber(elements.roof.value);

  if (!city || monthlyBill <= 0 || roofArea <= 0) {
    return;
  }

  const result = calculateSolar(city, monthlyBill, roofArea, weatherState);
  renderResult(result);
  renderCharts(result);
}

function calculateSolar(city, monthlyBill, roofArea, weather) {
  const monthlyUnits = monthlyBill / city.tariff;
  const monthlyUnitsPerKw = city.solarHours * ASSUMPTIONS.performanceRatio * 30;
  const idealKw = monthlyUnits / monthlyUnitsPerKw;
  const roofLimitedKw = roofArea / ASSUMPTIONS.roofSqFtPerKw;
  const systemKw = Math.max(roundTo(roofLimitedKw, 0.1), 0.5);
  const panels = Math.max(1, Math.ceil((systemKw * 1000) / ASSUMPTIONS.panelWatt));
  const panelAreaNeeded = panels * ASSUMPTIONS.panelAreaSqFt;
  const yearlyUnits = systemKw * city.solarHours * ASSUMPTIONS.performanceRatio * 365;
  const baseTodayUnits = systemKw * city.solarHours * ASSUMPTIONS.performanceRatio;
  const forecast = buildSolarForecast(weather, baseTodayUnits, getForecastDays());
  const weatherAdjustedTodayUnits = forecast[0]?.output ?? baseTodayUnits * weather.factor;
  const monthlyProduction = calculateMonthlyProduction(yearlyUnits);
  const monthlyGeneratedUnits = yearlyUnits / 12;
  const monthlyCoveredUnits = Math.min(monthlyUnits, monthlyGeneratedUnits);
  const billCoveragePercent = Math.min((monthlyGeneratedUnits / monthlyUnits) * 100, 100);
  const grossCost = systemKw * ASSUMPTIONS.costPerKw;
  const subsidyDetails = calculateSubsidy(systemKw);
  const subsidy = subsidyDetails.amount;
  const netCost = Math.max(0, grossCost - subsidy);
  const monthlySavings = monthlyCoveredUnits * city.tariff;
  const yearlySavings = monthlySavings * 12;
  const paybackYears = yearlySavings > 0 ? netCost / yearlySavings : 0;
  const co2Tonnes = (yearlyUnits * ASSUMPTIONS.co2KgPerUnit) / 1000;
  const tenYearSavings = yearlySavings * 10 - netCost;
  const roofLimited = roofLimitedKw + 0.05 < idealKw;

  return {
    city,
    monthlyBill,
    roofArea,
    monthlyUnits,
    systemKw,
    panels,
    panelAreaNeeded,
    grossCost,
    subsidy,
    subsidyDetails,
    netCost,
    monthlySavings,
    yearlySavings,
    yearlyUnits,
    baseTodayUnits,
    weatherAdjustedTodayUnits,
    forecast,
    weather,
    paybackYears,
    co2Tonnes,
    tenYearSavings,
    monthlyCoveredUnits,
    monthlyGeneratedUnits,
    monthlyProduction,
    billCoveragePercent,
    roofLimited,
  };
}

function calculateMonthlyProduction(yearlyUnits) {
  const factorTotal = MONTHLY_SOLAR_FACTORS.reduce((sum, factor) => sum + factor, 0);
  return MONTHLY_SOLAR_FACTORS.map((factor) => Math.round((yearlyUnits * factor) / factorTotal));
}

function calculateSubsidy(systemKw) {
  const eligibleKw = Math.min(systemKw, 3);
  const firstTwoKw = Math.min(eligibleKw, 2) * 30000;
  const thirdKw = Math.min(Math.max(eligibleKw - 2, 0), 1) * 18000;
  const amount = Math.min(firstTwoKw + thirdKw, 78000);

  return {
    amount,
    eligibleKw,
    isCapped: systemKw > 3,
  };
}

function renderResult(result) {
  elements.measuredAreaBadge.textContent = `${formatUnits(result.roofArea)} sq ft`;
  elements.tariffNote.textContent = `Tariff used: Rs ${result.city.tariff.toFixed(2)}/kWh. ${result.city.tariffLabel}.`;
  elements.fitMessage.textContent = result.roofLimited
    ? `Your roof can fit about ${formatKw(result.systemKw)}, covering ${Math.round(
        result.billCoveragePercent
      )}% of the entered bill.`
    : `Your roof can fit about ${formatKw(result.systemKw)} in ${result.city.name}, enough to cover the entered bill.`;

  elements.panelsNeeded.textContent = `${result.panels} panels`;
  elements.systemSize.textContent = `${formatKw(result.systemKw)} system, about ${Math.ceil(
    result.panelAreaNeeded
  )} sq ft`;

  elements.netCost.textContent = formatCurrency(result.netCost);
  elements.subsidyApplied.textContent = formatSubsidyNote(result);

  elements.monthlySavings.textContent = formatCurrency(result.monthlySavings);
  elements.coveredUnits.textContent = `${Math.round(result.monthlyCoveredUnits)} of ${Math.round(
    result.monthlyUnits
  )} units/month`;

  elements.annualOutput.textContent = formatUnits(result.yearlyUnits);
  elements.annualOutputNote.textContent = `${formatNumber(result.systemKw)} kW rooftop estimate`;

  elements.todayOutput.textContent = `${formatNumber(result.weatherAdjustedTodayUnits)} kWh`;
  elements.weatherNote.textContent = `${formatNumber(result.baseTodayUnits)} kWh clear-sky estimate`;
  elements.weatherFactor.textContent = `${Math.round(result.weather.factor * 100)}%`;
  elements.weatherDetail.textContent = result.weather.status;

  elements.paybackPeriod.textContent = `${formatNumber(roundTo(result.paybackYears, 0.1))} years`;
  elements.tenYearSavings.textContent =
    result.tenYearSavings >= 0
      ? `${formatCurrency(result.tenYearSavings)} net in 10 years`
      : `${formatCurrency(Math.abs(result.tenYearSavings))} short in 10 years`;

  elements.co2Saved.textContent = `${formatNumber(roundTo(result.co2Tonnes, 0.1))} t`;
}

function useDemoValues() {
  elements.city.value = "bengaluru";
  elements.bill.value = 3000;
  elements.roof.value = 500;
  calculateAndRender();

  if (roofMap) {
    roofMap.setView([12.9716, 77.5946], 13);
  }

  showMapStatus("Demo values loaded: Bengaluru, Rs 3,000 monthly bill, 500 sq ft roof.");
  loadWeatherForSelectedCity();
}

async function loadWeatherForSelectedCity() {
  const cityKey = elements.city.value;
  const city = CITY_DATA[cityKey];

  if (!city) {
    return;
  }

  weatherState = {
    cityKey,
    factor: 1,
    cloudCover: null,
    precipitation: null,
    daily: [],
    status: "Loading 7-day weather forecast...",
  };
  calculateAndRender();

  try {
    const liveForecastDays = Math.min(getForecastDays(), 16);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&daily=sunshine_duration,precipitation_sum,weather_code&forecast_days=${liveForecastDays}&timezone=auto`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather request failed");
    }

    const data = await response.json();

    if (cityKey !== elements.city.value) {
      return;
    }

    const daily = parseWeatherForecast(data);
    const today = daily[0];
    const factor = today?.factor ?? 1;

    weatherState = {
      cityKey,
      factor,
      cloudCover: null,
      precipitation: today?.precipitation ?? null,
      daily,
      status: today
        ? `${formatNumber(today.sunshineHours)}h sunshine, ${formatNumber(today.precipitation)} mm rain today`
        : "Forecast loaded, using normal estimate",
    };
  } catch (error) {
    console.error(error);
    weatherState = {
      cityKey,
      factor: 1,
      cloudCover: null,
      precipitation: null,
      daily: [],
      status: "Forecast unavailable, using clear-sky estimate",
    };
  }

  calculateAndRender();
}

function parseWeatherForecast(data) {
  const daily = data.daily || {};
  const dates = daily.time || [];

  return dates.map((date, index) => {
    const sunshineSeconds = Number(daily.sunshine_duration?.[index] ?? 0);
    const precipitation = Number(daily.precipitation_sum?.[index] ?? 0);
    const sunshineHours = sunshineSeconds / 3600;
    const factor = calculateWeatherFactor(sunshineHours, precipitation);

    return {
      date,
      label: formatForecastDate(date),
      sunshineHours,
      precipitation,
      factor,
    };
  });
}

function calculateWeatherFactor(sunshineHours, precipitation) {
  const sunshineFactor = Math.min(Math.max(sunshineHours / 8, 0.2), 1.15);
  const rainPenalty = Math.min(precipitation * 0.04, 0.3);
  return Math.min(Math.max(sunshineFactor - rainPenalty, 0.2), 1.1);
}

function buildSolarForecast(weather, baseTodayUnits, periodDays) {
  if (!weather.daily.length) {
    return buildFallbackForecast(baseTodayUnits, weather.factor, periodDays);
  }

  const liveForecast = weather.daily.map((day) => ({
    ...day,
    output: baseTodayUnits * day.factor,
  }));

  if (liveForecast.length >= periodDays) {
    return liveForecast.slice(0, periodDays);
  }

  const extendedForecast = [...liveForecast];
  let currentDate = new Date(liveForecast[liveForecast.length - 1].date);

  while (extendedForecast.length < periodDays) {
    currentDate = addDays(currentDate, 1);
    const seasonalFactor = getSeasonalFactor(currentDate);
    extendedForecast.push({
      date: toDateInputValue(currentDate),
      label: formatForecastDate(toDateInputValue(currentDate)),
      sunshineHours: undefined,
      precipitation: undefined,
      factor: seasonalFactor,
      output: baseTodayUnits * seasonalFactor,
      estimated: true,
    });
  }

  return extendedForecast;
}

function buildFallbackForecast(baseTodayUnits, factor, periodDays) {
  return Array.from({ length: periodDays }, (_, index) => {
    const date = addDays(new Date(), index);
    const seasonalFactor = getSeasonalFactor(date);
    const outputFactor = index === 0 ? factor : seasonalFactor;

    return {
      date: toDateInputValue(date),
      label: formatForecastDate(toDateInputValue(date)),
      factor: outputFactor,
      output: baseTodayUnits * outputFactor,
      estimated: index > 0,
    };
  });
}

function renderCharts(result) {
  if (typeof Chart === "undefined") {
    elements.chart.style.display = "none";
    elements.productionChart.style.display = "none";
    elements.forecastChart.style.display = "none";
    showChartFallback(elements.chart.parentElement);
    showChartFallback(elements.productionChart.parentElement);
    showChartFallback(elements.forecastChart.parentElement);
    return;
  }

  renderForecastChart(result);
  renderProductionChart(result);
  renderSavingsChart(result);
}

function renderForecastChart(result) {
  const groupedForecast = groupForecastForDisplay(result.forecast);
  const labels = groupedForecast.map((day) => day.label);
  const outputs = groupedForecast.map((day) => roundTo(day.output, 0.1));

  if (forecastChart) {
    forecastChart.data.labels = labels;
    forecastChart.data.datasets[0].data = outputs;
    forecastChart.data.datasets[0].backgroundColor = getForecastBarColors(groupedForecast);
    forecastChart.data.datasets[0].label = getForecastDatasetLabel(result.forecast.length);
    forecastChart.update();
    return;
  }

  forecastChart = new Chart(elements.forecastChart, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: getForecastDatasetLabel(result.forecast.length),
          data: outputs,
          backgroundColor: getForecastBarColors(groupedForecast),
          borderColor: "#086452",
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const displayed = groupedForecast[context.dataIndex];
              if (displayed.grouped) {
                return `${formatNumber(context.raw)} kWh, ${displayed.tooltip}`;
              }

              const day = displayed;
              if (day.estimated) {
                return `${formatNumber(context.raw)} kWh, seasonal estimate`;
              }

              const weather = day.sunshineHours === undefined
                ? ""
                : `, ${formatNumber(day.sunshineHours)}h sun, ${formatNumber(day.precipitation)} mm rain`;
              return `${formatNumber(context.raw)} kWh${weather}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#53616d",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#53616d",
            callback(value) {
              return `${value} kWh`;
            },
          },
          grid: { color: "rgba(83, 97, 109, 0.18)" },
        },
      },
    },
  });
}

function handleForecastPeriodChange(shouldReload = true) {
  const customSelected = elements.forecastPeriod.value === "custom";
  elements.customForecastDays.disabled = !customSelected;
  elements.customForecastDays.classList.toggle("is-hidden", !customSelected);

  if (shouldReload) {
    loadWeatherForSelectedCity();
  }
}

function getForecastDays() {
  if (elements.forecastPeriod.value !== "custom") {
    return Number(elements.forecastPeriod.value);
  }

  return Math.min(Math.max(Math.round(getNumber(elements.customForecastDays.value)), 1), 365);
}

function getForecastBarColors(forecast) {
  return forecast.map((day) => (day.estimated ? "#b27a08" : "#0f8b6f"));
}

function groupForecastForDisplay(forecast) {
  if (forecast.length <= 31) {
    return forecast;
  }

  const groupSize = forecast.length <= 120 ? 7 : 30;
  const groupLabel = groupSize === 7 ? "Week" : "Month";
  const grouped = [];

  for (let index = 0; index < forecast.length; index += groupSize) {
    const slice = forecast.slice(index, index + groupSize);
    const totalOutput = slice.reduce((sum, day) => sum + day.output, 0);
    const estimatedCount = slice.filter((day) => day.estimated).length;
    const labelNumber = Math.floor(index / groupSize) + 1;

    grouped.push({
      label: `${groupLabel} ${labelNumber}`,
      output: totalOutput,
      estimated: estimatedCount > slice.length / 2,
      grouped: true,
      tooltip: `${slice.length} days total`,
    });
  }

  return grouped;
}

function getForecastDatasetLabel(days) {
  if (days <= 31) {
    return "Predicted kWh per day";
  }

  if (days <= 120) {
    return "Predicted kWh per week";
  }

  return "Predicted kWh per month";
}

function getSeasonalFactor(date) {
  const averageFactor = MONTHLY_SOLAR_FACTORS.reduce((sum, factor) => sum + factor, 0) / MONTHLY_SOLAR_FACTORS.length;
  const monthFactor = MONTHLY_SOLAR_FACTORS[date.getMonth()] || averageFactor;
  return Math.min(Math.max(monthFactor / averageFactor, 0.65), 1.15);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderProductionChart(result) {
  if (productionChart) {
    productionChart.data.datasets[0].data = result.monthlyProduction;
    productionChart.update();
    return;
  }

  productionChart = new Chart(elements.productionChart, {
    type: "bar",
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "kWh generated",
          data: result.monthlyProduction,
          backgroundColor: "#b27a08",
          borderColor: "#e0a318",
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 42,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.raw.toLocaleString("en-IN")} kWh`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#53616d" },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#53616d",
            callback(value) {
              return value.toLocaleString("en-IN");
            },
          },
          title: {
            display: true,
            text: "kWh",
            color: "#53616d",
          },
          grid: { color: "rgba(83, 97, 109, 0.18)" },
        },
      },
    },
  });
}

function renderSavingsChart(result) {
  const years = Array.from({ length: 10 }, (_, index) => `Year ${index + 1}`);
  const cumulative = years.map((_, index) => Math.round(result.yearlySavings * (index + 1) - result.netCost));
  const breakEven = years.map(() => 0);

  if (savingsChart) {
    savingsChart.data.labels = years;
    savingsChart.data.datasets[0].data = cumulative;
    savingsChart.update();
    return;
  }

  savingsChart = new Chart(elements.chart, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Cumulative savings after cost",
          data: cumulative,
          borderColor: "#0f8b6f",
          backgroundColor: "rgba(15, 139, 111, 0.14)",
          fill: true,
          tension: 0.32,
          pointRadius: 4,
          pointBackgroundColor: "#0f8b6f",
        },
        {
          label: "Break-even line",
          data: breakEven,
          borderColor: "#7b8794",
          borderDash: [6, 6],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#263238",
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#53616d" },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#53616d",
            callback(value) {
              return formatCurrency(value);
            },
          },
          grid: { color: "rgba(83, 97, 109, 0.18)" },
        },
      },
    },
  });
}

function showChartFallback(parentElement) {
  if (parentElement.querySelector(".chart-fallback")) {
    return;
  }

  const fallback = document.createElement("p");
  fallback.className = "chart-fallback";
  fallback.textContent = "This graph needs internet access to load Chart.js. The calculator results still work.";
  parentElement.appendChild(fallback);
}

function initRoofMap() {
  if (!elements.roofMap || typeof L === "undefined") {
    showMapStatus("Map needs internet access to load. Enter roof area manually for now.");
    return;
  }

  roofMap = L.map(elements.roofMap, {
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 90,
    maxZoom: 22,
  }).setView([12.9716, 77.5946], 13);
  const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22,
    maxNativeZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });
  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 22,
      maxNativeZoom: 19,
      attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    }
  );
  const cleanStreetLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 22,
    maxNativeZoom: 20,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  });

  satelliteLayer.addTo(roofMap);
  L.control
    .layers(
      {
        Satellite: satelliteLayer,
        Streets: streetLayer,
        "Clean streets": cleanStreetLayer,
      },
      {},
      { collapsed: true, position: "topright" }
    )
    .addTo(roofMap);

  drawnRoofItems = new L.FeatureGroup();
  roofMap.addLayer(drawnRoofItems);

  const drawControl = new L.Control.Draw({
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: {
          color: "#0f8b6f",
          weight: 3,
        },
      },
      rectangle: {
        shapeOptions: {
          color: "#0f8b6f",
          weight: 3,
        },
      },
      polyline: false,
      circle: false,
      circlemarker: false,
      marker: false,
    },
    edit: {
      featureGroup: drawnRoofItems,
      remove: true,
    },
  });

  roofMap.addControl(drawControl);

  roofMap.on(L.Draw.Event.CREATED, (event) => {
    drawnRoofItems.clearLayers();
    drawnRoofItems.addLayer(event.layer);
    updateRoofAreaFromLayer(event.layer);
  });

  roofMap.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer(updateRoofAreaFromLayer);
  });

  roofMap.on(L.Draw.Event.DELETED, () => {
    clearRoofDrawing();
  });

  elements.mapSearchForm.addEventListener("submit", handleMapSearch);
  showMapStatus("Search an address, then trace the roof on satellite view with the polygon or rectangle tool.");
}

function clearRoofDrawing() {
  if (drawnRoofItems) {
    drawnRoofItems.clearLayers();
  }

  if (searchTargetLayer && roofMap) {
    roofMap.removeLayer(searchTargetLayer);
    searchTargetLayer = null;
  }

  elements.roof.value = 500;
  calculateAndRender();
  showMapStatus("Roof drawing cleared. Draw again or type roof area manually.");
}

async function handleMapSearch(event) {
  event.preventDefault();
  const query = elements.addressSearch.value.trim();

  if (!query) {
    showMapStatus("Enter an address or landmark first.");
    return;
  }

  showMapStatus("Searching map...");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const [place] = await response.json();

    if (!place) {
      showMapStatus("No result found. Try adding city and state.");
      return;
    }

    const lat = Number.parseFloat(place.lat);
    const lon = Number.parseFloat(place.lon);
    roofMap.setView([lat, lon], 20);
    showSearchTarget(lat, lon);

    // Auto-detect closest city from search result
    const detectedKey = detectCityFromCoords(lat, lon);
    if (detectedKey && detectedKey !== elements.city.value) {
      elements.city.value = detectedKey;
      suppliersLoadedForCity = ""; // reset so suppliers reload for new city
      loadWeatherForSelectedCity();
      loadNearbySuppliersForCity();
      calculateAndRender();
      const detectedName = CITY_DATA[detectedKey].name;
      showMapStatus(
        `Detected city: ${detectedName}. City updated automatically. Trace the roof to measure area.`
      );
    } else {
      showMapStatus(
        "Centered on the result. Zoom in if needed, then trace the roof. The target circle will not block drawing."
      );
    }
  } catch (error) {
    showMapStatus("Map search needs internet access. You can still enter roof area manually.");
    console.error(error);
  }
}

function showSearchTarget(lat, lon) {
  if (searchTargetLayer) {
    roofMap.removeLayer(searchTargetLayer);
  }

  searchTargetLayer = L.circleMarker([lat, lon], {
    radius: 7,
    color: "#ffd166",
    weight: 3,
    fillColor: "#0f8b6f",
    fillOpacity: 0.8,
    interactive: false,
  }).addTo(roofMap);
}

function updateRoofAreaFromLayer(layer) {
  const latLngs = getLayerLatLngs(layer);

  if (!latLngs.length || !L.GeometryUtil?.geodesicArea) {
    showMapStatus("Could not calculate area from this shape. Try drawing again.");
    return;
  }

  const sqMeters = Math.abs(L.GeometryUtil.geodesicArea(latLngs));
  const measuredSqFeet = Math.round(sqMeters * 10.7639);
  const sqFeet = roundTo(measuredSqFeet, 10);

  elements.roof.value = sqFeet;

  // Detect city from the centre of the drawn shape
  const bounds = layer.getBounds ? layer.getBounds() : null;
  if (bounds) {
    const centre = bounds.getCenter();
    const detectedKey = detectCityFromCoords(centre.lat, centre.lng);
    if (detectedKey && detectedKey !== elements.city.value) {
      elements.city.value = detectedKey;
      suppliersLoadedForCity = "";
      loadWeatherForSelectedCity();
      loadNearbySuppliersForCity();
      const detectedName = CITY_DATA[detectedKey].name;
      showMapStatus(
        `Roof drawn · ${measuredSqFeet.toLocaleString("en-IN")} sq ft (rounded to ${sqFeet.toLocaleString("en-IN")}). City auto-set to ${detectedName}.`
      );
      calculateAndRender();
      return;
    }
  }

  calculateAndRender();
  showMapStatus(
    `Measured roof area: ${measuredSqFeet.toLocaleString("en-IN")} sq ft. Rounded to ${sqFeet.toLocaleString(
      "en-IN"
    )} sq ft and calculator updated.`
  );
}

function roundRoofInput() {
  const roofArea = getNumber(elements.roof.value);

  if (roofArea > 0) {
    elements.roof.value = roundTo(roofArea, 10);
    calculateAndRender();
  }
}

function getLayerLatLngs(layer) {
  if (layer instanceof L.Rectangle) {
    const bounds = layer.getBounds();
    return [
      bounds.getNorthWest(),
      bounds.getNorthEast(),
      bounds.getSouthEast(),
      bounds.getSouthWest(),
    ];
  }

  const latLngs = layer.getLatLngs();
  return Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
}

function showMapStatus(message) {
  if (elements.mapStatus) {
    elements.mapStatus.textContent = message;
  }
}

function getNumber(value) {
  return Number.parseFloat(value) || 0;
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function formatKw(value) {
  return `${formatNumber(roundTo(value, 0.1))} kW`;
}

function formatNumber(value) {
  return Number.parseFloat(value.toFixed(1)).toString();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSubsidyNote(result) {
  const eligibleKw = formatNumber(roundTo(result.subsidyDetails.eligibleKw, 0.1));
  const baseText = `${formatCurrency(result.subsidy)} subsidy for ${eligibleKw} eligible kW`;

  if (result.subsidyDetails.isCapped) {
    return `${baseText}, capped by scheme`;
  }

  return `${baseText} on ${formatCurrency(result.grossCost)} gross`;
}

function formatUnits(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatForecastDate(dateText) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
  }).format(new Date(dateText));
}

// ── City auto-detection from coordinates ───────────────────────────────────

function detectCityFromCoords(lat, lon) {
  let closestKey = null;
  let closestDist = Infinity;

  Object.entries(CITY_DATA).forEach(([key, city]) => {
    const dist = haversineKm(lat, lon, city.lat, city.lon);
    if (dist < closestDist) {
      closestDist = dist;
      closestKey = key;
    }
  });

  // Only switch if within 80 km of a known city centre
  return closestDist <= 80 ? closestKey : null;
}

// ── Nearby Solar Suppliers ──────────────────────────────────────────────────

let suppliersLoadedForCity = "";

async function loadNearbySuppliersForCity() {
  const cityKey = elements.city.value;
  const city = CITY_DATA[cityKey];
  if (!city) return;
  if (suppliersLoadedForCity === cityKey) return;
  suppliersLoadedForCity = cityKey;

  const statusEl = document.getElementById("suppliersStatus");
  const gridEl = document.getElementById("suppliersGrid");
  if (!statusEl || !gridEl) return;

  statusEl.textContent = `Searching for solar suppliers within 10 km of ${city.name}…`;
  gridEl.innerHTML = "";

  const radius = 10000; // metres
  const lat = city.lat;
  const lon = city.lon;

  // Overpass query: shops/businesses tagged with solar panels, PV, or renewable energy
  const query = `
[out:json][timeout:20];
(
  node["shop"="electronics"](around:${radius},${lat},${lon});
  node["shop"="electrical"](around:${radius},${lat},${lon});
  node["craft"="electronics_repair"](around:${radius},${lat},${lon});
  node["name"~"solar|Solar|photovoltaic|PV|energy|Energy|renew|Renew|surya|Surya",i](around:${radius},${lat},${lon});
  node["description"~"solar",i](around:${radius},${lat},${lon});
  node["product"~"solar",i](around:${radius},${lat},${lon});
);
out body 40;
  `.trim();

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    if (!response.ok) throw new Error("Overpass request failed");
    const data = await response.json();
    const elements_raw = data.elements || [];

    // Filter to those with a name
    const results = elements_raw.filter((el) => el.tags && el.tags.name);

    // Deduplicate by name
    const seen = new Set();
    const unique = results.filter((el) => {
      const key = el.tags.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length === 0) {
      // Fallback: show curated Google Maps search links
      statusEl.textContent = `No tagged suppliers found in OpenStreetMap near ${city.name}. Showing search links for Google Maps instead.`;
      gridEl.innerHTML = buildFallbackSupplierCards(city, lat, lon);
      return;
    }

    statusEl.textContent = `Found ${unique.length} solar-related supplier${unique.length !== 1 ? "s" : ""} within 10 km of ${city.name} via OpenStreetMap.`;
    gridEl.innerHTML = unique.map((el) => buildSupplierCard(el, lat, lon)).join("");
  } catch (err) {
    console.error(err);
    // Fallback gracefully
    statusEl.textContent = `Could not reach the map data service. Showing Google Maps search links for ${city.name}.`;
    gridEl.innerHTML = buildFallbackSupplierCards(city, lat, lon);
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSupplierCard(el, cityLat, cityLon) {
  const tags = el.tags || {};
  const name = tags.name || "Unnamed";
  const shop = tags.shop || tags.craft || tags.amenity || tags.office || "supplier";
  const addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]]
    .filter(Boolean)
    .join(", ");
  const phone = tags.phone || tags["contact:phone"] || "";
  const dist = haversineKm(cityLat, cityLon, el.lat, el.lon);
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + (addr || ""))}&center=${el.lat},${el.lon}`;
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${el.lat},${el.lon}`;

  return `
<article class="supplier-card">
  <div class="supplier-header">
    <div class="supplier-icon">☀️</div>
    <div>
      <div class="supplier-name">${escapeHtml(name)}</div>
      <div class="supplier-type">${escapeHtml(shop)}</div>
    </div>
  </div>
  ${addr ? `<div class="supplier-addr">📍 ${escapeHtml(addr)}</div>` : ""}
  ${phone ? `<div class="supplier-addr">📞 ${escapeHtml(phone)}</div>` : ""}
  <div class="supplier-dist">~${dist.toFixed(1)} km from city centre</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer">🗺 Google Maps</a>
    <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="background:var(--green-dark);">🧭 Directions</a>
  </div>
</article>`;
}

function buildFallbackSupplierCards(city, lat, lon) {
  const searchTerms = [
    "solar panel dealers",
    "solar panel installers",
    "rooftop solar suppliers",
    "solar energy company",
    "solar inverter shop",
  ];

  return searchTerms
    .map((term) => {
      const q = encodeURIComponent(`${term} near ${city.name}`);
      const gmapsUrl = `https://www.google.com/maps/search/${q}/@${lat},${lon},13z`;
      return `
<article class="supplier-card">
  <div class="supplier-header">
    <div class="supplier-icon">☀️</div>
    <div>
      <div class="supplier-name">${term.charAt(0).toUpperCase() + term.slice(1)}</div>
      <div class="supplier-type">Google Maps search</div>
    </div>
  </div>
  <div class="supplier-addr">Search within 10 km of ${escapeHtml(city.name)} city centre</div>
  <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer">🗺 Open in Google Maps</a>
</article>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
