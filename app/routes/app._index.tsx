import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
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
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getProductsQuery } from "app/graphql/get-products";
import db from "../db.server";
import { useEffect } from "react";
import { Session } from "@prisma/client";

const AdminShopName = `okko-test.myshopify.com`;

function normalizeProduct(product: any) {
  return {
    id: product.id,
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
    id: variant.id,
    price: variant.price,
    createdAt: variant.createdAt,
  };
}
const ProductsPerPage = 25;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  let isAdmin = session.shop === AdminShopName;

  if (isAdmin) {
    const savedProducts = await db.roasteryProduct.findMany();
    const shopSessionMap: { [shop: string]: Session } = {};
    for (const product of savedProducts) {
      const session = await db.session.findFirst({ where: { shop: product.shop } });
      shopSessionMap[product.shop] = session;
      await fetch('/')
    }
    return { isAdmin, products: savedProducts, pageInfo: null };
  } else {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const first = Number(searchParams.get("first"));
    const last = Number(searchParams.get("last"));
    const after = searchParams.get("after");
    const before = searchParams.get("before");

    let variables: {
      first?: number;
      last?: number;
      after?: string;
      before?: string;
    } = {};
    if (before) {
      variables = { last: last || ProductsPerPage, before };
    } else if (after) {
      variables = { first: first || ProductsPerPage, after };
    } else {
      variables = { first: first || ProductsPerPage };
    }

    const response = await admin.graphql(getProductsQuery, { variables });
    const dbResponse = await db.roasteryProduct.findMany({
      where: { shop: session.shop },
      select: { shopifyProductId: true },
    });
    const synced = dbResponse.map((product) => product.shopifyProductId);
    const { data } = await response.json();
    const products = data.products.edges.map((edge: any) =>
      normalizeProduct(edge.node),
    );
    return {
      products,
      syncedProducts: synced,
      pageInfo: data.products.pageInfo,
      isAdmin,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { selectedProducts } = await request.json();
  const roasteryProducts = selectedProducts.map((productId: string) => ({
    id: crypto.randomUUID(),
    shopifyProductId: productId,
    shop: session.shop,
  }));

  return Promise.all(
    roasteryProducts.map((p) =>
      db.roasteryProduct.upsert({
        create: p,
        update: {},
        where: {
          shopify_product_id_shop: {
            shopifyProductId: p.shopifyProductId,
            shop: p.shop,
          },
        },
      }),
    ),
  )
    .then(() => {
      return { success: true };
    })
    .catch((error) => {
      console.error("Error syncing products:", error);
      throw new Response("Failed to sync products", { status: 500 });
    });
};

export default function Index() {
  const { isAdmin, products, pageInfo, syncedProducts } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const title = isAdmin ? "Roastery Products" : "Sync products with Okko";
  const shopify = useAppBridge();

  let { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products, { selectedResources: syncedProducts });

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

  useEffect(() => {
    console.log("Fetcher data:", fetcher.data);
    if (fetcher.data?.success) {
      shopify.toast.show("Products synced successfully!", {});
    }
  }, [fetcher.data]);

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

  function handleSync() {
    fetcher.submit(
      { selectedProducts: selectedResources },
      { method: "post", encType: "application/json" },
    );
  }

  return (
    <Page>
      <TitleBar title={title} />
      <Layout>
        <Layout.Section>
          {JSON.stringify(selectedResources)}
          <Card>
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                Products
              </Text>
              {!isAdmin && (
                <Button
                  onClick={handleSync}
                  disabled={selectedResources.length === 0}
                >
                  Sync with OKKO
                </Button>
              )}
            </InlineStack>
            <Box paddingBlockStart="400">
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
                      newSearchParams.set("last", `${ProductsPerPage}`);
                      navigate(`/app?${newSearchParams.toString()}`);
                    }}
                    hasNext={pageInfo.hasNextPage}
                    onNext={() => {
                      const newSearchParams = new URLSearchParams();
                      newSearchParams.set("after", pageInfo.endCursor);
                      newSearchParams.set("first", `${ProductsPerPage}`);
                      navigate(`/app?${newSearchParams.toString()}`);
                    }}
                  />
                )}
              </Box>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
