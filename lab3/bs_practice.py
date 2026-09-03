from bs4 import BeautifulSoup

html = """
<html>
<body>
    <h1>Book Store</h1>
    <p class="description">Welcome to our store.</p>
</body>
</html>
"""

soup = BeautifulSoup(html, "html.parser")

# Find by tag
heading = soup.find("h1")
print(heading.get_text(strip=True))

# Find by class
description = soup.find(
    "p",
    class_="description"
)

print(description.get_text(strip=True))

# Find multiple elements
books = soup.find_all(
    "div",
    class_="book"
)

for book in books:
    print(book.get_text(strip=True))