Promise.all([
    d3.csv(
        "../data/lab5_assignment_stations.csv",
        d => ({
            id: d.id,
            station_name: d.station_name,
            district: d.district,
            daily_passengers: +d.daily_passengers,
            station_type: d.station_type
        })
    ),

    d3.csv(
        "../data/lab5_assignment_routes.csv",
        d => ({
            source: d.source,
            target: d.target,
            travel_time_min: +d.travel_time_min,
            route_type: d.route_type
        })
    )
])
.then(([nodes, links]) => {

    console.log("Assignment stations:", nodes);
    console.log("Assignment routes:", links);

    const width = 900;
    const height = 700;

    const svg = d3.select("#assignment-network")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    const districts = Array.from(
        new Set(
            nodes.map(d => d.district)
        )
    );

    const districtColor = d3.scaleOrdinal()
        .domain(districts)
        .range(d3.schemeTableau10);

    const passengerScale = d3.scaleSqrt()
        .domain(
            d3.extent(
                nodes,
                d => d.daily_passengers
            )
        )
        .range([80, 500]);
    
    const symbolType = d3.scaleOrdinal()
        .domain([
            "Local",
            "Transfer",
            "Terminal"
        ])
        .range([
            d3.symbolCircle,
            d3.symbolSquare,
            d3.symbolTriangle
        ]);
    
    const travelTimeScale = d3.scaleLinear()
        .domain(
            d3.extent(
                links,
                d => d.travel_time_min
            )
        )
        .range([1, 6]);

    const routeTypes = Array.from(
        new Set(
            links.map(d => d.route_type)
        )
    );

    const routeColor = d3.scaleOrdinal()
        .domain(routeTypes)
        .range(d3.schemeSet2);

    const link = svg.append("g")
        .attr("class", "assignment-links")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr(
            "stroke",
            d => routeColor(d.route_type)
        )
        .attr(
            "stroke-width",
            d => travelTimeScale(
                d.travel_time_min
            )
        )
        .attr("stroke-opacity", 0.65);

    const node = svg.append("g")
        .attr("class", "assignment-nodes")
        .selectAll("path")
        .data(nodes)
        .join("path")
        .attr(
            "d",
            d => d3.symbol()
                .type(
                    symbolType(
                        d.station_type
                    )
                )
                .size(
                    passengerScale(
                        d.daily_passengers
                    )
                )()
        )
        .attr(
            "fill",
            d => districtColor(
                d.district
            )
        )
        .attr("stroke", "#333")
        .attr("stroke-width", 1);

    const simulation = d3.forceSimulation(nodes)
        .force(
            "link",
            d3.forceLink(links)
                .id(d => d.id)
                .distance(80)
        )
        .force(
            "charge",
            d3.forceManyBody()
                .strength(-180)
        )
        .force(
            "center",
            d3.forceCenter(
                width / 2,
                height / 2
            )
        )
        .force(
            "collision",
            d3.forceCollide()
                .radius(18)
        );

    simulation.on(
        "tick",
        () => {
            
            nodes.forEach(d => {
                d.x = Math.max(
                    20,
                    Math.min(width - 20, d.x)
                );

                d.y = Math.max(
                    20,
                    Math.min(height - 20, d.y)
                );
            });

            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr(
                "transform",
                d => `translate(${d.x},${d.y})`
            );
        }
    );

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

        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {

        if (!event.active) {
            simulation
                .alphaTarget(0);
        }

        d.fx = null;
        d.fy = null;
    }

    node.call(
        d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded)
    );

    function isConnected(nodeA, nodeB) {

        return links.some(
            link =>
                (
                    link.source.id === nodeA.id &&
                    link.target.id === nodeB.id
                )
                ||
                (
                    link.source.id === nodeB.id &&
                    link.target.id === nodeA.id
                )
        );
    }

    node.on(
        "mouseover.highlight",
        function(event, d) {

            node.attr(
                "opacity",
                other =>
                    (
                        other.id === d.id ||
                        isConnected(d, other)
                    )
                    ? 1
                    : 0.15
            );

            link.attr(
                "opacity",
                l =>
                    (
                        l.source.id === d.id ||
                        l.target.id === d.id
                    )
                    ? 1
                    : 0.1
            );
        }
    );

    node.on(
        "mouseout.highlight",
        function() {

            node.attr("opacity", 1);
            link.attr("opacity", 0.65);
        }
    );

    const tooltip =
        d3.select("#assignment-tooltip");

    node
        .on(
            "mouseover.tooltip",
            function(event, d) {

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.station_name}</strong>
                        <br>
                        District: ${d.district}
                        <br>
                        Daily Passengers: ${d.daily_passengers}
                        <br>
                        Station Type: ${d.station_type}
                    `);
            }
        )
        .on(
            "mousemove.tooltip",
            function(event) {

                tooltip
                    .style(
                        "left",
                        `${event.pageX + 10}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 10}px`
                    );
            }
        )
        .on(
            "mouseout.tooltip",
            function() {

                tooltip.style("opacity", 0);
            }
        );

    link
        .on(
            "mouseover.tooltip",
            function(event, d) {

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>Route</strong>
                        <br>
                        ${d.source.station_name}
                        →
                        ${d.target.station_name}
                        <br>
                        Travel Time: ${d.travel_time_min} min
                        <br>
                        Route Type: ${d.route_type}
                    `);
            }
        )
        .on(
            "mousemove.tooltip",
            function(event) {

                tooltip
                    .style(
                        "left",
                        `${event.pageX + 10}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 10}px`
                    );
            }
        )
        .on(
            "mouseout.tooltip",
            function() {

                tooltip.style("opacity", 0);
            }
        );

    const legend = d3.select("#assignment-legend")
        .append("svg")
        .attr("width", 900)
        .attr("height", 310);

    const districtLegend = legend.append("g")
        .attr(
            "transform",
            "translate(20,30)"
        );

    districtLegend.append("text")
        .text("District — Node Color")
        .attr("font-weight", "bold");

    districts.forEach(
        (district, i) => {

            districtLegend.append("circle")
                .attr("cx", 10)
                .attr("cy", 30 + i * 25)
                .attr("r", 7)
                .attr(
                    "fill",
                    districtColor(district)
                );

            districtLegend.append("text")
                .attr("x", 25)
                .attr("y", 34 + i * 25)
                .text(district);
        }
    );

    const stationTypeLegend = legend.append("g")
        .attr(
            "transform",
            "translate(200,30)"
        );

    stationTypeLegend.append("text")
        .text("Station Type — Node Shape")
        .attr("font-weight", "bold");

    const stationTypes = [
        "Local",
        "Transfer",
        "Terminal"
    ];

    stationTypes.forEach(
        (type, i) => {

            stationTypeLegend.append("path")
                .attr(
                    "d",
                    d3.symbol()
                        .type(symbolType(type))
                        .size(120)()
                )
                .attr(
                    "transform",
                    `translate(10,${30 + i * 30})`
                )
                .attr("fill", "#777");

            stationTypeLegend.append("text")
                .attr("x", 30)
                .attr("y", 34 + i * 30)
                .text(type);
        }
    );

    const routeLegend = legend.append("g")
        .attr(
            "transform",
            "translate(440,30)"
        );

    routeLegend.append("text")
        .text("Route Type — Link Color")
        .attr("font-weight", "bold");

    routeTypes.forEach(
        (type, i) => {

            routeLegend.append("line")
                .attr("x1", 0)
                .attr("x2", 35)
                .attr("y1", 30 + i * 25)
                .attr("y2", 30 + i * 25)
                .attr(
                    "stroke",
                    routeColor(type)
                )
                .attr("stroke-width", 4);

            routeLegend.append("text")
                .attr("x", 45)
                .attr("y", 34 + i * 25)
                .text(type);
        }
    );

    const passengerLegend = legend.append("g")
        .attr(
            "transform",
            "translate(20,180)"
        );

    passengerLegend.append("text")
        .text("Node Size — Daily Passengers")
        .attr("font-weight", "bold");

    passengerLegend.append("text")
        .attr("y", 25)
        .text(
            "Larger nodes represent stations with more daily passengers."
        );

    const travelLegend = legend.append("g")
        .attr(
            "transform",
            "translate(20,240)"
        );

    travelLegend.append("text")
        .text("Link Width — Travel Time")
        .attr("font-weight", "bold");

    travelLegend.append("text")
        .attr("y", 25)
        .text(
            "Thicker links represent longer travel times."
        );

    // Part B — Adjacency Matrix

    // Meaningful ordering:
    // first by district, then by station name
    const orderedNodes = [...nodes].sort(
        (a, b) =>
            d3.ascending(
                a.district,
                b.district
            )
            ||
            d3.ascending(
                a.station_name,
                b.station_name
            )
    );

    const matrixData = [];

    orderedNodes.forEach(
        rowNode => {

            orderedNodes.forEach(
                colNode => {

                    const foundLink =
                        links.find(
                            link =>
                                (
                                    link.source.id === rowNode.id &&
                                    link.target.id === colNode.id
                                )
                                ||
                                (
                                    link.source.id === colNode.id &&
                                    link.target.id === rowNode.id
                                )
                        );

                    matrixData.push({
                        row: rowNode.id,
                        col: colNode.id,

                        travel_time_min:
                            foundLink
                            ? foundLink.travel_time_min
                            : 0,

                        route_type:
                            foundLink
                            ? foundLink.route_type
                            : null
                    });
                }
            );
        }
    );

    const matrixSize = 750;

    const matrixX = d3.scaleBand()
        .domain(
            orderedNodes.map(d => d.id)
        )
        .range([0, matrixSize])
        .padding(0.02);

    const matrixY = d3.scaleBand()
        .domain(
            orderedNodes.map(d => d.id)
        )
        .range([0, matrixSize])
        .padding(0.02);

    const matrixSvg =
        d3.select("#assignment-matrix")
            .append("svg")
            .attr("width", 900)
            .attr("height", 900);

    const matrixGroup =
        matrixSvg.append("g")
            .attr(
                "transform",
                "translate(120,80)"
            );

    const matrixOpacity =
        d3.scaleLinear()
            .domain(
                d3.extent(
                    links,
                    d => d.travel_time_min
                )
            )
            .range([0.3, 1]);

    const cell = matrixGroup
        .selectAll("rect")
        .data(matrixData)
        .join("rect")
        .attr(
            "x",
            d => matrixX(d.col)
        )
        .attr(
            "y",
            d => matrixY(d.row)
        )
        .attr(
            "width",
            matrixX.bandwidth()
        )
        .attr(
            "height",
            matrixY.bandwidth()
        )
        .attr(
            "fill",
            d =>
                d.travel_time_min > 0
                ? routeColor(d.route_type)
                : "#f3f3f3"
        )
        .attr(
            "fill-opacity",
            d =>
                d.travel_time_min > 0
                ? matrixOpacity(
                    d.travel_time_min
                )
                : 1
        );


    // Row labels
    const rowLabels = matrixGroup.append("g")
        .selectAll("text")
        .data(orderedNodes)
        .join("text")
        .attr("x", -8)
        .attr(
            "y",
            d =>
                matrixY(d.id) +
                matrixY.bandwidth() / 2
        )
        .attr("text-anchor", "end")
        .attr(
            "dominant-baseline",
            "middle"
        )
        .attr("font-size", 8)
        .text(d => d.station_name);


    // Column labels
    const colLabels = matrixGroup.append("g")
        .selectAll("text")
        .data(orderedNodes)
        .join("text")
        .attr(
            "transform",
            d =>
                `translate(${
                    matrixX(d.id) +
                    matrixX.bandwidth() / 2
                },-8) rotate(-60)`
        )
        .attr("text-anchor", "start")
        .attr("font-size", 8)
        .text(d => d.station_name);


    // Matrix interaction
    cell
        .on(
            "mouseover.matrix",
            function(event, d) {

                if (d.travel_time_min === 0) {
                    return;
                }

                const rowStation =
                    nodes.find(
                        node => node.id === d.row
                    );

                const colStation =
                    nodes.find(
                        node => node.id === d.col
                    );

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>
                            ${rowStation.station_name}
                            ↔
                            ${colStation.station_name}
                        </strong>
                        <br>
                        Travel Time:
                        ${d.travel_time_min} min
                        <br>
                        Route Type:
                        ${d.route_type}
                    `);

                rowLabels.attr(
                    "font-weight",
                    node =>
                        node.id === d.row
                        ? "bold"
                        : "normal"
                );

                colLabels.attr(
                    "font-weight",
                    node =>
                        node.id === d.col
                        ? "bold"
                        : "normal"
                );
            }
        )
        .on(
            "mousemove.matrix",
            function(event, d) {

                if (d.travel_time_min === 0) {
                    return;
                }

                tooltip
                    .style(
                        "left",
                        `${event.pageX + 10}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 10}px`
                    );
            }
        )
        .on(
            "mouseout.matrix",
            function() {

                tooltip.style("opacity", 0);

                rowLabels.attr(
                    "font-weight",
                    "normal"
                );

                colLabels.attr(
                    "font-weight",
                    "normal"
                );
            }
        );


    // Matrix ordering explanation
    matrixSvg.append("text")
        .attr("x", 120)
        .attr("y", 20)
        .attr("font-size", 14)
        .attr("font-weight", "bold")
        .text(
            "Stations ordered by district, then station name"
        );
});