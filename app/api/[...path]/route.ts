import {env} from "cloudflare:workers";
import {handle} from "../../../server/api.js";
export const dynamic="force-dynamic";
export const GET=(r:Request)=>handle(r,env);
export const POST=GET;export const DELETE=GET;
