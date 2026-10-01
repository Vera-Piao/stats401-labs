const tooltip = d3.select("#lab9-tooltip");
const formatGDP = d3.format(",.1f");
let selectedIso3 = null;

async function init() {
    const [worldData, gdpData] = await Promise.all([
        d3.json("../data/world.geojson"),
        d3.csv(
            "../data/lab9_gdp_2025_top50.csv",
            (d) => ({
                iso3: d.iso3,
                country: d.country,
                gdp: +d.gdp_2025_billion_usd,
                rank: +d.rank
            })
        )
    ]);

    const gdpByIso = new Map(
        gdpData.map((d) => [d.iso3, d])
    );

    worldData.features.forEach((feature) => {
        const iso3 = feature.properties.ISO_A3_EH;
        feature.properties.gdpRecord = gdpByIso.get(iso3) ?? null;
    });

    const matchedIsoCodes = new Set(
        worldData.features
            .map((feature) => feature.properties.ISO_A3_EH)
            .filter((iso3) => gdpByIso.has(iso3))
    );

    const unmatchedGDP = gdpData.filter(
        (d) => !matchedIsoCodes.has(d.iso3)
    );

    if (unmatchedGDP.length) {
        console.warn("Unmatched GDP records:", unmatchedGDP);
    }

    const colorScale = d3
        .scaleSequentialLog(d3.interpolateBlues)
        .domain(d3.extent(gdpData, (d) => d.gdp));

    drawChoropleth(worldData, colorScale);
    drawColorLegend(colorScale);

    const radiusScale = drawCartogram(worldData, colorScale);
    drawSizeLegend(radiusScale);
}

function drawChoropleth(worldData, colorScale) {
    const width = 900;
    const height = 520;
    const container = d3.select("#choropleth-map");

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr(
            "aria-label",
            "Interactive world choropleth of 2025 nominal GDP. Darker blue indicates higher GDP."
        );

    const mapGroup = svg
        .append("g")
        .attr("class", "map-layer");

    const projection = d3
        .geoNaturalEarth1()
        .fitExtent([[10, 10], [width - 10, height - 10]], worldData);

    const path = d3
        .geoPath()
        .projection(projection);

    const countries = mapGroup
        .selectAll("path")
        .data(worldData.features)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("data-iso3", (d) => d.properties.gdpRecord?.iso3 ?? null)
        .attr("tabindex", (d) => d.properties.gdpRecord ? 0 : null)
        .attr("fill", (d) => {
            const record = d.properties.gdpRecord;
            return record === null ? "#e5e7eb" : colorScale(record.gdp);
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5);

    bindCountryInteractions(
        countries,
        (d) => d.properties.gdpRecord,
        (d) => d.properties.NAME_EN
    );

    const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    d3.select("#reset-map-zoom").on("click", () => {
        svg
            .transition()
            .duration(450)
            .call(zoom.transform, d3.zoomIdentity);
    });
}

function drawCartogram(worldData, colorScale) {
    const width = 900;
    const height = 520;
    const container = d3.select("#cartogram-map");

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr(
            "aria-label",
            "Dorling cartogram of the 50 largest economies in 2025. Circle area represents nominal GDP."
        );

    const projection = d3
        .geoNaturalEarth1()
        .fitExtent([[45, 40], [width - 45, height - 40]], worldData);

    const path = d3.geoPath().projection(projection);

    svg
        .append("path")
        .datum({ type: "Sphere" })
        .attr("class", "cartogram-sphere")
        .attr("d", path);

    svg
        .append("path")
        .datum(d3.geoGraticule10())
        .attr("class", "cartogram-graticule")
        .attr("d", path);

    const featuresByEconomy = d3.group(
        worldData.features.filter((feature) => feature.properties.gdpRecord),
        (feature) => feature.properties.gdpRecord.iso3
    );

    const economyFeatures = Array.from(
        featuresByEconomy,
        ([, features]) => features.reduce(
            (largest, candidate) =>
                d3.geoArea(candidate) > d3.geoArea(largest)
                    ? candidate
                    : largest
        )
    );

    const nodes = economyFeatures
        .map((feature) => {
            const record = feature.properties.gdpRecord;
            const [homeX, homeY] = path.centroid(feature);

            return {
                ...record,
                homeX,
                homeY,
                x: homeX,
                y: homeY
            };
        });

    const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(nodes, (d) => d.gdp)])
        .range([0, 62]);

    nodes.forEach((d) => {
        d.radius = radiusScale(d.gdp);
    });

    const simulation = d3
        .forceSimulation(nodes)
        .force("x", d3.forceX((d) => d.homeX).strength(0.3))
        .force("y", d3.forceY((d) => d.homeY).strength(0.3))
        .force(
            "collide",
            d3.forceCollide((d) => d.radius + 2).strength(1).iterations(3)
        )
        .stop();

    for (let i = 0; i < 320; i += 1) {
        simulation.tick();
    }

    const circles = svg
        .append("g")
        .attr("class", "cartogram-circles")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("class", "cartogram-country")
        .attr("data-iso3", (d) => d.iso3)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", (d) => d.radius)
        .attr("fill", (d) => colorScale(d.gdp))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.2)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr(
            "aria-label",
            (d) => `${d.country}, 2025 GDP ${formatGDP(d.gdp)} billion U.S. dollars, rank ${d.rank}`
        );

    bindCountryInteractions(
        circles,
        (d) => d,
        (d) => d.country
    );

    svg
        .append("g")
        .attr("class", "cartogram-labels")
        .selectAll("text")
        .data(nodes.filter((d) => d.radius >= 12))
        .join("text")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y + 3.5)
        .text((d) => d.iso3);

    return radiusScale;
}

function bindCountryInteractions(selection, getRecord, getFallbackName) {
    selection
        .on("mouseenter focus", function (event, d) {
            const record = getRecord(d);
            const iso3 = record?.iso3;

            d3.select(this).classed("is-linked-highlight", true);
            setLinkedHighlight(iso3, true);
            showTooltip(event, record, getFallbackName(d));
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", function (event, d) {
            const record = getRecord(d);

            d3.select(this).classed("is-linked-highlight", false);
            setLinkedHighlight(record?.iso3, false);
            hideTooltip();
        })
        .on("click", function (event, d) {
            const record = getRecord(d);

            if (!record) {
                return;
            }

            event.stopPropagation();
            toggleSelectedCountry(record);
        })
        .on("keydown", function (event, d) {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            const record = getRecord(d);

            if (!record) {
                return;
            }

            event.preventDefault();
            toggleSelectedCountry(record);
        });
}

function toggleSelectedCountry(record) {
    selectedIso3 = selectedIso3 === record.iso3
        ? null
        : record.iso3;

    d3.selectAll("[data-iso3]")
        .classed("is-selected", function () {
            return this.getAttribute("data-iso3") === selectedIso3;
        });

    d3.selectAll(".lab9-selection-status")
        .text(
            selectedIso3
                ? `Selected in both maps: ${record.country} (${record.iso3}). Click it again to clear.`
                : "No country selected. Click a country in either view to keep it highlighted."
        );
}

function setLinkedHighlight(iso3, isActive) {
    if (!iso3) {
        return;
    }

    d3.selectAll(`[data-iso3="${iso3}"]`)
        .classed("is-linked-highlight", isActive);
}

function showTooltip(event, record, fallbackName) {
    const content = record
        ? `
            <strong>${record.country}</strong><br>
            2025 GDP: $${formatGDP(record.gdp)} billion<br>
            Rank: #${record.rank}
        `
        : `
            <strong>${fallbackName}</strong><br>
            No GDP data in the provided top-50 dataset
        `;

    tooltip
        .html(content)
        .attr("aria-hidden", "false")
        .style("opacity", 1);

    moveTooltip(event);
}

function moveTooltip(event) {
    const targetBox = event.currentTarget?.getBoundingClientRect?.();
    const pageX = Number.isFinite(event.pageX) && event.pageX > 0
        ? event.pageX
        : (targetBox?.left ?? 0) + window.scrollX + (targetBox?.width ?? 0) / 2;
    const pageY = Number.isFinite(event.pageY) && event.pageY > 0
        ? event.pageY
        : (targetBox?.top ?? 0) + window.scrollY + (targetBox?.height ?? 0) / 2;

    tooltip
        .style("left", `${pageX + 12}px`)
        .style("top", `${pageY + 12}px`);
}

function hideTooltip() {
    tooltip
        .attr("aria-hidden", "true")
        .style("opacity", 0);
}

function drawColorLegend(colorScale) {
    const width = 560;
    const height = 72;
    const barWidth = 300;
    const barHeight = 12;
    const container = d3.select("#gdp-color-legend");

    container.selectAll("*").remove();

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", "gdp-color-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%");

    gradient
        .selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .join("stop")
        .attr("offset", (d) => `${d * 100}%`)
        .attr("stop-color", (d) => d3.interpolateBlues(d));

    const legend = svg
        .append("g")
        .attr("transform", "translate(10, 24)");

    legend
        .append("text")
        .attr("class", "gdp-legend-title")
        .attr("y", -9)
        .text("2025 GDP (billion current US$, logarithmic scale)");

    legend
        .append("rect")
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", "url(#gdp-color-gradient)");

    const domain = colorScale.domain();
    const legendScale = d3
        .scaleLog()
        .domain(domain)
        .range([0, barWidth]);

    legend
        .append("g")
        .attr("class", "gdp-legend-axis")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(
            d3.axisBottom(legendScale)
                .tickValues([domain[0], 1000, 3000, 10000, domain[1]])
                .tickFormat(d3.format(",.0f"))
                .tickSize(5)
        );

    const noData = svg
        .append("g")
        .attr("transform", "translate(365, 24)");

    noData
        .append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", "#e5e7eb")
        .attr("stroke", "#c7ced8");

    noData
        .append("text")
        .attr("x", 21)
        .attr("y", 11)
        .attr("class", "gdp-no-data-label")
        .text("No data");
}

function drawSizeLegend(radiusScale) {
    const values = [1000, 10000, 30000];
    const xPositions = [75, 230, 420];
    const width = 540;
    const height = 165;
    const baseline = 105;
    const container = d3.select("#cartogram-size-legend");

    const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    svg
        .append("text")
        .attr("class", "gdp-legend-title")
        .attr("x", 4)
        .attr("y", 15)
        .text("Circle area represents 2025 GDP");

    const item = svg
        .selectAll("g.cartogram-size-item")
        .data(values)
        .join("g")
        .attr("class", "cartogram-size-item")
        .attr("transform", (_, i) => `translate(${xPositions[i]}, 0)`);

    item
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d) => baseline - radiusScale(d))
        .attr("r", (d) => radiusScale(d))
        .attr("fill", "#9ecae1")
        .attr("fill-opacity", 0.72)
        .attr("stroke", "#2f6fb0");

    item
        .append("line")
        .attr("x1", (d) => -radiusScale(d))
        .attr("x2", (d) => radiusScale(d))
        .attr("y1", baseline)
        .attr("y2", baseline);

    item
        .append("text")
        .attr("x", 0)
        .attr("y", baseline + 22)
        .attr("text-anchor", "middle")
        .text((d) => `$${d3.format(",")(d)}B`);
}

init().catch((error) => {
    console.error("Unable to load the Lab 9 visualization:", error);
    d3.select("#choropleth-map")
        .append("p")
        .attr("class", "error-message")
        .text("The visualization could not be loaded. Please refresh the page or check the console.");
});
