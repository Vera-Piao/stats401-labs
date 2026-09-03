d3.csv("../data/lab3_data.csv")
    .then(data => {

        data.forEach(d => {
            d.pickrate = +d.pickrate;
            d.winrate = +d.winrate;
            d.banrate = +d.banrate;
        });

        const columns = data.columns;

        let currentColumn = null;
        let ascending = true;

        const table = d3.select("#data-table");

        const header = table
            .select("thead")
            .append("tr");

        header.selectAll("th")
            .data(columns)
            .join("th")
            .text(d => d)
            .on("click", function(event, column) {

                if (currentColumn === column) {
                    ascending = !ascending;
                } else {
                    currentColumn = column;
                    ascending = true;
                }

                data.sort((a, b) =>
                    ascending
                        ? d3.ascending(a[column], b[column])
                        : d3.descending(a[column], b[column])
                );

                updateRows();
            });

        function updateRows() {

            const rows = table
                .select("tbody")
                .selectAll("tr")
                .data(data);

            rows.join("tr")
                .selectAll("td")
                .data(row =>
                    columns.map(column => row[column])
                )
                .join("td")
                .text(d => d);
        }

        updateRows();

    })
    .catch(error => {
        console.error(
            "Error loading Overwatch data:",
            error
        );
    });