export const getProductsQuery = `#graphql
      query getProducts($first: Int, $after: String, $last: Int, $before: String) {
      products(first: $first, after: $after, last: $last, before: $before) {
        pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
        }
        edges {
        node {
          id
          title
          handle
          status
          tags
          totalInventory
          variants(first: 10) {
          edges {
            node {
            id
            price

            createdAt
            }
          }
          }
          images(first: 10) {
          edges {
            node {
            id
            originalSrc
            altText
            }
          }
          }
          media(first: 10) {
          edges {
            node {
            id
            mediaContentType
            preview {
              image {
                id
                url
              }
              status

            }
            }
          }
          }
        }
        }
      }
      }`;
