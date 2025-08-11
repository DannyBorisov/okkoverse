import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Box,
  InlineStack,
  Pagination,
  IndexTable,
  useIndexResourceState,
  Image,
  Button,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

const AdminShopName = `dannys-test-store.myshopify.com`;

function normalizeProduct(product: any) {
  return {
    id: product.id.replace("gid://shopify/Product/", ""),
    title: product.title,
    handle: product.handle,
    status: product.status,
    price: product.variants.edges[0].node.price,
    inventory: product.totalInventory,
    tags: product.tags,
    preview: product.media.edges.map((edge: any) =>
      normalizeMedia(edge.node),
    )[0],
    variants: product.variants.edges.map((edge: any) =>
      normalizeVariant(edge.node),
    ),
  };
}

function normalizeMedia(media: any) {
  return {
    id: media.id.replace("gid://shopify/Media/", ""),
    mediaContentType: media.mediaContentType,
    preview: media.preview
      ? {
          image: media.preview.image
            ? {
                id: media.preview.image.id.replace("gid://shopify/Image/", ""),
                url: media.preview.image.url,
              }
            : null,
          status: media.preview.status,
        }
      : null,
  };
}

function normalizeVariant(variant: any) {
  return {
    id: variant.id.replace("gid://shopify/ProductVariant/", ""),
    price: variant.price,
    createdAt: variant.createdAt,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  let isAdmin = session.shop === AdminShopName;
  if (isAdmin) {
    return { isAdmin, products: [], pageInfo: null };
  } else {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const first = Number(searchParams.get("first"));
    const last = Number(searchParams.get("last"));
    const after = searchParams.get("after");
    const before = searchParams.get("before");

    let paginationArgs = "";
    if (before) {
      paginationArgs = `last: ${last || 10}, before: "${before}"`;
    } else if (after) {
      paginationArgs = `first: ${first || 10}, after: "${after}"`;
    } else {
      paginationArgs = `first: ${first || 10}`;
    }

    const response = await admin.graphql(
      `#graphql
      query getProducts {
      products(${paginationArgs}) {
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
      }`,
    );
    const data = await response.json();
    const products = data.data.products.edges.map((edge: any) =>
      normalizeProduct(edge.node),
    );
    return {
      products,
      pageInfo: data.data.products.pageInfo,
      isAdmin,
    };
  }
};

export default function Index() {
  const { isAdmin, products, pageInfo } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const title = isAdmin ? "Roastery Products" : "Sync products with Okko";

  console.log("Products:", products);

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  function renderProductImage(product: any) {
    if (product.preview?.preview.image.url) {
      return (
        <Image
          source={product.preview.preview.image.url}
          alt={product.preview.preview.image.altText || "Product Image"}
          width={20}
          height={20}
        />
      );
    }
    return <ImageIcon width={20} height={20} />;
  }

  const rowMarkup = products.map((product: any, index: number) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      selected={selectedResources.includes(product.id)}
    >
      <IndexTable.Cell>{renderProductImage(product)}</IndexTable.Cell>
      <IndexTable.Cell>{product.title}</IndexTable.Cell>
      <IndexTable.Cell>{product.price}</IndexTable.Cell>
      <IndexTable.Cell>{product.inventory}</IndexTable.Cell>
      <IndexTable.Cell>{product.status}</IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title={title} />
      <Layout>
        <Layout.Section>
          <Card>
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                Products
              </Text>
              <Button disabled={selectedResources.length === 0}>
                Sync with OKKO
              </Button>
            </InlineStack>
            <Box paddingBlockStart="400">
              {!isAdmin && products.length > 0 && (
                <Box paddingBlockStart="400">
                  <IndexTable
                    itemCount={products.length}
                    selectedItemsCount={
                      allResourcesSelected ? "All" : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      { title: "Preview" },
                      { title: "Title" },
                      { title: "Price" },
                      { title: "Inventory" },
                      { title: "Status" },
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
                  {pageInfo && (
                    <Pagination
                      hasPrevious={pageInfo.hasPreviousPage}
                      onPrevious={() => {
                        const newSearchParams = new URLSearchParams();
                        newSearchParams.set("before", pageInfo.startCursor);
                        newSearchParams.set("last", "10");
                        navigate(`/app?${newSearchParams.toString()}`);
                      }}
                      hasNext={pageInfo.hasNextPage}
                      onNext={() => {
                        const newSearchParams = new URLSearchParams();
                        newSearchParams.set("after", pageInfo.endCursor);
                        newSearchParams.set("first", "10");
                        navigate(`/app?${newSearchParams.toString()}`);
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
