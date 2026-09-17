d3.json(
    "../data/lab6_small_hierarchy.json"
)
.then(data => {

    console.log(data);

    const root = d3.hierarchy(data);

    console.log(root);

    console.log(
    root.descendants()
    );

    root.sum(
    d => d.value || 0
    );

    console.log(
    root.value
    );

    const width = 1000;
    const height = 650;

    const treeLayout = d3.tree()
        .size([
            height - 100,
            width - 250
        ]);

    treeLayout(root);

    const treeSvg = d3.select(
        "#tree"
    )
    .append("svg")
    .attr("width", width)
    .attr("height", height);

    const treeGroup = treeSvg
        .append("g")
        .attr(
            "transform",
            "translate(100,50)"
        );

    
    function updateTree() {

        treeLayout(root);

        treeGroup
            .selectAll(".link")
            .data(
                root.links()
            )
            .join("path")
            .attr(
                "class",
                "link"
            )
            .attr(
                "fill",
                "none"
            )
            .attr(
                "stroke",
                "#999"
            )
            .attr(
                "d",
                d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x)
            );


        const nodes = treeGroup
            .selectAll(".node")
            .data(
                root.descendants()
            )
            .join("g")
            .attr(
                "class",
                "node"
            )
            .attr(
                "transform",
                d =>
                    `translate(
                        ${d.y},
                        ${d.x}
                    )`
            );


        nodes.selectAll("circle")
            .data(d => [d])
            .join("circle")
            .attr("r", 6)
            .attr(
                "fill",
                d =>
                    d.children
                    ? "steelblue"
                    : "orange"
            );


        nodes.selectAll("text")
            .data(d => [d])
            .join("text")
            .attr("x", 10)
            .attr("dy", "0.35em")
            .text(
                d => d.data.name
            );


        nodes.on(
            "click",
            toggleNode
        );
    }


    function toggleNode(
        event,
        d
    ) {

        if (d.children) {

            d._children =
                d.children;

            d.children = null;

        } else {

            d.children =
                d._children;

            d._children = null;
        }

        updateTree();
    }


    updateTree();

    const treemapRoot =
        d3.hierarchy(data)
        .sum(
            d => d.value || 0
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );
    
    const treemapWidth = 900;
    const treemapHeight = 550;

    const treemapLayout =
        d3.treemap()
        .size([
            treemapWidth,
            treemapHeight
        ])
        .paddingInner(2)
        .paddingOuter(4);

    treemapLayout(
        treemapRoot
    );

    const treemapSvg =
        d3.select("#treemap")
        .append("svg")
        .attr(
            "width",
            treemapWidth
        )
        .attr(
            "height",
            treemapHeight
        );

    const leaves =
        treemapRoot.leaves();

    const cell =
        treemapSvg
        .selectAll(".cell")
        .data(leaves)
        .join("g")
        .attr(
            "class",
            "cell"
        )
        .attr(
            "transform",
            d =>
                `translate(
                    ${d.x0},
                    ${d.y0}
                )`
        );

    cell.append("rect")
        .attr(
            "width",
            d => d.x1 - d.x0
        )
        .attr(
            "height",
            d => d.y1 - d.y0
        )
        .attr(
            "fill",
            "steelblue"
        );

    cell.append("text")
        .attr("x", 5)
        .attr("y", 18)
        .text(
            d => d.data.name
        );

    function getContinent(d) {

        let current = d;

        while (
            current.depth > 1
        ) {
            current = current.parent;
        }

        return current.data.name;
    }

    const continents = [
        "North America",
        "Europe",
        "Asia"
    ];

    const colorScale =
        d3.scaleOrdinal()
        .domain(continents)
        .range(
            d3.schemeTableau10
        );

    cell.select("rect")
        .attr(
            "fill",
            d =>
                colorScale(
                    getContinent(d)
                )
        );

    const tooltip =
        d3.select("#tooltip");

    cell
        .on(
            "mouseover",
            function(event, d) {

                tooltip
                    .style(
                        "opacity",
                        1
                    )
                    .html(`
                        <strong>
                            ${d.data.name}
                        </strong>
                        <br>
                        Population:
                        ${d.value}
                        thousand
                    `);
            }
        )
        .on(
            "mousemove",
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
            "mouseout",
            function() {

                tooltip.style(
                    "opacity",
                    0
                );
            }
        );

    // function zoomTo(d) {

    //     x.domain([
    //         d.x0,
    //         d.x1
    //     ]);

    //     y.domain([
    //         d.y0,
    //         d.y1
    //     ]);

    //     cells.transition()
    //         .duration(600)
    //         .attr(
    //             "transform",
    //             node =>
    //                 `translate(
    //                     ${x(node.x0)},
    //                     ${y(node.y0)}
    //                 )`
    //         );

    //     cells.select("rect")
    //         .transition()
    //         .duration(600)
    //         .attr(
    //             "width",
    //             node =>
    //                 x(node.x1) -
    //                 x(node.x0)
    //         )
    //         .attr(
    //             "height",
    //             node =>
    //                 y(node.y1) -
    //                 y(node.y0)
    //         );
    // }

    // const layout =
    //     d3.treemap()
    //     .tile(
    //         d3.treemapSquarify
    //     )
    //     .size([
    //         width,
    //         height
    //     ]);

    const layout =
        d3.treemap()
        .tile(
            d3.treemapBinary
        )
        .size([
            width,
            height
        ]);

    // const layout =
    //     d3.treemap()
    //     .tile(
    //         d3.treemapSliceDice
    //     )
    //     .size([
    //         width,
    //         height
    //     ]);
});

d3.json(
    "../data/lab6_assignment_gdp.json"
)
.then(data => {

    const gdpWidth = 900;
    const gdpHeight = 550;

    const squarifyRoot =
        d3.hierarchy(data)
        .sum(
            d => d.gdp || 0
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );

    const binaryRoot =
        d3.hierarchy(data)
        .sum(
            d => d.gdp || 0
        )
        .sort(
            (a, b) =>
                b.value - a.value
        );

    const squarifyLayout =
        d3.treemap()
        .tile(
            d3.treemapSquarify
        )
        .size([
            gdpWidth,
            gdpHeight
        ])
        .paddingInner(2)
        .paddingOuter(4);

    const binaryLayout =
        d3.treemap()
        .tile(
            d3.treemapBinary
        )
        .size([
            gdpWidth,
            gdpHeight
        ])
        .paddingInner(2)
        .paddingOuter(4);

    squarifyLayout(
        squarifyRoot
    );
    
    binaryLayout(
        binaryRoot
    );

    const statusColor =
        d3.scaleOrdinal()
        .domain([
            "Increase",
            "Unchanged",
            "Decrease"
        ])
        .range([
            "#4daf4a",
            "#999999",
            "#e41a1c"
        ]);

    function drawGdpTreemap(
        selector,
        root
    ) {

        const svg =
            d3.select(selector)
            .append("svg")
            .attr(
                "width",
                gdpWidth
            )
            .attr(
                "height",
                gdpHeight
            );


        const leaves =
            root.leaves();


        const cells =
            svg.selectAll(".gdp-cell")
            .data(leaves)
            .join("g")
            .attr(
                "class",
                "gdp-cell"
            )
            .attr(
                "transform",
                d =>
                    `translate(
                        ${d.x0},
                        ${d.y0}
                    )`
            );


        cells.append("rect")
            .attr(
                "width",
                d => d.x1 - d.x0
            )
            .attr(
                "height",
                d => d.y1 - d.y0
            )
            .attr(
                "fill",
                d =>
                    statusColor(
                        d.data.status
                    )
            )
            .attr(
                "stroke",
                "white"
            );


        // cells.append("text")
        //     .attr("x", 5)
        //     .attr("y", 18)
        //     .text(
        //         d => d.data.name
        //     );

        cells.append("text")
            .attr("x", 5)
            .attr("y", 18)
            .text(d => {
                const width =
                    d.x1 - d.x0;

                const height =
                    d.y1 - d.y0;

                return (
                    width > 55 &&
                    height > 25
                )
                    ? d.data.name
                    : "";
            });

        const tooltip =
            d3.select(
                "#gdp-tooltip"
            );


        cells
            .on(
                "mouseover",
                function(event, d) {

                    const area =
                        d.parent.data.name;

                    const continent =
                        d.parent
                        .parent
                        .data.name;

                    tooltip
                        .style(
                            "opacity",
                            1
                        )
                        .html(`
                            <strong>
                                ${d.data.name}
                            </strong>
                            <br>
                            Continent:
                            ${continent}
                            <br>
                            Area:
                            ${area}
                            <br>
                            GDP:
                            $${d.data.gdp}
                            billion
                            <br>
                            Status:
                            ${d.data.status}
                        `);
                }
            )
            .on(
                "mousemove",
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
                "mouseout",
                function() {

                    tooltip.style(
                        "opacity",
                        0
                    );
                }
            );

            }

    drawGdpTreemap(
        "#gdp-treemap-squarify",
        squarifyRoot
    );


    drawGdpTreemap(
        "#gdp-treemap-binary",
        binaryRoot
    );

    const legendData = [
        "Increase",
        "Unchanged",
        "Decrease"
    ];


    const legend =
        d3.select(
            "#gdp-legend"
        )
        .selectAll(
            ".legend-item"
        )
        .data(
            legendData
        )
        .join("div")
        .attr(
            "class",
            "legend-item"
        );


    legend.append("span")
        .style(
            "display",
            "inline-block"
        )
        .style(
            "width",
            "14px"
        )
        .style(
            "height",
            "14px"
        )
        .style(
            "margin-right",
            "6px"
        )
        .style(
            "background-color",
            d =>
                statusColor(d)
        );


    legend.append("span")
        .text(
            d => d
        );
});