const width = 900;
const height = 520;

const margin = {
    top: 24,
    right: 24,
    bottom: 72,
    left: 72
};

const sentiments = [
    "Negative",
    "Neutral",
    "Positive"
];

const colors = {
    Negative: "#b85c5c",
    Neutral: "#8996a8",
    Positive: "#2f6fb0"
};

const monthFormatter = d3.timeFormat("%b");
const parseMonth = d3.timeParse("%Y-%m");
const percentFormatter = d3.format(".0%");

const tooltip = d3.select("#chart-tooltip");


async function drawSentimentChart() {
    try {
        const rawData = await d3.csv(
            "../data/sentiment_by_month.csv",
            d => ({
                month: d.month,
                sentiment: d.sentiment,
                count: +d.count,
                monthlyTotal: +d.monthly_total,
                proportion: +d.proportion
            })
        );

        console.log("Monthly sentiment data:", rawData);

        const groupedData = d3.group(
            rawData,
            d => d.month
        );

        const data = Array.from(
            groupedData,
            ([month, rows]) => {
                const record = {
                    month,
                    monthDate: parseMonth(month),
                    monthlyTotal: rows[0].monthlyTotal
                };

                sentiments.forEach(sentiment => {
                    const row = rows.find(
                        d => d.sentiment === sentiment
                    );

                    record[sentiment] = row
                        ? row.proportion
                        : 0;

                    record[`${sentiment}Count`] = row
                        ? row.count
                        : 0;
                });

                return record;
            }
        ).sort(
            (a, b) => d3.ascending(
                a.monthDate,
                b.monthDate
            )
        );

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([
                margin.left,
                width - margin.right
            ])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([
                height - margin.bottom,
                margin.top
            ]);

        const colorScale = d3.scaleOrdinal()
            .domain(sentiments)
            .range(sentiments.map(d => colors[d]));

        const stack = d3.stack()
            .keys(sentiments);

        const stackedData = stack(data);

        const svg = d3.select("#sentiment-chart")
            .append("svg")
            .attr(
                "viewBox",
                `0 0 ${width} ${height}`
            )
            .attr("role", "img")
            .attr(
                "aria-labelledby",
                "sentiment-svg-title sentiment-svg-description"
            );

        svg.append("title")
            .attr("id", "sentiment-svg-title")
            .text("Monthly Tweet Sentiment in 2017");

        svg.append("desc")
            .attr("id", "sentiment-svg-description")
            .text(
                "A normalized stacked bar chart showing the " +
                "percentage of negative, neutral, and positive " +
                "original tweets in each month of 2017."
            );

        // Horizontal grid lines
        svg.append("g")
            .attr("class", "sentiment-grid")
            .attr(
                "transform",
                `translate(${margin.left}, 0)`
            )
            .call(
                d3.axisLeft(yScale)
                    .tickValues([
                        0,
                        0.25,
                        0.5,
                        0.75,
                        1
                    ])
                    .tickSize(
                        -(width
                            - margin.left
                            - margin.right)
                    )
                    .tickFormat("")
            );

        // X-axis
        svg.append("g")
            .attr("class", "sentiment-axis")
            .attr(
                "transform",
                `translate(0, ${
                    height - margin.bottom
                })`
            )
            .call(
                d3.axisBottom(xScale)
                    .tickFormat(month => (
                        monthFormatter(
                            parseMonth(month)
                        )
                    ))
                    .tickSizeOuter(0)
            );

        // Y-axis
        svg.append("g")
            .attr("class", "sentiment-axis")
            .attr(
                "transform",
                `translate(${margin.left}, 0)`
            )
            .call(
                d3.axisLeft(yScale)
                    .tickValues([
                        0,
                        0.25,
                        0.5,
                        0.75,
                        1
                    ])
                    .tickFormat(percentFormatter)
                    .tickSizeOuter(0)
            );

        // Y-axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text("Share of Tweets");

        const layers = svg.selectAll(
            ".sentiment-layer"
        )
            .data(stackedData)
            .join("g")
            .attr("class", "sentiment-layer")
            .attr(
                "fill",
                d => colorScale(d.key)
            );

        layers.selectAll(".sentiment-segment")
            .data(layer => (
                layer.map(segment => ({
                    ...segment,
                    sentiment: layer.key
                }))
            ))
            .join("rect")
            .attr("class", "sentiment-segment")
            .attr(
                "x",
                d => xScale(d.data.month)
            )
            .attr(
                "y",
                d => yScale(d[1])
            )
            .attr(
                "width",
                xScale.bandwidth()
            )
            .attr(
                "height",
                d => yScale(d[0]) - yScale(d[1])
            )
            .on("mouseover", function(event, d) {
                const count = (
                    d.data[`${d.sentiment}Count`]
                );

                d3.select(this)
                    .classed("is-active", true);

                tooltip
                    .attr("aria-hidden", "false")
                    .style("opacity", 1)
                    .html(`
                        <strong>
                            ${monthFormatter(
                                d.data.monthDate
                            )} 2017
                        </strong><br>
                        Sentiment: ${d.sentiment}<br>
                        Tweets: ${count}<br>
                        Share: ${
                            percentFormatter(
                                d[1] - d[0]
                            )
                        }<br>
                        Monthly total: ${
                            d.data.monthlyTotal
                        }
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style(
                        "left",
                        `${event.pageX + 12}px`
                    )
                    .style(
                        "top",
                        `${event.pageY + 12}px`
                    );
            })
            .on("mouseout", function() {
                d3.select(this)
                    .classed("is-active", false);

                tooltip
                    .attr("aria-hidden", "true")
                    .style("opacity", 0);
            });

        drawLegend(colorScale);
    } catch (error) {
        console.error(
            "Unable to load sentiment data:",
            error
        );

        d3.select("#sentiment-chart")
            .append("p")
            .attr("class", "error-message")
            .text(
                "The sentiment chart could not load. " +
                "Please run the site from a local web server."
            );
    }
}


function drawLegend(colorScale) {
    const legend = d3.select(
        "#sentiment-legend"
    );

    const items = legend
        .selectAll(".sentiment-legend-item")
        .data(sentiments)
        .join("div")
        .attr(
            "class",
            "sentiment-legend-item"
        );

    items.append("span")
        .attr(
            "class",
            "sentiment-legend-swatch"
        )
        .style(
            "background-color",
            d => colorScale(d)
        );

    items.append("span")
        .text(d => d);
}


drawSentimentChart();