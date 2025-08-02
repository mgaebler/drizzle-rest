# API Specification: JSON-Server Dialect

To enable seamless migration from JSON-Server and maintain the familiar syntax, the adapter implements the **JSON-Server dialect** based on [JSON-Server v1.0.0-beta.3](https://github.com/typicode/json-server/releases/tag/v1.0.0-beta.3), with adaptations for relational database usage.

## Filtering

Filters are passed as direct query parameters. Multiple parameters are linked with **AND** by default.

  * **Example**: `GET /users?status=active&company_id=1`

The following operators are supported:

  * **Direct Equality**: `?status=active`
  * **Range Filters**: `?age_gte=18&age_lte=65`
  * **String Search**: `?name_like=John` (substring search)
  * **Negation**: `?status_ne=inactive`
  * **Array Membership**: `?id=1&id=2&id=3` (multiple IDs)

## Pagination

Pagination supports both page-based and range-based approaches:

* **Page-based**: `?_page=1&_per_page=25`
* **Range-based**: `?_start=10&_end=20` or `?_start=10&_limit=10`
* **Default**: `_per_page=10` if not specified

## Sorting

Sorting supports multiple fields with comma separation:

* **Syntax**: `?_sort=field1,field2,-field3`
* **Descending**: Use `-` prefix (e.g., `-created_at`)
* **Example**: `GET /users?_sort=name,-created_at`

## HTTP Methods

All standard REST methods are supported:

* `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
* **PUT**: Complete resource replacement
* **PATCH**: Partial resource update

## Design Decision: Nested and Array Fields

**Status**: **Not Implemented**

While the original JSON-Server specification includes nested and array field access (`?user.name=John`, `?tags[0]=javascript`), this feature has been **intentionally excluded** from the Drizzle REST Adapter for the following reasons:

### Implementation Complexity vs Value

* Nested field support would require complex PostgreSQL JSON operators
* Would only be useful for schemas with JSON/JSONB columns (edge case)
* Adds significant complexity to type safety and query generation
* Alternative solutions (`_embed` for relationships) provide better relational patterns

### Alternative: Use Embed for Relationships

Instead of nested field access, use the `_embed` parameter for relational data:

```bash
GET /posts?_embed=author
GET /authors?name=John  # Get author ID first
GET /posts?authorId=123 # Then filter posts
```

This design decision keeps the adapter focused on relational database best practices while maintaining JSON-Server compatibility for the most commonly used features.

## Dynamic Handlers Specification

The generated handlers implement the following features:

  * **getMany**: Processes query parameters for **filtering**, **sorting**, and **pagination** according to the **JSON-Server dialect** and dynamically builds the Drizzle query.

  * **getOne**: Processes the `:id` parameter and returns a `404` error if not found. Supports the `?select=` parameter for selecting specific columns.

  * **createOne**: Validates the body against the dynamically created Zod schema (`400` error on failure) and returns `201 Created` on success.

  * **updateOne (as PATCH)**: Validates the partial body and returns the updated object on success (`404` if not found).

  * **deleteOne**: Deletes the record and returns `204 No Content` (`404` if not found).
