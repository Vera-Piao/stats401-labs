const leagues = ["MLB", "NBA", "NFL", "NHL"];
const colors = new Map([
    ["MLB", "#df6b4f"],
    ["NBA", "#2a9d8f"],
    ["NFL", "#3f6f9f"],
    ["NHL", "#8067a8"]
]);

const state = {
    startYear: 1903,
    endYear: 2018,
    limit: 15,
    selectedCity: "New York City"
};

const controls = {
    start: document.querySelector("#start-year"),
    end: document.querySelector("#end-year"),
    startValue: document.querySelector("#start-year-value"),
    endValue: document.querySelector("#end-year-value"),
    limit: document.querySelector("#city-limit"),
    reset: document.querySelector("#reset-view")
};

const rankingContainer = d3.select("#ranking-chart");
const timelineContainer = d3.select("#timeline-chart");
const tooltip = d3.select("#chart-tooltip");
const status = d3.select("#viz-status");

function showTooltip(event, title, lines) {
    tooltip
        .html(`<strong>${title}</strong>${lines.map((line) => `<div>${line}</div>`).join("")}`)
        .classed("visible", true);
    moveTooltip(event);
}

function moveTooltip(event) {
    const node = tooltip.node();
    const pad = 14;
    const targetBox = event.currentTarget?.getBoundingClientRect?.();
    const pointerX = Number.isFinite(event.clientX) && event.clientX > 0
        ? event.clientX
        : (targetBox?.left ?? pad) + (targetBox?.width ?? 0) / 2;
    const pointerY = Number.isFinite(event.clientY) && event.clientY > 0
        ? event.clientY
        : (targetBox?.top ?? pad) + (targetBox?.height ?? 0) / 2;
    const x = Math.min(pointerX + pad, window.innerWidth - node.offsetWidth - pad);
    const y = Math.min(pointerY + pad, window.innerHeight - node.offsetHeight - pad);
    tooltip.style("left", `${Math.max(pad, x)}px`).style("top", `${Math.max(pad, y)}px`);
}

function hideTooltip() {
    tooltip.classed("visible", false);
}

function aggregateCities(events, allCities) {
    const byCity = d3.rollup(
        events,
        (values) => values.length,
        (d) => d.city,
        (d) => d.league
    );

    return allCities
        .map((city) => {
            const row = { city };
            leagues.forEach((league) => {
                row[league] = byCity.get(city)?.get(league) ?? 0;
            });
            row.total = d3.sum(leagues, (league) => row[league]);
            return row;
        })
        .filter((d) => d.total > 0)
        .sort((a, b) => d3.descending(a.total, b.total) || d3.ascending(a.city, b.city));
}

function renderStatus(rows, events) {
    const leader = rows[0];
    const distinctCities = new Set(events.map((d) => d.city)).size;
    status.html("");

    const items = [
        { value: `${state.startYear}–${state.endYear}`, label: "shared comparison window" },
        { value: d3.format(",")(events.length), label: "championship events" },
        {
            value: leader ? `${leader.city} · ${leader.total}` : "No leader",
            label: `${distinctCities} cities with a title in this window`
        }
    ];

    status
        .selectAll("div")
        .data(items)
        .join("div")
        .attr("class", "status-item")
        .html((d) => `<strong>${d.value}</strong><span>${d.label}</span>`);
}

function renderRanking(rows) {
    rankingContainer.selectAll("*").remove();
    if (!rows.length) {
        rankingContainer.append("p").attr("class", "empty-message").text("No championships fall within this range.");
        return;
    }

    const visibleRows = state.limit === "all" ? rows : rows.slice(0, Number(state.limit));
    const width = Math.max(680, rankingContainer.node().clientWidth || 680);
    const margin = { top: 36, right: 44, bottom: 18, left: 148 };
    const rowHeight = 31;
    const height = margin.top + margin.bottom + visibleRows.length * rowHeight;
    const innerWidth = width - margin.left - margin.right;

    const svg = rankingContainer
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("aria-hidden", "true");
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(visibleRows, (d) => d.total)]).nice().range([0, innerWidth]);
    const y = d3.scaleBand().domain(visibleRows.map((d) => d.city)).range([0, visibleRows.length * rowHeight]).padding(0.24);

    chart
        .append("g")
        .attr("class", "grid")
        .call(d3.axisTop(x).ticks(Math.min(8, d3.max(visibleRows, (d) => d.total))).tickSize(-visibleRows.length * rowHeight).tickFormat(""));

    chart
        .append("g")
        .attr("class", "axis")
        .call(d3.axisTop(x).ticks(Math.min(8, d3.max(visibleRows, (d) => d.total))).tickSizeOuter(0).tickFormat(d3.format("d")))
        .call((g) => g.append("text").attr("x", innerWidth).attr("y", -24).attr("fill", "#657389").attr("text-anchor", "end").text("Championships"));

    const row = chart
        .selectAll("g.city-row")
        .data(visibleRows)
        .join("g")
        .attr("class", (d) => `city-row${d.city === state.selectedCity ? " selected" : ""}`)
        .attr("transform", (d) => `translate(0,${y(d.city)})`)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", (d, i) => `${i + 1}. ${d.city}, ${d.total} championships. Select to inspect timeline.`)
        .on("click", (_, d) => selectCity(d.city, rows))
        .on("keydown", (event, d) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectCity(d.city, rows);
            }
        });

    row
        .append("rect")
        .attr("class", "row-hit")
        .attr("x", -margin.left)
        .attr("y", -y.bandwidth() * 0.2)
        .attr("width", width - margin.right)
        .attr("height", y.bandwidth() * 1.4);

    row
        .append("text")
        .attr("class", "rank-label")
        .attr("x", -margin.left + 4)
        .attr("y", y.bandwidth() / 2 + 4)
        .text((_, i) => String(i + 1).padStart(2, "0"));

    row
        .append("text")
        .attr("class", "city-label")
        .attr("x", -10)
        .attr("y", y.bandwidth() / 2 + 4)
        .attr("text-anchor", "end")
        .text((d) => d.city);

    const stacked = d3.stack().keys(leagues)(visibleRows);
    stacked.forEach((series) => {
        chart
            .append("g")
            .attr("fill", colors.get(series.key))
            .selectAll("rect")
            .data(series.filter((d) => d[1] > d[0]))
            .join("rect")
            .attr("class", "bar-segment")
            .attr("x", (d) => x(d[0]))
            .attr("y", (d) => y(d.data.city))
            .attr("width", (d) => Math.max(1, x(d[1]) - x(d[0])))
            .attr("height", y.bandwidth())
            .on("mouseenter", (event, d) => {
                const count = d.data[series.key];
                const share = d3.format(".0%")(count / d.data.total);
                showTooltip(event, d.data.city, [`${series.key}: ${count} titles`, `${share} of the city total`]);
            })
            .on("mousemove", moveTooltip)
            .on("mouseleave", hideTooltip);
    });

    chart
        .selectAll("text.bar-total")
        .data(visibleRows)
        .join("text")
        .attr("class", "bar-total")
        .attr("x", (d) => x(d.total) + 7)
        .attr("y", (d) => y(d.city) + y.bandwidth() / 2 + 4)
        .text((d) => d.total);
}

function selectCity(city, rows) {
    state.selectedCity = city;
    renderRanking(rows);
    renderTimeline(window.filteredEventsForViz);
}

function renderTimeline(events) {
    timelineContainer.selectAll("*").remove();
    const cityEvents = events.filter((d) => d.city === state.selectedCity);
    const summary = d3.select("#timeline-summary");
    summary.text(`${state.selectedCity} · ${cityEvents.length} title${cityEvents.length === 1 ? "" : "s"} in this window`);

    if (!cityEvents.length) {
        timelineContainer
            .append("p")
            .attr("class", "empty-message")
            .text(`${state.selectedCity} has no titles between ${state.startYear} and ${state.endYear}.`);
        return;
    }

    const width = Math.max(680, timelineContainer.node().clientWidth || 680);
    const margin = { top: 20, right: 25, bottom: 38, left: 58 };
    const height = 210;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const svg = timelineContainer.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("aria-hidden", "true");
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([state.startYear, state.endYear]).range([0, innerWidth]);
    const y = d3.scalePoint().domain(leagues).range([8, innerHeight - 8]).padding(0.35);

    chart
        .selectAll("line.timeline-lane")
        .data(leagues)
        .join("line")
        .attr("class", "timeline-lane")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (d) => y(d))
        .attr("y2", (d) => y(d));

    chart
        .selectAll("text.timeline-label")
        .data(leagues)
        .join("text")
        .attr("class", "timeline-label")
        .attr("x", -11)
        .attr("y", (d) => y(d) + 4)
        .attr("text-anchor", "end")
        .text((d) => d);

    const span = state.endYear - state.startYear;
    const tickCount = Math.max(2, Math.min(9, Math.floor(innerWidth / 90), span + 1));
    chart
        .append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(tickCount).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart
        .selectAll("circle.timeline-dot")
        .data(cityEvents)
        .join("circle")
        .attr("class", "timeline-dot")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.league))
        .attr("r", 5.6)
        .attr("fill", (d) => colors.get(d.league))
        .attr("tabindex", 0)
        .attr("aria-label", (d) => `${d.year} ${d.league} championship, ${d.team}`)
        .on("mouseenter focus", (event, d) => showTooltip(event, `${d.year} · ${d.league}`, [d.team, state.selectedCity]))
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", hideTooltip);
}

function update(data, allCities) {
    const events = data.filter((d) => d.year >= state.startYear && d.year <= state.endYear);
    const rows = aggregateCities(events, allCities);
    window.filteredEventsForViz = events;

    if (!rows.some((d) => d.city === state.selectedCity) && rows.length) {
        state.selectedCity = rows[0].city;
    }

    controls.startValue.value = state.startYear;
    controls.endValue.value = state.endYear;
    renderStatus(rows, events);
    renderRanking(rows);
    renderTimeline(events);

    rankingContainer.attr(
        "aria-label",
        `Ranked stacked bar chart showing championships by city and league from ${state.startYear} to ${state.endYear}.`
    );
    timelineContainer.attr(
        "aria-label",
        `Championship timeline for ${state.selectedCity} from ${state.startYear} to ${state.endYear}.`
    );
}

function bindControls(data, allCities) {
    controls.start.addEventListener("input", () => {
        state.startYear = Math.min(Number(controls.start.value), state.endYear);
        controls.start.value = state.startYear;
        update(data, allCities);
    });

    controls.end.addEventListener("input", () => {
        state.endYear = Math.max(Number(controls.end.value), state.startYear);
        controls.end.value = state.endYear;
        update(data, allCities);
    });

    controls.limit.addEventListener("change", () => {
        state.limit = controls.limit.value;
        update(data, allCities);
    });

    controls.reset.addEventListener("click", () => {
        state.startYear = 1903;
        state.endYear = 2018;
        state.limit = 15;
        state.selectedCity = "New York City";
        controls.start.value = state.startYear;
        controls.end.value = state.endYear;
        controls.limit.value = "15";
        update(data, allCities);
    });

    document.querySelectorAll("[data-start][data-end]").forEach((button) => {
        button.addEventListener("click", () => {
            state.startYear = Number(button.dataset.start);
            state.endYear = Number(button.dataset.end);
            controls.start.value = state.startYear;
            controls.end.value = state.endYear;
            update(data, allCities);
        });
    });

    let resizeFrame;
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => update(data, allCities));
    });
    observer.observe(rankingContainer.node());
}

d3.csv("../data/championships.csv", (d) => ({
    year: Number(d.year),
    league: d.league,
    city: d.city,
    team: d.team
}))
    .then((data) => {
        const allCities = Array.from(new Set(data.map((d) => d.city))).sort(d3.ascending);
        bindControls(data, allCities);
        update(data, allCities);
    })
    .catch((error) => {
        console.error(error);
        rankingContainer
            .append("p")
            .attr("class", "empty-message")
            .text("The championship data could not be loaded. Serve this folder through a local or GitHub Pages web server.");
        d3.select("#timeline-chart").remove();
    });
