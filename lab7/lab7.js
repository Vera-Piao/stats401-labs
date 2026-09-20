d3.csv(
    "../data/lab7_historical_weather.csv",
    d => ({
        date: d3.timeParse("%Y-%m-%d")(d.date),
        city: d.city,
        country: d.country,
        temperature_c: +d.temperature_c,
        humidity_pct: +d.humidity_pct,
        wind_speed_mps: +d.wind_speed_mps,
        pressure_hpa: +d.pressure_hpa,
        precipitation_mm: +d.precipitation_mm
    })
)
.then(data => {

    console.log(data);

    const cityData = data
        .filter(d => d.city === "Tokyo")
        .sort(
            (a, b) =>
                d3.ascending(a.date, b.date)
        );

    const selectedCities = [
        "Tokyo",
        "London",
        "New York"
    ];

    const filteredData = data.filter(
        d => selectedCities.includes(d.city)
    );

    const grouped = d3.group(
        filteredData,
        d => d.city
    );

    const colorScale = d3.scaleOrdinal()
        .domain(selectedCities)
        .range(d3.schemeTableau10);

    const width = 900;
    const height = 500;

    const margin = {
        top: 40,
        right: 40,
        bottom: 70,
        left: 70
    };

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const xScale = d3.scaleTime()
        .domain(
            d3.extent(filteredData, d => d.date)
        )
        .range([
            margin.left,
            width - margin.right
        ]);

    const yScale = d3.scaleLinear()
        .domain(
            d3.extent(
                filteredData,
                d => d.temperature_c
            )
        )
        .nice()
        .range([
            height - margin.bottom,
            margin.top
        ]);

    svg.append("g")
        .attr(
            "transform",
            `translate(0,${height - margin.bottom})`
        )
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left},0)`
        )
        .call(d3.axisLeft(yScale));

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.temperature_c));

    svg.selectAll(".city-line")
        .data(grouped)
        .join("path")
        .attr("class", "city-line")
        .attr("fill", "none")
        .attr(
            "stroke",
            d => colorScale(d[0])
        )
        .attr("stroke-width", 2)
        .attr(
            "d",
            d => line(d[1])
        );

    d3.select("#metric")
        .on("change", function() {
            updateChart(this.value);
        });

    function updateChart(metric) {

        yScale
            .domain(
                d3.extent(
                    filteredData,
                    d => d[metric]
                )
            )
            .nice();

        line.y(
            d => yScale(d[metric])
        );

        svg.selectAll(".city-line")
            .transition()
            .duration(600)
            .attr(
                "d",
                d => line(d[1])
            );
    }

    const tooltip = d3.select("#tooltip");

    const bisectDate =
        d3.bisector(d => d.date).center;

    function moved(event) {

        const [mouseX] = d3.pointer(event);

        const date =
            xScale.invert(mouseX);

        const index =
            bisectDate(cityData, date);

        const d = cityData[index];

        tooltip
        .style("opacity", 1)
        .style(
            "left",
            `${event.pageX + 14}px`
        )
        .style(
            "top",
            `${event.pageY + 14}px`
        )
        .attr("aria-hidden", "false")
        .html(`
                <strong>${d.city}</strong><br>
                ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                Temperature: ${d.temperature_c} °C<br>
                Humidity: ${d.humidity_pct}%<br>
                Wind: ${d.wind_speed_mps} m/s<br>
                Pressure: ${d.pressure_hpa} hPa
            `);
    }

    svg
        .on("mousemove", moved)
        .on("mouseleave", function() {

            tooltip
                .style("opacity", 0)
                .attr("aria-hidden", "true");
        });

    let currentIndex = 0;
    let timer = null;

    const marker = svg.append("circle")
        .attr("r", 7)
        .attr("fill", "red");

    const dateLabel = svg.append("text")
        .attr("x", width - 160)
        .attr("y", 40)
        .attr("font-size", 20);

    function showFrame(index) {

        const d = cityData[index];

        marker
            .attr(
                "cx",
                xScale(d.date)
            )
            .attr(
                "cy",
                yScale(d.temperature_c)
            );

        dateLabel.text(
            d3.timeFormat("%Y-%m-%d")(
                d.date
            )
        );

        d3.select("#time-slider")
            .property("value", index);
    }

    function play() {

        if (timer) return;

        timer = d3.interval(
            () => {

                showFrame(currentIndex);

                currentIndex += 1;

                if (
                    currentIndex >=
                    cityData.length
                ) {
                    pause();
                }

            },
            150
        );
    }

    function pause() {

        if (timer) {
            timer.stop();
            timer = null;
        }
    }

    function reset() {

        pause();

        currentIndex = 0;

        showFrame(0);
    }

    d3.select("#play")
        .on("click", play);

    d3.select("#pause")
        .on("click", pause);

    d3.select("#reset")
        .on("click", reset);

    d3.select("#time-slider")
        .on("input", function() {

            pause();

            currentIndex =
                +this.value;

            showFrame(currentIndex);
        });
});

// Lab 7 Assignment: Animated Temporal Commercial Network

Promise.all([
    d3.csv("../data/lab7_assignment_companies.csv"),

    d3.csv(
        "../data/lab7_assignment_transactions_60days.csv",
        d => ({
            date: d3.timeParse("%Y-%m-%d")(d.date),
            day: +d.day,
            source: d.source,
            target: d.target,
            amount_usd: +d.amount_usd,
            transaction_type: d.transaction_type,
            transaction_count: +d.transaction_count
        })
    )
])
.then(([companies, transactions]) => {

    console.log("Assignment companies:", companies);
    console.log("Assignment transactions:", transactions);

    createCommercialNetwork(companies, transactions);
})
.catch(error => {
    console.error("Unable to load assignment data:", error);
});

function createCommercialNetwork(companies, transactions) {

    const width = 900;
    const height = 620;
    const boundaryPadding = 45;

    let currentDay = 1;
    let timer = null;

    const svg = d3.select("#network-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("aria-labelledby", "network-title");

    const linkGroup = svg.append("g")
        .attr("class", "network-links");

    const nodeGroup = svg.append("g")
        .attr("class", "network-nodes");

    const labelGroup = svg.append("g")
        .attr("class", "network-labels");


    const sectors = Array.from(
        new Set(companies.map(d => d.sector))
    );

    const transactionTypes = Array.from(
        new Set(
            transactions.map(d => d.transaction_type)
        )
    );

    const sectorColor = d3.scaleOrdinal()
        .domain(sectors)
        .range(d3.schemeTableau10);

    const linkColor = d3.scaleOrdinal()
        .domain(transactionTypes)
        .range(d3.schemeSet2);

    const linkWidth = d3.scaleSqrt()
        .domain([
            0,
            d3.max(
                transactions,
                d => d.amount_usd
            )
        ])
        .range([1.5, 8]);

    const companyById = new Map(
        companies.map(
            company => [company.id, company]
        )
    );

    const networkTooltip =
        d3.select("#network-tooltip");

    let maximumDailyVolume = 0;

    for (let day = 1; day <= 60; day += 1) {

        const dayLinks = transactions.filter(
            d => d.day === day
        );

        companies.forEach(company => {

            const volume = d3.sum(
                dayLinks.filter(
                    link =>
                        link.source === company.id ||
                        link.target === company.id
                ),
                link => link.amount_usd
            );

            maximumDailyVolume = Math.max(
                maximumDailyVolume,
                volume
            );
        });
    }

    const nodeSize = d3.scaleSqrt()
        .domain([0, maximumDailyVolume])
        .range([8, 32]);

    const node = nodeGroup
        .selectAll("circle")
        .data(companies, d => d.id)
        .join("circle")
        .attr("class", "network-node")
        .attr("r", 8)
        .attr(
            "fill",
            d => sectorColor(d.sector)
        )
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    const label = labelGroup
        .selectAll("text")
        .data(companies, d => d.id)
        .join("text")
        .attr("class", "network-label")
        .attr("text-anchor", "middle")
        .text(d => d.company_name);

    let link = linkGroup
        .selectAll("line");


    const simulation = d3.forceSimulation(companies)

        .force(
            "link",
            d3.forceLink([])
                .id(d => d.id)
                .distance(145)
                .strength(0.35)
        )

        .force(
            "charge",
            d3.forceManyBody()
                .strength(-300)
        )

        .force(
            "center",
            d3.forceCenter(
                width / 2,
                height / 2
            )
        )

        .force(
            "x",
            d3.forceX(width / 2)
                .strength(0.035)
        )

        .force(
            "y",
            d3.forceY(height / 2)
                .strength(0.035)
        )

        .force(
            "collision",
            d3.forceCollide()
                .radius(
                    d => nodeSize(
                        d.currentVolume || 0
                    ) + 22
                )
        )

        .on("tick", ticked);

    function ticked() {

        companies.forEach(d => {

            d.x = Math.max(
                boundaryPadding,
                Math.min(
                    width - boundaryPadding,
                    d.x
                )
            );

            d.y = Math.max(
                boundaryPadding,
                Math.min(
                    height - boundaryPadding,
                    d.y
                )
            );
        });

        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr(
                "y",
                d =>
                    d.y +
                    nodeSize(d.currentVolume || 0) +
                    15
            );
    }

    node.call(
        d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded)
    );

    node
        .on("mouseenter", function(event, d) {

            d3.select(this)
                .attr("stroke", "#172033")
                .attr("stroke-width", 3);

            showNetworkTooltip(
                event,
                `
                    <strong>${d.company_name}</strong><br>
                    Sector: ${d.sector}<br>
                    Region: ${d.region}<br>
                    Current volume:
                    ${d3.format("$,.2f")(
                        d.currentVolume || 0
                    )}
                `
            );
        })

        .on("mousemove", moveNetworkTooltip)

        .on("mouseleave", function() {

            d3.select(this)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2);

            hideNetworkTooltip();
        });

    function dragStarted(event, d) {

        if (!event.active) {
            simulation
                .alphaTarget(0.3)
                .restart();
        }

        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {

        d.fx = Math.max(
            boundaryPadding,
            Math.min(
                width - boundaryPadding,
                event.x
            )
        );

        d.fy = Math.max(
            boundaryPadding,
            Math.min(
                height - boundaryPadding,
                event.y
            )
        );
    }

    function dragEnded(event, d) {

        if (!event.active) {
            simulation.alphaTarget(0);
        }

        d.fx = null;
        d.fy = null;
    }

    function nodeId(value) {

        return typeof value === "object"
            ? value.id
            : value;
    }

    function showNetworkTooltip(event, html) {

        networkTooltip
            .style("opacity", 1)
            .style(
                "left",
                `${event.pageX + 14}px`
            )
            .style(
                "top",
                `${event.pageY + 14}px`
            )
            .attr("aria-hidden", "false")
            .html(html);
    }

    function moveNetworkTooltip(event) {

        networkTooltip
            .style(
                "left",
                `${event.pageX + 14}px`
            )
            .style(
                "top",
                `${event.pageY + 14}px`
            );
    }

    function hideNetworkTooltip() {

        networkTooltip
            .style("opacity", 0)
            .attr("aria-hidden", "true");
    }

    function relationshipKey(d) {

        const endpoints = [
            nodeId(d.source),
            nodeId(d.target)
        ].sort();

        return `${endpoints[0]}-${endpoints[1]}-${d.transaction_type}`;
    }

    function showDay(day) {

        currentDay = day;

        const currentLinks = transactions.filter(
            d => d.day === day
        );

        companies.forEach(company => {

            company.currentVolume = d3.sum(
                currentLinks.filter(
                    transaction =>
                        transaction.source === company.id ||
                        transaction.target === company.id
                ),
                transaction => transaction.amount_usd
            );
        });

        const simulationLinks = currentLinks.map(
            d => ({ ...d })
        );

        link = linkGroup
            .selectAll("line")
            .data(
                simulationLinks,
                relationshipKey
            )
            .join(
                enter =>
                    enter
                        .append("line")
                        .attr("class", "network-link")
                        .attr(
                            "stroke",
                            d =>
                                linkColor(
                                    d.transaction_type
                                )
                        )
                        .attr(
                            "stroke-width",
                            d =>
                                linkWidth(
                                    d.amount_usd
                                )
                        )
                        .attr("stroke-opacity", 0)
                        .call(
                            enter =>
                                enter
                                    .transition()
                                    .duration(400)
                                    .attr(
                                        "stroke-opacity",
                                        0.75
                                    )
                        ),

                update =>
                    update
                        .call(
                            update =>
                                update
                                    .transition()
                                    .duration(400)
                                    .attr(
                                        "stroke",
                                        d =>
                                            linkColor(
                                                d.transaction_type
                                            )
                                    )
                                    .attr(
                                        "stroke-width",
                                        d =>
                                            linkWidth(
                                                d.amount_usd
                                            )
                                    )
                                    .attr(
                                        "stroke-opacity",
                                        0.75
                                    )
                        ),

                exit =>
                    exit
                        .transition()
                        .duration(400)
                        .attr("stroke-opacity", 0)
                        .remove()
            );

            link
                .on("mouseenter", function(event, d) {

                    const sourceCompany = companyById.get(
                        nodeId(d.source)
                    );

                    const targetCompany = companyById.get(
                        nodeId(d.target)
                    );

                    d3.select(this)
                        .attr("stroke-opacity", 1);

                    showNetworkTooltip(
                        event,
                        `
                            <strong>
                                ${sourceCompany.company_name}
                                ↔
                                ${targetCompany.company_name}
                            </strong>
                            <br>
                            Type: ${d.transaction_type}<br>
                            Amount:
                            ${d3.format("$,.2f")(
                                d.amount_usd
                            )}
                            <br>
                            Transactions:
                            ${d.transaction_count}
                        `
                    );
                })

                .on("mousemove", moveNetworkTooltip)

                .on("mouseleave", function() {

                    d3.select(this)
                        .attr("stroke-opacity", 0.75);

                    hideNetworkTooltip();
                });

        node
            .transition()
            .duration(400)
            .attr(
                "r",
                d => nodeSize(d.currentVolume)
            )
            .attr(
                "opacity",
                d =>
                    d.currentVolume > 0
                        ? 1
                        : 0.35
            );

        label
            .transition()
            .duration(400)
            .attr(
                "opacity",
                d =>
                    d.currentVolume > 0
                        ? 1
                        : 0.45
            );


        simulation
            .force("link")
            .links(simulationLinks);

        simulation
            .force("collision")
            .radius(
                d =>
                    nodeSize(d.currentVolume) + 22
            );

        simulation
            .alpha(0.35)
            .restart();

        const firstDate = d3.timeParse("%Y-%m-%d")(
            "2026-01-01"
        );

        const currentDate =
            currentLinks.length > 0
                ? currentLinks[0].date
                : d3.timeDay.offset(
                    firstDate,
                    day - 1
                );

        const activeCompanyIds = new Set(
            currentLinks.flatMap(
                d => [d.source, d.target]
            )
        );

        const totalValue = d3.sum(
            currentLinks,
            d => d.amount_usd
        );

        d3.select("#network-current-date")
            .text(
                `Day ${day} · ${
                    d3.timeFormat("%B %d, %Y")(
                        currentDate
                    )
                }`
            );

        d3.select("#active-company-count")
            .text(activeCompanyIds.size);

        d3.select("#active-link-count")
            .text(currentLinks.length);

        d3.select("#daily-transaction-value")
            .text(
                d3.format("$,.2f")(totalValue)
            );

        d3.select("#network-slider")
            .property("value", day);
    }


    function playNetwork() {

        if (timer) {
            return;
        }

        // If Play is pressed at the end, begin again.
        if (currentDay >= 60) {
            currentDay = 0;
        }

        timer = d3.interval(
            () => {

                currentDay += 1;

                showDay(currentDay);

                if (currentDay >= 60) {
                    pauseNetwork();
                }
            },
            900
        );
    }

    function pauseNetwork() {

        if (timer) {
            timer.stop();
            timer = null;
        }
    }

    function resetNetwork() {

        pauseNetwork();

        currentDay = 1;

        showDay(currentDay);
    }

    d3.select("#network-play")
        .on("click", playNetwork);

    d3.select("#network-pause")
        .on("click", pauseNetwork);

    d3.select("#network-reset")
        .on("click", resetNetwork);

    d3.select("#network-slider")
        .on("input", function() {

            pauseNetwork();

            currentDay = +this.value;

            showDay(currentDay);
        });

    function createNetworkLegend() {

        const legend = d3.select("#network-legend");

        legend.selectAll("*").remove();

        const sectorSection = legend
            .append("div")
            .attr("class", "legend-section");

        sectorSection
            .append("h3")
            .text("Company sector");

        const sectorItems = sectorSection
            .append("div")
            .attr("class", "network-legend-items");

        sectorItems
            .selectAll(".network-legend-item")
            .data(sectors)
            .join("div")
            .attr("class", "network-legend-item")
            .html(
                sector => `
                    <span
                        class="network-legend-swatch"
                        style="background:${sectorColor(sector)}"
                    ></span>

                    <span>${sector}</span>
                `
            );

        const typeSection = legend
            .append("div")
            .attr("class", "legend-section");

        typeSection
            .append("h3")
            .text("Transaction type");

        const typeItems = typeSection
            .append("div")
            .attr("class", "network-legend-items");

        typeItems
            .selectAll(".network-legend-item")
            .data(transactionTypes)
            .join("div")
            .attr("class", "network-legend-item")
            .html(
                type => `
                    <span
                        class="network-legend-line"
                        style="background:${linkColor(type)}"
                    ></span>

                    <span>${type}</span>
                `
            );

        const sizeSection = legend
            .append("div")
            .attr("class", "legend-section");

        sizeSection
            .append("h3")
            .text("Size encodings");

        sizeSection
            .append("p")
            .attr("class", "legend-explanation")
            .text(
                "Larger nodes indicate greater daily transaction volume. " +
                "Thicker links indicate greater transaction amounts."
            );
    }

    createNetworkLegend();
    showDay(1);
}
