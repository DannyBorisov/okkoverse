import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${session?.shop}`);
};
