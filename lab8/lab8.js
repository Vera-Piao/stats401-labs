function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderCorpusSummary(summary) {
    const metrics = [
        { label: "Raw passages", value: d3.format(",")(summary.raw_passages) },
        { label: "Clean passages", value: d3.format(",")(summary.clean_passages) },
        { label: "Average words", value: d3.format(".1f")(summary.average_words) },
        { label: "Formal sections", value: summary.formal_sections }
    ];

    const cards = d3.select("#lab8-corpus-stats")
        .selectAll("article")
        .data(metrics)
        .join("article");

    cards.append("strong")
        .text(d => d.value);

    cards.append("span")
        .text(d => d.label);
}

function renderSectionChart(selector, rows, field, unit) {
    const data = [...rows].sort((a, b) => {
        const aNumber = +(a.section.match(/^Part (\d+):/)?.[1] || 999);
        const bNumber = +(b.section.match(/^Part (\d+):/)?.[1] || 999);
        return aNumber - bNumber;
    });

    const width = 500;
    const rowHeight = 26;
    const margin = { top: 8, right: 54, bottom: 24, left: 72 };
    const height = margin.top + data.length * rowHeight + margin.bottom;
    const maxValue = d3.max(data, d => d[field]) || 1;

    const svg = d3.select(selector)
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height);

    const x = d3.scaleLinear()
        .domain([0, maxValue])
        .nice()
        .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
        .domain(data.map(d => d.section))
        .range([margin.top, height - margin.bottom])
        .padding(0.22);

    svg.append("g")
        .attr("class", "lab8-summary-axis")
        .attr("transform", "translate(0," + (height - margin.bottom) + ")")
        .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

    svg.append("g")
        .selectAll("text")
        .data(data)
        .join("text")
        .attr("class", "lab8-summary-label")
        .attr("x", margin.left - 8)
        .attr("y", d => y(d.section) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(d => d.section.match(/^Part \d+/)?.[0] || d.section);

    svg.append("g")
        .selectAll("rect")
        .data(data)
        .join("rect")
        .attr("class", "lab8-summary-bar")
        .attr("x", margin.left)
        .attr("y", d => y(d.section))
        .attr("width", d => Math.max(1, x(d[field]) - margin.left))
        .attr("height", y.bandwidth())
        .append("title")
        .text(d => d.section + ": " + d3.format(field === "average_words" ? ".1f" : ",")(d[field]) + " " + unit);

    svg.append("g")
        .selectAll("text")
        .data(data)
        .join("text")
        .attr("class", "lab8-summary-value")
        .attr("x", d => x(d[field]) + 5)
        .attr("y", d => y(d.section) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text(d => d3.format(field === "average_words" ? ".0f" : ",")(d[field]));
}

function renderTopTerms(terms) {
    d3.select("#lab8-top-terms")
        .selectAll("span")
        .data(terms)
        .join("span")
        .text((d, index) => (index + 1) + ". " + d.term);
}

function renderClusterSummary(clusters, color) {
    const cards = d3.select("#lab8-cluster-summary")
        .selectAll("article")
        .data(clusters.sort((a, b) => a.cluster - b.cluster))
        .join("article")
        .attr("class", "lab8-cluster-card")
        .style("border-top-color", d => color(d.cluster_name));

    cards.append("p")
        .attr("class", "lab8-cluster-index")
        .text(d => "Cluster " + d.cluster + " · " + d3.format(",")(d.passage_count) + " passages");

    cards.append("h3")
        .text(d => d.cluster_name);

    cards.append("p")
        .attr("class", "lab8-cluster-terms")
        .text(d => d.top_terms);
}

Promise.all([
    d3.csv(
        "../data/lab8_embedding_map.csv",
        row => ({
            ...row,
            page: +row.page,
            word_count: +row.word_count,
            cluster: +row.cluster,
            x: +row.x,
            y: +row.y
        })
    ),
    d3.csv(
        "../data/lab8_topic_section_matrix.csv",
        row => ({
            section: row.section,
            topic: row.cluster_name,
            count: +row.count
        })
    ),
    d3.csv(
        "../data/lab8_corpus_summary.csv",
        row => ({
            raw_passages: +row.raw_passages,
            clean_passages: +row.clean_passages,
            average_words: +row.average_words,
            formal_sections: +row.formal_sections
        })
    ),
    d3.csv(
        "../data/lab8_section_summary.csv",
        row => ({
            section: row.section,
            passage_count: +row.passage_count,
            average_words: +row.average_words
        })
    ),
    d3.csv(
        "../data/lab8_top_terms.csv",
        row => ({
            term: row.term,
            mean_tfidf: +row.mean_tfidf
        })
    ),
    d3.csv(
        "../data/lab8_cluster_summary.csv",
        row => ({
            cluster: +row.cluster,
            cluster_name: row.cluster_name,
            passage_count: +row.passage_count,
            top_terms: row.top_terms
        })
    )
])
    .then(([
        rawData,
        exportedMatrix,
        corpusSummary,
        sectionSummary,
        topTerms,
        clusterSummary
    ]) => {
        const data = rawData.map(d => ({
            ...d,
            section: d.section && d.section.trim()
                ? d.section.trim()
                : "Unknown Section",
            neighbor_ids: d.neighbor_ids
                ? d.neighbor_ids.split("|").filter(Boolean)
                : []
        }));

        const dataById = new Map(data.map(d => [d.passage_id, d]));
        const topicOrder = new Map(
            clusterSummary.map(d => [d.cluster_name, d.cluster])
        );
        const topics = Array.from(new Set(data.map(d => d.cluster_name)))
            .sort((a, b) => topicOrder.get(a) - topicOrder.get(b));
        const sectionNumber = section => {
            const match = section.match(/^Part (\d+):/);
            return match ? +match[1] : Number.MAX_SAFE_INTEGER;
        };
        const sections = Array.from(new Set(data.map(d => d.section)))
            .sort((a, b) => sectionNumber(a) - sectionNumber(b));

        const color = d3.scaleOrdinal()
            .domain(topics)
            .range(d3.schemeTableau10);

        renderCorpusSummary(corpusSummary[0]);
        renderSectionChart(
            "#section-count-chart",
            sectionSummary,
            "passage_count",
            "passages"
        );
        renderSectionChart(
            "#section-length-chart",
            sectionSummary,
            "average_words",
            "words"
        );
        renderTopTerms(topTerms);
        renderClusterSummary(clusterSummary, color);

        const tooltip = d3.select("#lab8-tooltip");
        const detailPanel = d3.select("#lab8-detail-panel");
        const status = d3.select("#lab8-status");

        const searchInput = d3.select("#lab8-search");
        const sectionFilter = d3.select("#lab8-section-filter");
        const topicFilter = d3.select("#lab8-topic-filter");

        let selectedPassage = null;
        let neighborIds = new Set();
        let activeCell = null;

        sectionFilter
            .selectAll("option.section-option")
            .data(sections)
            .join("option")
            .attr("class", "section-option")
            .attr("value", d => d)
            .text(d => d);

        topicFilter
            .selectAll("option.topic-option")
            .data(topics)
            .join("option")
            .attr("class", "topic-option")
            .attr("value", d => d)
            .text(d => d);

        const width = 900;
        const height = 600;
        const margin = { top: 25, right: 25, bottom: 25, left: 25 };

        const svg = d3.select("#semantic-map")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("role", "img")
            .attr("aria-label", "Semantic embedding map of bulletin passages");

        svg.append("defs")
            .append("clipPath")
            .attr("id", "semantic-map-clip")
            .append("rect")
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom);

        const zoomLayer = svg.append("g")
            .attr("clip-path", "url(#semantic-map-clip)");

        const plot = zoomLayer.append("g");

        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .nice()
            .range([margin.left, width - margin.right]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .nice()
            .range([height - margin.bottom, margin.top]);

        const radiusScale = d3.scaleSqrt()
            .domain(d3.extent(data, d => d.word_count))
            .range([2.8, 8.5]);

        const points = plot
            .selectAll("circle")
            .data(data, d => d.passage_id)
            .join("circle")
            .attr("class", "passage")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", d => radiusScale(d.word_count))
            .attr("fill", d => color(d.cluster_name))
            .attr("tabindex", 0)
            .attr("aria-label", d => `${d.cluster_name}, page ${d.page}`);

        // Task 12: details, search, filtering, zoom, and pan.

        function showTooltip(event, html) {
            tooltip
                .html(html)
                .style("left", `${event.clientX + 15}px`)
                .style("top", `${event.clientY + 15}px`)
                .style("display", "block")
                .style("opacity", 1);
        }

        function hideTooltip() {
            tooltip
                .style("display", "none")
                .style("opacity", 0);
        }

        function passageTooltip(d) {
            const preview = d.text.length > 280
                ? `${d.text.slice(0, 280)}...`
                : d.text;

            return `
                <strong>${escapeHtml(d.cluster_name)}</strong><br>
                ${escapeHtml(d.section)} · Page ${d.page} · ${d.word_count} words<br><br>
                ${escapeHtml(preview)}
            `;
        }

        points
            .on("mouseover", function(event, d) {
                d3.select(this).classed("is-hovered", true);
                showTooltip(event, passageTooltip(d));
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", `${event.clientX + 15}px`)
                    .style("top", `${event.clientY + 15}px`);
            })
            .on("mouseout", function() {
                d3.select(this).classed("is-hovered", false);
                hideTooltip();
            })
            .on("click", function(event, d) {
                event.stopPropagation();
                selectPassage(d);
            })
            .on("keydown", function(event, d) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPassage(d);
                }
            });

        // Task 13: use the cosine-similarity neighbor IDs exported by Python.

        function nearestPassages(d, count = 5) {
            return d.neighbor_ids
                .map(id => dataById.get(id))
                .filter(Boolean)
                .slice(0, count);
        }

        function renderDetails(d, neighbors) {
            const neighborItems = neighbors.map(neighbor => {
                const preview = neighbor.text.length > 120
                    ? `${neighbor.text.slice(0, 120)}...`
                    : neighbor.text;

                return `
                    <button class="lab8-neighbor" data-passage-id="${escapeHtml(neighbor.passage_id)}">
                        <span>${escapeHtml(neighbor.cluster_name)} · Page ${neighbor.page}</span>
                        ${escapeHtml(preview)}
                    </button>
                `;
            }).join("");

            detailPanel.html(`
                <h3>${escapeHtml(d.cluster_name)}</h3>
                <dl class="lab8-metadata">
                    <div><dt>Chapter</dt><dd>${escapeHtml(d.chapter || "Not available")}</dd></div>
                    <div><dt>Formal section</dt><dd>${escapeHtml(d.section)}</dd></div>
                    <div><dt>Subsection</dt><dd>${escapeHtml(d.subsection || "Not available")}</dd></div>
                    <div><dt>Page</dt><dd>${d.page}</dd></div>
                    <div><dt>Semantic topic</dt><dd>${escapeHtml(d.cluster_name)}</dd></div>
                    <div><dt>Words</dt><dd>${d.word_count}</dd></div>
                    <div><dt>Passage ID</dt><dd>${escapeHtml(d.passage_id)}</dd></div>
                </dl>
                <h4>Original passage</h4>
                <p class="lab8-detail-text">${escapeHtml(d.text)}</p>
                <h4>Five nearest semantic neighbors</h4>
                <div class="lab8-neighbor-list">${neighborItems}</div>
            `);

            detailPanel
                .selectAll(".lab8-neighbor")
                .on("click", function() {
                    const neighbor = dataById.get(this.dataset.passageId);
                    if (neighbor) selectPassage(neighbor);
                });
        }

        function selectPassage(d) {
            selectedPassage = d;
            const neighbors = nearestPassages(d);
            neighborIds = new Set(neighbors.map(neighbor => neighbor.passage_id));
            renderDetails(d, neighbors);
            updatePointStyles();
            updateMatrixStyles();
        }

        const zoom = d3.zoom()
            .scaleExtent([0.7, 8])
            .on("zoom", event => {
                plot.attr("transform", event.transform);
            });

        svg.call(zoom);

        function currentFilters() {
            return {
                query: searchInput.property("value").toLowerCase().trim(),
                section: sectionFilter.property("value"),
                topic: topicFilter.property("value")
            };
        }

        function matchesFilters(d) {
            const filters = currentFilters();
            const searchable = `${d.text} ${d.section} ${d.cluster_name}`.toLowerCase();
            const matchesSearch = !filters.query || searchable.includes(filters.query);
            const matchesSection = filters.section === "all" || d.section === filters.section;
            const matchesTopic = filters.topic === "all" || d.cluster_name === filters.topic;
            const matchesCell = !activeCell || (
                d.section === activeCell.section &&
                d.cluster_name === activeCell.topic
            );

            return matchesSearch && matchesSection && matchesTopic && matchesCell;
        }

        function updatePointStyles() {
            const visibleCount = data.filter(matchesFilters).length;

            points
                .classed("is-selected", d => selectedPassage?.passage_id === d.passage_id)
                .classed("is-neighbor", d => neighborIds.has(d.passage_id))
                .classed("is-filtered-out", d => !matchesFilters(d))
                .attr("r", d => {
                    const baseRadius = radiusScale(d.word_count);
                    if (selectedPassage?.passage_id === d.passage_id) {
                        return baseRadius + 3.5;
                    }
                    if (neighborIds.has(d.passage_id)) {
                        return baseRadius + 2;
                    }
                    return baseRadius;
                });

            const cellText = activeCell
                ? ` · Matrix selection: ${activeCell.section} / ${activeCell.topic}`
                : "";

            status.text(`${visibleCount} of ${data.length} passages shown${cellText}`);
        }

        function updateAllFilters() {
            updatePointStyles();
            updateMatrixStyles();
        }

        searchInput.on("input", updateAllFilters);
        sectionFilter.on("change", updateAllFilters);
        topicFilter.on("change", updateAllFilters);

        d3.select("#lab8-reset").on("click", () => {
            searchInput.property("value", "");
            sectionFilter.property("value", "all");
            topicFilter.property("value", "all");
            selectedPassage = null;
            neighborIds = new Set();
            activeCell = null;

            detailPanel.html(`
                <h3>Passage details</h3>
                <p class="lab8-empty-state">
                    Select a point to inspect its topic, formal section, original text, and nearest neighbors.
                </p>
            `);

            svg.transition()
                .duration(450)
                .call(zoom.transform, d3.zoomIdentity);

            updateAllFilters();
        });

        const legend = d3.select("#lab8-legend")
            .selectAll("button")
            .data(topics)
            .join("button")
            .attr("type", "button")
            .attr("class", "lab8-legend-item")
            .on("click", (_, topic) => {
                topicFilter.property(
                    "value",
                    topicFilter.property("value") === topic ? "all" : topic
                );
                updateAllFilters();
            });

        legend.append("span")
            .attr("class", "lab8-legend-swatch")
            .style("background", d => color(d));

        legend.append("span").text(d => d);

        const sizeValues = [
            d3.quantile(data, 0.2, d => d.word_count),
            d3.quantile(data, 0.5, d => d.word_count),
            d3.quantile(data, 0.8, d => d.word_count)
        ].map(Math.round);

        const sizeLegend = d3.select("#lab8-size-legend");

        sizeLegend.append("strong")
            .text("Passage length");

        const sizeItems = sizeLegend
            .selectAll("span.lab8-size-item")
            .data(sizeValues)
            .join("span")
            .attr("class", "lab8-size-item");

        sizeItems.append("i")
            .style("width", d => (radiusScale(d) * 2) + "px")
            .style("height", d => (radiusScale(d) * 2) + "px");

        sizeItems.append("span")
            .text(d => d + " words");

        // Task 14: render the exported Topic x Bulletin Section matrix.

        const exportedCounts = new Map(
            exportedMatrix.map(d => [`${d.section}\u0000${d.topic}`, d.count])
        );

        const matrixData = sections.flatMap(section =>
            topics.map(topic => ({
                section,
                topic,
                count: exportedCounts.get(`${section}\u0000${topic}`) || 0
            }))
        );

        const matrixWidth = 920;
        const matrixMargin = { top: 175, right: 20, bottom: 35, left: 280 };
        const matrixHeight = matrixMargin.top + sections.length * 36 + matrixMargin.bottom;

        const matrixSvg = d3.select("#topic-section-matrix")
            .append("svg")
            .attr("viewBox", `0 0 ${matrixWidth} ${matrixHeight}`)
            .attr("role", "img")
            .attr("aria-label", "Matrix of semantic topics by bulletin section");

        const matrixX = d3.scaleBand()
            .domain(topics)
            .range([matrixMargin.left, matrixWidth - matrixMargin.right])
            .padding(0.08);

        const matrixY = d3.scaleBand()
            .domain(sections)
            .range([matrixMargin.top, matrixHeight - matrixMargin.bottom])
            .padding(0.08);

        const maxCount = d3.max(matrixData, d => d.count) || 1;
        const intensity = d3.scaleSqrt().domain([0, maxCount]).range([0.08, 1]);

        matrixSvg.append("g")
            .selectAll("text")
            .data(topics)
            .join("text")
            .attr("class", "matrix-column-label")
            .attr("transform", d => `translate(${matrixX(d) + matrixX.bandwidth() / 2},${matrixMargin.top - 12}) rotate(-48)`)
            .attr("text-anchor", "start")
            .text(d => d);

        matrixSvg.append("g")
            .selectAll("text")
            .data(sections)
            .join("text")
            .attr("class", "matrix-row-label")
            .attr("x", matrixMargin.left - 10)
            .attr("y", d => matrixY(d) + matrixY.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(d => d.replace(/^Part \d+: /, ""));

        const cells = matrixSvg.append("g")
            .selectAll("rect")
            .data(matrixData)
            .join("rect")
            .attr("class", "matrix-cell")
            .attr("x", d => matrixX(d.topic))
            .attr("y", d => matrixY(d.section))
            .attr("width", matrixX.bandwidth())
            .attr("height", matrixY.bandwidth())
            .attr("rx", 4)
            .attr("fill", d => d.count === 0
                ? "#edf1f6"
                : d3.interpolateRgb("#f7f9fc", color(d.topic))(intensity(d.count)))
            .attr("tabindex", 0)
            .attr("aria-label", d => `${d.section}, ${d.topic}, ${d.count} passages`)
            .on("mouseover", function(event, d) {
                showTooltip(event, `
                    <strong>${escapeHtml(d.topic)}</strong><br>
                    ${escapeHtml(d.section)}<br>
                    ${d.count} passage${d.count === 1 ? "" : "s"}
                `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", `${event.clientX + 15}px`)
                    .style("top", `${event.clientY + 15}px`);
            })
            .on("mouseout", hideTooltip)
            .on("click", (_, d) => toggleMatrixCell(d))
            .on("keydown", (event, d) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleMatrixCell(d);
                }
            });

        matrixSvg.append("g")
            .selectAll("text")
            .data(matrixData.filter(d => d.count > 0))
            .join("text")
            .attr("class", "matrix-count")
            .attr("x", d => matrixX(d.topic) + matrixX.bandwidth() / 2)
            .attr("y", d => matrixY(d.section) + matrixY.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.count);

        // Task 15: coordinate matrix cells and semantic-map points.

        function toggleMatrixCell(d) {
            const isSameCell = activeCell &&
                activeCell.section === d.section &&
                activeCell.topic === d.topic;

            activeCell = isSameCell ? null : d;
            updateAllFilters();
        }

        function updateMatrixStyles() {
            if (!cells) return;

            cells
                .classed("is-active", d => Boolean(activeCell) &&
                    activeCell.section === d.section &&
                    activeCell.topic === d.topic)
                .classed("is-passage-cell", d => Boolean(selectedPassage) &&
                    selectedPassage.section === d.section &&
                    selectedPassage.cluster_name === d.topic)
                .classed("is-muted", d => {
                    const filters = currentFilters();
                    return (filters.section !== "all" && d.section !== filters.section) ||
                        (filters.topic !== "all" && d.topic !== filters.topic);
                });
        }

        updateAllFilters();
    })
    .catch(error => {
        console.error("Error loading Lab 8 embedding data:", error);

        d3.select("#semantic-map")
            .append("p")
            .attr("class", "error-message")
            .text("The Lab 8 data could not be loaded. Start a local web server from the Labs folder and try again.");
    });
