const createOrderMutatino = `#graphql
  mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      userErrors {
        field
        message
      }
      order {
        id
        totalTaxSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 5) {
          nodes {
            variant {
              id
            }
            id
            title
            quantity
            taxLines {
              title
              rate
              priceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }`;

const getCreateOrderMutationVariables = () => ({
  variables: {
    order: {
      test: true,
      currency: "EUR",
      lineItems: [
        {
          title: "Big Brown Bear Boots",
          priceSet: {
            shopMoney: {
              amount: 74.99,
              currencyCode: "EUR",
            },
          },
          quantity: 3,
          taxLines: [
            {
              priceSet: {
                shopMoney: {
                  amount: 13.5,
                  currencyCode: "EUR",
                },
              },
              rate: 0.06,
              title: "State tax",
            },
          ],
        },
      ],
      transactions: [
        {
          kind: "SALE",
          status: "SUCCESS",
          amountSet: {
            shopMoney: {
              amount: 238.47,
              currencyCode: "EUR",
            },
          },
        },
      ],
    },
    options: {
      inventoryBehaviour: "DECREMENT_OBEYING_POLICY",
    },
  },
});
