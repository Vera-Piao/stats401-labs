const cityTooltip = d3.select("#city-tooltip");

d3.csv("../data/cities_multivariate.csv", d => ({
    city: d.city,
    population: +d.population,
    temp_c: +d.temp_c,
    development_level: d.development_level,
    region: d.region
}))
.then(cityData => {
    console.log("City data:", cityData);
    console.log(typeof cityData[0].population);
    console.log(typeof cityData[0].temp_c);
    const cityWidth = 900;
    const cityHeight = 620;

    const cityMargin = {
        top: 40,
        right: 180,
        bottom: 70,
        left: 175
    };

    const developmentOrder = {
        Low: 0,
        Medium: 1,
        High: 2
    };

    const sortedCityData = [...cityData].sort((a, b) => {
        return (
            developmentOrder[a.development_level] -
            developmentOrder[b.development_level]
        );
    });

    const populationScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(sortedCityData, d => d.population)
        ])
        .nice()
        .range([
            cityMargin.left,
            cityWidth - cityMargin.right
    ]);

    const cityScale = d3.scaleBand()
        .domain(sortedCityData.map(d => d.city))
        .range([
            cityMargin.top,
            cityHeight - cityMargin.bottom
        ])
        .padding(0.35);

    const citySvg = d3.select("#city-chart")
        .append("svg")
        .attr("width", cityWidth)
        .attr("height", cityHeight);
        
    citySvg.append("g")
        .attr(
            "transform",
            `translate(0, ${cityHeight - cityMargin.bottom})`
        )
        .call(d3.axisBottom(populationScale));

    citySvg.append("g")
        .attr(
            "transform",
            `translate(${cityMargin.left}, 0)`
        )
        .call(
            d3.axisLeft(cityScale)
                .tickFormat(cityName => {
                    const city = sortedCityData.find(
                        d => d.city === cityName
                    );

                    return `${cityName} · ${city.development_level}`;
                })
);

    citySvg.append("text")
        .attr("x", cityWidth / 2)
        .attr("y", cityHeight - 20)
        .attr("text-anchor", "middle")
        .text("Population (millions)");

    const regionScale = d3.scaleOrdinal()
        .domain([
            "North",
            "South",
            "East",
            "West"
        ])
        .range(d3.schemeTableau10);
    
    const temperatureScale = d3.scaleLinear()
        .domain(d3.extent(
            sortedCityData,
            d => d.temp_c
        ))
        .range([6, 14]);

    citySvg.selectAll(".city-stem")
        .data(sortedCityData)
        .join("line")
        .attr("class", "city-stem")
        .attr("x1", populationScale(0))
        .attr("x2", d => populationScale(d.population))
        .attr(
            "y1",
            d => cityScale(d.city) + cityScale.bandwidth() / 2
        )
        .attr(
            "y2",
            d => cityScale(d.city) + cityScale.bandwidth() / 2
        )
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 2);

    citySvg.selectAll(".city-point")
        .data(sortedCityData)
        .join("circle")
        .attr("class", "city-point")
        .attr(
         "cx",
            d => populationScale(d.population)
        )
        .attr(
            "cy",
            d => cityScale(d.city) + cityScale.bandwidth() / 2
        )
        .attr(
            "r",
            d => temperatureScale(d.temp_c)
        )
        .attr(
            "fill",
            d => regionScale(d.region)
        )
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("opacity", 0.9)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke", "#172033")
                .attr("stroke-width", 3);

            cityTooltip
                .style("opacity", 1)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`)
                .html(`
                    <strong>${d.city}</strong><br>
                    Population: ${d.population} million<br>
                    Temperature: ${d.temp_c}°C<br>
                    Development: ${d.development_level}<br>
                    Region: ${d.region}
                `);
        })
        .on("mousemove", function(event) {
            cityTooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("stroke", "white")
                .attr("stroke-width", 2);

            cityTooltip
                .style("opacity", 0);
        });


    const regionLegend = citySvg.append("g")
        .attr(
            "transform",
            `translate(${cityWidth - cityMargin.right + 25}, 50)`
        );

    regionLegend.append("text")
        .attr("font-weight", "bold")
        .text("Region");

    const regionItems = regionLegend
        .selectAll(".region-item")
        .data(regionScale.domain())
        .join("g")
        .attr("class", "region-item")
        .attr(
            "transform",
            (d, i) => `translate(0, ${30 + i * 28})`
        );

    regionItems.append("circle")
        .attr("r", 7)
        .attr("fill", d => regionScale(d));

    regionItems.append("text")
        .attr("x", 14)
        .attr("y", 4)
        .text(d => d);

    const temperatureLegendValues = [
        10.5,
        18,
        26
    ];

    const temperatureLegend = citySvg.append("g")
        .attr(
            "transform",
            `translate(${cityWidth - cityMargin.right + 25}, 220)`
        );

    temperatureLegend.append("text")
        .attr("font-weight", "bold")
        .text("Temperature");

    const temperatureItems = temperatureLegend
        .selectAll(".temperature-item")
        .data(temperatureLegendValues)
        .join("g")
        .attr("class", "temperature-item")
        .attr(
            "transform",
            (d, i) => `translate(0, ${35 + i * 45})`
        );

    temperatureItems.append("circle")
        .attr("cx", 14)
        .attr("r", d => temperatureScale(d))
        .attr("fill", "#94a3b8")
        .attr("opacity", 0.8);

    temperatureItems.append("text")
        .attr("x", 38)
        .attr("y", 4)
        .text(d => `${d}°C`);
});

