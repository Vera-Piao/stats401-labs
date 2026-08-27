const width = 900;
const height = 460;
const margin = { top: 20, right: 20, bottom: 78, left: 20 };

async function drawChart() {
    try {
        const data = await d3.csv("../data/students.csv", d => ({
            name: d.name,
            score: +d.score
        }));

        console.log("Student data:", data);
        console.log("Score data type:", typeof data[0].score);

        const x = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([margin.left, width - margin.right])
            .padding(0.24);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([height - margin.bottom, margin.top]);

        const svg = d3.select("#chart")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-labelledby", "chart-title chart-description");

        svg.append("title")
            .attr("id", "chart-title")
            .text("Student Scores");

        svg.append("desc")
            .attr("id", "chart-description")
            .text("A bar chart showing the score for each of eight students.");

        svg.append("line")
            .attr("class", "chart-baseline")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", y(0))
            .attr("y2", y(0));

        svg.selectAll("rect")
            .data(data)
            .join("rect")
            .attr("class", "data-bar")
            .attr("x", d => x(d.name))
            .attr("y", d => y(d.score))
            .attr("width", x.bandwidth())
            .attr("height", d => y(0) - y(d.score))
            .append("title")
            .text(d => `${d.name}: ${d.score}`);

        svg.selectAll(".student-name")
            .data(data)
            .join("text")
            .attr("class", "student-name")
            .attr("x", d => x(d.name) + x.bandwidth() / 2)
            .attr("y", y(0) + 24)
            .attr("text-anchor", "middle")
            .text(d => d.name);

        svg.selectAll(".student-score")
            .data(data)
            .join("text")
            .attr("class", "student-score")
            .attr("x", d => x(d.name) + x.bandwidth() / 2)
            .attr("y", y(0) + 46)
            .attr("text-anchor", "middle")
            .text(d => `Score: ${d.score}`);
    } catch (error) {
        console.error("Unable to load student data:", error);

        d3.select("#chart")
            .append("p")
            .attr("class", "error-message")
            .text("The chart could not load. Please run this site from a local web server.");
    }
}

drawChart();
