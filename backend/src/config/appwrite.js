import { Client, Users } from "node-appwrite";

import { env } from "./env.js";

const client = new Client();
let users = null;

if (env.appwriteEndpoint && env.appwriteProjectId && env.appwriteApiKey) {
  client
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setKey(env.appwriteApiKey);

  users = new Users(client);
}

export { client as appwriteClient };
export { users as appwriteUsers };
